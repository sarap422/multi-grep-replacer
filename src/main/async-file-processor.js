const { Worker } = require('worker_threads');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * 非同期ファイルプロセッサ（Worker Threads対応）
 * 大量ファイルの並列処理でUI応答性を維持
 */
class AsyncFileProcessor {
    constructor(options = {}) {
        this.options = {
            maxConcurrency: options.maxConcurrency || Math.min(os.cpus().length, 10),
            workerTimeout: options.workerTimeout || 30000, // 30秒
            useWorkerThreads: options.useWorkerThreads === true, // デフォルトはfalse（テスト用）
            workerScriptPath: options.workerScriptPath || null,
            enableRetry: options.enableRetry !== false,
            maxRetries: options.maxRetries || 2,
            progressUpdateInterval: options.progressUpdateInterval || 100,
            ...options
        };

        // 処理状態管理
        this.processing = false;
        this.workers = new Map();
        this.activeJobs = 0;
        this.jobQueue = [];
        this.completedJobs = [];
        this.failedJobs = [];

        // 統計情報
        this.stats = {
            startTime: null,
            endTime: null,
            totalFiles: 0,
            processedFiles: 0,
            failedFiles: 0,
            totalReplacements: 0,
            totalBytes: 0,
            avgProcessingTime: 0
        };

        console.log(`🚀 非同期ファイルプロセッサ初期化: 最大並行数 ${this.options.maxConcurrency}`);
    }

    /**
     * 複数ファイルの非同期一括処理
     * @param {string[]} filePaths ファイルパス配列
     * @param {Array} replacementRules 置換ルール配列
     * @param {Function} progressCallback 進捗コールバック
     * @returns {Promise<Object>} 処理結果
     */
    async processBatch(filePaths, replacementRules, progressCallback = null) {
        if (this.processing) {
            throw new Error('既に処理が実行中です');
        }

        try {
            console.log(`🚀 一括処理開始: ${filePaths.length}ファイル`);
            
            this._initializeProcessing(filePaths, progressCallback);
            
            // ジョブキューを作成
            this.jobQueue = filePaths.map((filePath, index) => ({
                id: `job_${index}`,
                filePath,
                replacementRules,
                retryCount: 0,
                priority: 0
            }));

            // Worker Threads使用可否判定
            const useWorkers = this.options.useWorkerThreads && this.jobQueue.length > 10;
            
            if (useWorkers) {
                return await this._processWithWorkers();
            } else {
                return await this._processSequentially();
            }

        } catch (error) {
            console.error('❌ 一括処理エラー:', error);
            throw new Error(`一括処理に失敗しました: ${error.message}`);
        } finally {
            this._cleanupProcessing();
        }
    }

    /**
     * 単一ファイルの非同期処理
     * @param {string} filePath ファイルパス
     * @param {Array} replacementRules 置換ルール配列
     * @returns {Promise<Object>} 処理結果
     */
    async processFile(filePath, replacementRules) {
        const startTime = performance.now();
        
        try {
            console.log(`📄 ファイル処理開始: ${filePath}`);
            
            // ファイル存在・権限チェック
            await this._validateFile(filePath);
            
            // ファイル読み込み
            const content = await fs.readFile(filePath, 'utf8');
            const originalSize = Buffer.byteLength(content, 'utf8');
            
            // 置換処理実行
            const { processedContent, replacements } = await this._applyReplacements(content, replacementRules);
            
            // ファイル書き込み（変更があった場合のみ）
            if (replacements > 0) {
                await fs.writeFile(filePath, processedContent, 'utf8');
                console.log(`✅ ファイル更新完了: ${filePath} (${replacements}箇所置換)`);
            } else {
                console.log(`📝 変更なし: ${filePath}`);
            }
            
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            
            return {
                filePath,
                success: true,
                replacements,
                originalSize,
                processedSize: Buffer.byteLength(processedContent, 'utf8'),
                processingTime,
                modified: replacements > 0
            };

        } catch (error) {
            console.error(`❌ ファイル処理エラー: ${filePath}`, error);
            const endTime = performance.now();
            
            return {
                filePath,
                success: false,
                error: error.message,
                processingTime: endTime - startTime,
                modified: false
            };
        }
    }

    /**
     * Worker Threadsを使用した並列処理
     * @returns {Promise<Object>} 処理結果
     * @private
     */
    async _processWithWorkers() {
        console.log(`👥 Worker Threads並列処理開始: ${this.options.maxConcurrency}並列`);
        
        return new Promise((resolve, reject) => {
            const processNextBatch = () => {
                // 新しいWorkerを起動
                while (this.activeJobs < this.options.maxConcurrency && this.jobQueue.length > 0) {
                    const job = this.jobQueue.shift();
                    this._startWorker(job, processNextBatch);
                }
                
                // 全ジョブ完了チェック
                if (this.activeJobs === 0 && this.jobQueue.length === 0) {
                    resolve(this._generateFinalResult());
                }
            };
            
            // 初回バッチ開始
            processNextBatch();
        });
    }

    /**
     * 順次処理（Worker Threads未使用）
     * @returns {Promise<Object>} 処理結果
     * @private
     */
    async _processSequentially() {
        console.log(`📋 順次処理開始: ${this.jobQueue.length}ファイル`);
        
        for (const job of this.jobQueue) {
            try {
                const result = await this.processFile(job.filePath, job.replacementRules);
                
                if (result.success) {
                    this.completedJobs.push(result);
                    this.stats.processedFiles++;
                    this.stats.totalReplacements += result.replacements || 0;
                    this.stats.totalBytes += result.originalSize || 0;
                } else {
                    this.failedJobs.push(result);
                    this.stats.failedFiles++;
                }
                
                // 進捗通知
                this._notifyProgress();
                
            } catch (error) {
                console.error(`❌ ジョブ処理エラー: ${job.filePath}`, error);
                this.failedJobs.push({
                    filePath: job.filePath,
                    success: false,
                    error: error.message
                });
                this.stats.failedFiles++;
            }
        }
        
        return this._generateFinalResult();
    }

    /**
     * Workerを起動してジョブを処理
     * @param {Object} job ジョブ情報
     * @param {Function} onComplete 完了コールバック
     * @private
     */
    _startWorker(job, onComplete) {
        this.activeJobs++;
        
        // Worker Thread作成
        const workerData = {
            filePath: job.filePath,
            replacementRules: job.replacementRules
        };
        
        const worker = new Worker(this._getWorkerScript(), {
            workerData
        });
        
        this.workers.set(job.id, worker);
        
        // タイムアウト設定
        const timeout = setTimeout(() => {
            worker.terminate();
            this._handleWorkerError(job, new Error('Worker timeout'), onComplete);
        }, this.options.workerTimeout);
        
        // Worker完了ハンドラ
        worker.on('message', (result) => {
            clearTimeout(timeout);
            this._handleWorkerSuccess(job, result, onComplete);
        });
        
        // Workerエラーハンドラ
        worker.on('error', (error) => {
            clearTimeout(timeout);
            this._handleWorkerError(job, error, onComplete);
        });
        
        // Worker終了ハンドラ
        worker.on('exit', (code) => {
            clearTimeout(timeout);
            this.workers.delete(job.id);
            
            if (code !== 0) {
                this._handleWorkerError(job, new Error(`Worker exited with code ${code}`), onComplete);
            }
        });
    }

    /**
     * Worker成功時の処理
     * @param {Object} job ジョブ情報
     * @param {Object} result 処理結果
     * @param {Function} onComplete 完了コールバック
     * @private
     */
    _handleWorkerSuccess(job, result, onComplete) {
        this.activeJobs--;
        
        if (result.success) {
            this.completedJobs.push(result);
            this.stats.processedFiles++;
            this.stats.totalReplacements += result.replacements || 0;
            this.stats.totalBytes += result.originalSize || 0;
        } else {
            this.failedJobs.push(result);
            this.stats.failedFiles++;
        }
        
        this._notifyProgress();
        onComplete();
    }

    /**
     * Workerエラー時の処理
     * @param {Object} job ジョブ情報
     * @param {Error} error エラー
     * @param {Function} onComplete 完了コールバック
     * @private
     */
    _handleWorkerError(job, error, onComplete) {
        this.activeJobs--;
        
        // リトライ判定
        if (this.options.enableRetry && job.retryCount < this.options.maxRetries) {
            job.retryCount++;
            this.jobQueue.push(job); // 再試行のためキューに戻す
            console.warn(`🔄 Worker処理リトライ: ${job.filePath} (${job.retryCount}/${this.options.maxRetries})`);
        } else {
            // リトライ上限または無効
            this.failedJobs.push({
                filePath: job.filePath,
                success: false,
                error: error.message,
                retryCount: job.retryCount
            });
            this.stats.failedFiles++;
        }
        
        this._notifyProgress();
        onComplete();
    }

    /**
     * Worker Scriptのパスまたは内容を取得
     * @returns {string} Workerスクリプト
     * @private
     */
    _getWorkerScript() {
        if (this.options.workerScriptPath) {
            return this.options.workerScriptPath;
        }
        
        // 一時的に無効化（構文エラー回避）
        throw new Error('Worker Thread機能は現在無効です。useWorkerThreads: falseに設定してください。');
    }

    /**
     * 置換処理の実行
     * @param {string} content ファイル内容
     * @param {Array} replacementRules 置換ルール配列
     * @returns {Promise<Object>} 処理結果
     * @private
     */
    async _applyReplacements(content, replacementRules) {
        let processedContent = content;
        let totalReplacements = 0;

        for (const rule of replacementRules) {
            if (!rule.enabled) continue;

            const { from, to, caseSensitive = true, wholeWord = false } = rule;
            
            try {
                let searchPattern;
                
                if (wholeWord) {
                    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    searchPattern = new RegExp(`\\b${escapedFrom}\\b`, caseSensitive ? 'g' : 'gi');
                } else {
                    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    searchPattern = new RegExp(escapedFrom, caseSensitive ? 'g' : 'gi');
                }

                const beforeReplace = processedContent;
                processedContent = processedContent.replace(searchPattern, to);
                
                const matches = beforeReplace.match(searchPattern);
                const replacements = matches ? matches.length : 0;
                totalReplacements += replacements;

            } catch (error) {
                console.warn(`⚠️ 置換ルール処理エラー: ${from} → ${to}`, error.message);
            }
        }

        return {
            processedContent,
            replacements: totalReplacements
        };
    }

    /**
     * ファイルの検証
     * @param {string} filePath ファイルパス
     * @returns {Promise<void>}
     * @private
     */
    async _validateFile(filePath) {
        try {
            await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
            
            const stats = await fs.stat(filePath);
            if (!stats.isFile()) {
                throw new Error('指定されたパスはファイルではありません');
            }
            
        } catch (error) {
            throw new Error(`ファイルアクセスエラー: ${error.message}`);
        }
    }

    /**
     * 処理初期化
     * @param {Array} filePaths ファイルパス配列
     * @param {Function} progressCallback 進捗コールバック
     * @private
     */
    _initializeProcessing(filePaths, progressCallback) {
        this.processing = true;
        this.progressCallback = progressCallback;
        
        this.stats = {
            startTime: performance.now(),
            endTime: null,
            totalFiles: filePaths.length,
            processedFiles: 0,
            failedFiles: 0,
            totalReplacements: 0,
            totalBytes: 0,
            avgProcessingTime: 0
        };
        
        this.completedJobs = [];
        this.failedJobs = [];
    }

    /**
     * 処理クリーンアップ
     * @private
     */
    _cleanupProcessing() {
        this.processing = false;
        this.stats.endTime = performance.now();
        
        // 残っているWorkerを終了
        for (const [jobId, worker] of this.workers) {
            worker.terminate();
            console.warn(`⚠️ Worker強制終了: ${jobId}`);
        }
        this.workers.clear();
        
        this.activeJobs = 0;
        this.jobQueue = [];
    }

    /**
     * 進捗通知
     * @private
     */
    _notifyProgress() {
        if (this.progressCallback && this.stats.processedFiles % this.options.progressUpdateInterval === 0) {
            const progress = {
                completed: this.stats.processedFiles,
                failed: this.stats.failedFiles,
                total: this.stats.totalFiles,
                percentage: Math.round(((this.stats.processedFiles + this.stats.failedFiles) / this.stats.totalFiles) * 100),
                replacements: this.stats.totalReplacements
            };
            
            this.progressCallback(progress);
        }
    }

    /**
     * 最終結果を生成
     * @returns {Object} 最終処理結果
     * @private
     */
    _generateFinalResult() {
        const totalTime = (this.stats.endTime - this.stats.startTime) / 1000; // 秒
        
        return {
            summary: {
                totalFiles: this.stats.totalFiles,
                processedFiles: this.stats.processedFiles,
                failedFiles: this.stats.failedFiles,
                successRate: Math.round((this.stats.processedFiles / this.stats.totalFiles) * 100),
                totalReplacements: this.stats.totalReplacements,
                totalBytes: this.stats.totalBytes,
                processingTime: Math.round(totalTime),
                avgTimePerFile: this.stats.processedFiles > 0 ? 
                    Math.round(totalTime / this.stats.processedFiles * 1000) : 0 // ms
            },
            results: {
                completed: this.completedJobs,
                failed: this.failedJobs
            },
            performance: {
                concurrency: this.options.maxConcurrency,
                workerThreadsUsed: this.options.useWorkerThreads,
                filesPerSecond: totalTime > 0 ? Math.round(this.stats.processedFiles / totalTime) : 0,
                throughputKBPerSec: totalTime > 0 ? Math.round(this.stats.totalBytes / totalTime / 1024) : 0
            }
        };
    }

    /**
     * 処理をキャンセル
     */
    cancel() {
        if (!this.processing) {
            console.warn('⚠️ 処理は実行されていません');
            return;
        }
        
        console.log('🛑 処理キャンセル要求');
        
        // ジョブキューをクリア
        this.jobQueue = [];
        
        // Workerを終了
        for (const [jobId, worker] of this.workers) {
            worker.terminate();
            console.log(`🛑 Worker終了: ${jobId}`);
        }
        
        this._cleanupProcessing();
        console.log('✅ 処理キャンセル完了');
    }

    /**
     * 現在の処理状況を取得
     * @returns {Object} 処理状況
     */
    getStatus() {
        return {
            processing: this.processing,
            activeWorkers: this.workers.size,
            queuedJobs: this.jobQueue.length,
            completedJobs: this.completedJobs.length,
            failedJobs: this.failedJobs.length,
            stats: this.stats
        };
    }
}

module.exports = AsyncFileProcessor;