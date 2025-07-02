const EventEmitter = require('events');
const path = require('path');

// Task 2.1で実装した高度なファイル操作機能
const FileOperations = require('./file-operations');
const ReplacementProcessor = require('./replacement-processor');

/**
 * 置換処理エンジン - FileOperationsと統合した高性能置換システム
 * バッチ処理、進捗管理、エラーハンドリングを統合
 */
class ReplacementEngine extends EventEmitter {
    constructor(rules, options = {}) {
        super();
        
        this.rules = this._validateRules(rules);
        this.options = {
            // 基本設定
            caseSensitive: options.caseSensitive !== false,
            wholeWord: options.wholeWord || false,
            dryRun: options.dryRun || false,
            
            // パフォーマンス設定
            maxConcurrency: options.maxConcurrency || 10,
            useWorkerThreads: options.useWorkerThreads !== false,
            useStreamProcessing: options.useStreamProcessing !== false,
            streamSizeThreshold: options.streamSizeThreshold || 10 * 1024 * 1024, // 10MB
            
            // 進捗通知
            progressInterval: options.progressInterval || 100,
            detailedProgress: options.detailedProgress !== false,
            
            // エラーハンドリング
            stopOnError: options.stopOnError || false,
            maxErrors: options.maxErrors || 50,
            
            ...options
        };

        // FileOperations統合
        this.fileOps = new FileOperations({
            useWorkerThreads: this.options.useWorkerThreads,
            useStreamProcessing: this.options.useStreamProcessing,
            streamSizeThreshold: this.options.streamSizeThreshold,
            enablePerformanceMonitoring: true
        });

        // 置換プロセッサ
        this.processor = new ReplacementProcessor({
            caseSensitive: this.options.caseSensitive,
            wholeWord: this.options.wholeWord
        });

        // 処理状態
        this.state = {
            processing: false,
            paused: false,
            cancelled: false,
            startTime: null,
            endTime: null,
            currentFile: null,
            progress: {
                total: 0,
                processed: 0,
                modified: 0,
                errors: 0,
                skipped: 0
            }
        };

        // 結果収集
        this.results = {
            files: [],
            totalReplacements: 0,
            errors: [],
            warnings: []
        };

        console.log('🚀 置換エンジン初期化完了');
        console.log(`⚙️ ルール数: ${this.rules.length}, 並行処理: ${this.options.maxConcurrency}`);
    }

    /**
     * 単一ファイルの置換処理
     * @param {string} filePath ファイルパス
     * @returns {Promise<Object>} 処理結果
     */
    async processFile(filePath) {
        const startTime = Date.now();
        
        try {
            console.log(`📄 ファイル処理開始: ${filePath}`);
            
            // ファイル読み込み（FileOperations活用）
            const content = await this.fileOps.readFileContent(filePath);
            const originalSize = Buffer.byteLength(content, 'utf8');
            
            // 置換処理実行
            const result = this.processor.processContent(content, this.rules);
            
            if (!result.success) {
                throw new Error(result.error);
            }

            // ドライランモード
            if (this.options.dryRun) {
                console.log(`🔍 ドライラン: ${filePath} - ${result.stats.totalReplacements}箇所の変更予定`);
                return {
                    filePath,
                    success: true,
                    modified: result.modified && result.stats.totalReplacements > 0,
                    dryRun: true,
                    stats: result.stats,
                    changes: result.changes,
                    processingTime: Date.now() - startTime
                };
            }

            // 実際のファイル更新
            if (result.modified) {
                await this.fileOps.writeFileContent(filePath, result.processedContent);
                console.log(`✅ ファイル更新完了: ${filePath} (${result.stats.totalReplacements}箇所)`);
            }

            const processingTime = Date.now() - startTime;

            return {
                filePath,
                success: true,
                modified: result.modified,
                originalSize,
                processedSize: Buffer.byteLength(result.processedContent, 'utf8'),
                stats: result.stats,
                changes: result.changes,
                processingTime,
                ruleResults: result.ruleResults
            };

        } catch (error) {
            console.error(`❌ ファイル処理エラー: ${filePath}`, error);
            
            return {
                filePath,
                success: false,
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * 複数ファイルの一括処理
     * @param {string[]} filePaths ファイルパス配列
     * @param {Function} progressCallback 進捗コールバック
     * @returns {Promise<Object>} 処理結果
     */
    async processBatch(filePaths, progressCallback = null) {
        if (this.state.processing) {
            throw new Error('既に処理が実行中です');
        }

        try {
            console.log(`🚀 バッチ処理開始: ${filePaths.length}ファイル`);
            
            // 初期化
            this._initializeProcessing(filePaths);
            
            // 進捗コールバック設定
            if (progressCallback) {
                this.on('progress', progressCallback);
            }

            // パフォーマンス監視開始
            this.fileOps.performanceMonitor.startMonitoring(filePaths.length);

            // 簡略化された一括処理（キャンセル対応）
            const processResults = await this._processFilesBatch(
                filePaths,
                (current, total, currentFile, result) => {
                    this._updateProgress(current, total, currentFile, result);
                }
            );

            // 結果集計
            this._finalizeResults(processResults);

            // パフォーマンス監視終了
            const performanceStats = this.fileOps.performanceMonitor.stopMonitoring();

            const finalResult = {
                summary: {
                    totalFiles: this.state.progress.total,
                    processedFiles: this.state.progress.processed,
                    modifiedFiles: this.state.progress.modified,
                    errorFiles: this.state.progress.errors,
                    skippedFiles: this.state.progress.skipped,
                    totalReplacements: this.results.totalReplacements,
                    processingTime: Date.now() - this.state.startTime
                },
                results: this.results,
                performance: performanceStats,
                cancelled: this.state.cancelled
            };

            console.log(`✅ バッチ処理完了: 成功 ${this.state.progress.processed}件, エラー ${this.state.progress.errors}件`);
            
            return finalResult;

        } catch (error) {
            console.error('❌ バッチ処理エラー:', error);
            throw new Error(`バッチ処理に失敗しました: ${error.message}`);
            
        } finally {
            this._cleanupProcessing();
            if (progressCallback) {
                this.removeListener('progress', progressCallback);
            }
        }
    }

    /**
     * 置換プレビューの生成
     * @param {string[]} filePaths ファイルパス配列
     * @param {Object} options プレビューオプション
     * @returns {Promise<Object>} プレビュー情報
     */
    async generatePreview(filePaths, options = {}) {
        const maxFiles = options.maxFiles || 10;
        const maxChangesPerFile = options.maxChangesPerFile || 5;
        
        console.log(`👁️ 置換プレビュー生成: 最大${maxFiles}ファイル`);

        const previewFiles = filePaths.slice(0, maxFiles);
        const previews = [];
        let totalChanges = 0;
        let affectedFiles = 0;

        for (const filePath of previewFiles) {
            try {
                const content = await this.fileOps.readFileContent(filePath);
                const preview = this.processor.generatePreview(content, this.rules, {
                    maxPreviewLength: 200,
                    contextLines: 2
                });

                if (preview.wouldModify) {
                    affectedFiles++;
                    totalChanges += preview.totalReplacements;
                    
                    previews.push({
                        filePath,
                        fileName: path.basename(filePath),
                        wouldModify: true,
                        totalReplacements: preview.totalReplacements,
                        changes: preview.changes.slice(0, maxChangesPerFile)
                    });
                }

            } catch (error) {
                console.warn(`⚠️ プレビュー生成エラー: ${filePath}`, error.message);
                previews.push({
                    filePath,
                    fileName: path.basename(filePath),
                    error: error.message
                });
            }
        }

        return {
            totalFiles: filePaths.length,
            previewedFiles: previewFiles.length,
            affectedFiles,
            totalChanges,
            hasMore: filePaths.length > maxFiles,
            previews,
            rules: this.rules.filter(r => r.enabled).map(r => ({
                from: r.from,
                to: r.to,
                caseSensitive: r.caseSensitive,
                wholeWord: r.wholeWord
            }))
        };
    }

    /**
     * 処理の一時停止
     */
    pause() {
        if (!this.state.processing) {
            console.warn('⚠️ 処理は実行されていません');
            return;
        }

        this.state.paused = true;
        console.log('⏸️ 処理を一時停止しました');
        this.emit('paused');
    }

    /**
     * 処理の再開
     */
    resume() {
        if (!this.state.paused) {
            console.warn('⚠️ 処理は一時停止されていません');
            return;
        }

        this.state.paused = false;
        console.log('▶️ 処理を再開しました');
        this.emit('resumed');
    }

    /**
     * 処理のキャンセル
     */
    cancel() {
        if (!this.state.processing) {
            console.warn('⚠️ 処理は実行されていません');
            return;
        }

        this.state.cancelled = true;
        this.fileOps.asyncProcessor.cancel();
        console.log('🛑 処理をキャンセルしました');
        this.emit('cancelled');
    }

    /**
     * 現在の処理状態を取得
     * @returns {Object} 処理状態
     */
    getStatus() {
        return {
            processing: this.state.processing,
            paused: this.state.paused,
            cancelled: this.state.cancelled,
            currentFile: this.state.currentFile,
            progress: { ...this.state.progress },
            elapsedTime: this.state.startTime ? 
                (this.state.endTime || Date.now()) - this.state.startTime : 0,
            errors: this.results.errors.length,
            warnings: this.results.warnings.length
        };
    }

    /**
     * ルールの検証
     * @param {Array} rules 置換ルール配列
     * @returns {Array} 検証済みルール
     * @private
     */
    _validateRules(rules) {
        if (!Array.isArray(rules) || rules.length === 0) {
            throw new Error('有効な置換ルールが指定されていません');
        }

        return rules.map((rule, index) => {
            if (!rule.from || typeof rule.from !== 'string') {
                throw new Error(`ルール ${index + 1}: 検索文字列（from）が無効です`);
            }

            if (typeof rule.to !== 'string') {
                throw new Error(`ルール ${index + 1}: 置換文字列（to）が無効です`);
            }

            return {
                id: rule.id || `rule_${index}`,
                from: rule.from,
                to: rule.to,
                enabled: rule.enabled !== false,
                caseSensitive: rule.caseSensitive !== undefined ? 
                    rule.caseSensitive : this.options.caseSensitive,
                wholeWord: rule.wholeWord !== undefined ? 
                    rule.wholeWord : this.options.wholeWord,
                description: rule.description || ''
            };
        });
    }

    /**
     * 処理の初期化
     * @param {Array} filePaths ファイルパス配列
     * @private
     */
    _initializeProcessing(filePaths) {
        this.state = {
            processing: true,
            paused: false,
            cancelled: false,
            startTime: Date.now(),
            endTime: null,
            currentFile: null,
            progress: {
                total: filePaths.length,
                processed: 0,
                modified: 0,
                errors: 0,
                skipped: 0
            }
        };

        this.results = {
            files: [],
            totalReplacements: 0,
            errors: [],
            warnings: []
        };

        this.processor.resetStats();
    }

    /**
     * 進捗の更新
     * @param {number} current 現在の処理数
     * @param {number} total 総数
     * @param {string} currentFile 現在のファイル
     * @param {Object} result 処理結果
     * @private
     */
    _updateProgress(current, total, currentFile, result) {
        this.state.currentFile = currentFile;
        this.state.progress.processed = current;

        if (result) {
            if (result.success) {
                if (result.modified) {
                    this.state.progress.modified++;
                    this.results.totalReplacements += result.stats?.totalReplacements || 0;
                }
            } else {
                this.state.progress.errors++;
                this.results.errors.push({
                    file: currentFile,
                    error: result.error
                });
            }

            this.results.files.push(result);
        }

        // 進捗イベント発行
        const progress = {
            current,
            total,
            percentage: Math.round((current / total) * 100),
            currentFile,
            processed: this.state.progress.processed,
            modified: this.state.progress.modified,
            errors: this.state.progress.errors,
            replacements: this.results.totalReplacements
        };

        this.emit('progress', progress);
    }

    /**
     * 結果の最終処理
     * @param {Object} processResults 処理結果
     * @private
     */
    _finalizeResults(processResults) {
        this.state.endTime = Date.now();
        this.state.processing = false;

        // FileOperationsからの結果を統合
        if (processResults.results) {
            this.results.files = [
                ...this.results.files,
                ...processResults.results.success,
                ...processResults.results.errors
            ];
        }

        // 最終統計
        console.log('📊 最終統計:');
        console.log(`  処理ファイル: ${this.state.progress.processed}/${this.state.progress.total}`);
        console.log(`  変更ファイル: ${this.state.progress.modified}`);
        console.log(`  総置換数: ${this.results.totalReplacements}`);
        console.log(`  エラー: ${this.state.progress.errors}`);
    }

    /**
     * 簡略化されたファイルバッチ処理（キャンセル対応）
     * @param {string[]} filePaths ファイルパス配列
     * @param {Function} progressCallback 進捗コールバック
     * @returns {Promise<Object>} 処理結果
     * @private
     */
    async _processFilesBatch(filePaths, progressCallback) {
        const results = [];
        
        for (let i = 0; i < filePaths.length; i++) {
            // キャンセルチェック
            if (this.state.cancelled) {
                console.log('🛑 処理がキャンセルされました');
                break;
            }
            
            const filePath = filePaths[i];
            
            try {
                const result = await this.processFile(filePath);
                results.push(result);
                
                if (progressCallback) {
                    progressCallback(i + 1, filePaths.length, filePath, result);
                }
                
            } catch (error) {
                console.error(`❌ ファイル処理エラー: ${filePath}`, error);
                results.push({
                    filePath,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return {
            results: {
                success: results.filter(r => r.success),
                errors: results.filter(r => !r.success)
            }
        };
    }

    /**
     * 処理のクリーンアップ
     * @private
     */
    _cleanupProcessing() {
        this.state.processing = false;
        this.state.currentFile = null;
        this.fileOps.cleanup();
        this.removeAllListeners('progress');
    }
}

module.exports = ReplacementEngine;