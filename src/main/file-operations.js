const fs = require('fs').promises;
const path = require('path');
const { dialog } = require('electron');

// 新しく作成した高度な機能クラス
const FileSystemUtils = require('./file-system-utils');
const FileFilters = require('./file-filters');
const PerformanceMonitor = require('./performance-monitor');
const StreamProcessor = require('./stream-processor');
const AsyncFileProcessor = require('./async-file-processor');

/**
 * セキュアなファイル操作を提供するクラス（拡張版）
 * ファイルアクセス権限チェック、パスサニタイゼーション、エラーハンドリングを重視
 * 高度な並列処理、Stream処理、パフォーマンス監視機能を統合
 */
class FileOperations {
    constructor(options = {}) {
        // セキュリティ設定
        this.MAX_FILE_SIZE = options.maxFileSize || 104857600; // 100MB
        this.MAX_SEARCH_DEPTH = options.maxSearchDepth || 20; // 最大検索深度
        
        // デフォルト除外パターン
        this.DEFAULT_EXCLUDE_PATTERNS = [
            'node_modules/**',
            '.git/**',
            'dist/**',
            'build/**',
            '.DS_Store',
            '*.log',
            '*.tmp',
            '*.temp'
        ];
        
        // サポートするファイル拡張子パターン
        this.SUPPORTED_EXTENSIONS = [
            '.html', '.htm', '.css', '.scss', '.sass', '.less',
            '.js', '.jsx', '.ts', '.tsx', '.json',
            '.php', '.py', '.rb', '.java', '.c', '.cpp', '.h',
            '.md', '.txt', '.xml', '.yaml', '.yml'
        ];

        // 高度な機能クラスのインスタンス初期化
        this.fileSystemUtils = new FileSystemUtils();
        this.fileFilters = new FileFilters();
        this.performanceMonitor = new PerformanceMonitor(options.performanceOptions);
        this.streamProcessor = new StreamProcessor(options.streamOptions);
        this.asyncProcessor = new AsyncFileProcessor(options.asyncOptions);

        // 処理モード設定
        this.processingMode = {
            useWorkerThreads: options.useWorkerThreads !== false,
            useStreamProcessing: options.useStreamProcessing !== false,
            enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
            streamSizeThreshold: options.streamSizeThreshold || 10 * 1024 * 1024, // 10MB
            asyncBatchThreshold: options.asyncBatchThreshold || 10 // 10ファイル以上で非同期処理
        };

        console.log('🚀 FileOperations拡張版初期化完了');
        console.log(`⚙️ 処理モード: Worker=${this.processingMode.useWorkerThreads}, Stream=${this.processingMode.useStreamProcessing}, Monitor=${this.processingMode.enablePerformanceMonitoring}`);
    }

    /**
     * フォルダ選択ダイアログを表示
     * @param {BrowserWindow} parentWindow 親ウィンドウ
     * @returns {Promise<string|null>} 選択されたフォルダパス
     */
    async selectFolder(parentWindow = null) {
        try {
            console.log('🗂️ フォルダ選択ダイアログを開きます...');
            
            const result = await dialog.showOpenDialog(parentWindow, {
                title: 'Select Target Folder',
                message: '置換対象のフォルダを選択してください',
                properties: ['openDirectory'],
                buttonLabel: 'Select Folder'
            });

            if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                console.log('📝 フォルダ選択がキャンセルされました');
                return null;
            }

            const selectedPath = result.filePaths[0];
            console.log(`✅ フォルダが選択されました: ${selectedPath}`);

            // パスの検証
            const normalizedPath = await this.validateAndNormalizePath(selectedPath);
            return normalizedPath;

        } catch (error) {
            console.error('❌ フォルダ選択エラー:', error);
            throw new Error(`フォルダ選択に失敗しました: ${error.message}`);
        }
    }

    /**
     * ディレクトリ内のファイルを再帰的に検索
     * @param {string} directory 検索対象ディレクトリ
     * @param {string[]} extensions ファイル拡張子（空配列で全ファイル）
     * @param {string[]} excludePatterns 除外パターン
     * @returns {Promise<string[]>} ファイルパスの配列
     */
    async findFiles(directory, extensions = [], excludePatterns = []) {
        try {
            console.log(`🔍 ファイル検索開始: ${directory}`);
            console.log(`📋 拡張子フィルタ: ${extensions.length > 0 ? extensions.join(', ') : '全ファイル'}`);

            // パスの検証
            const normalizedDirectory = await this.validateAndNormalizePath(directory);
            
            // 除外パターンの設定
            const allExcludePatterns = [...this.DEFAULT_EXCLUDE_PATTERNS, ...excludePatterns];
            
            // ファイル検索の実行
            const files = await this._searchFilesRecursive(
                normalizedDirectory, 
                extensions, 
                allExcludePatterns, 
                0
            );

            console.log(`✅ ファイル検索完了: ${files.length}件見つかりました`);
            return files;

        } catch (error) {
            console.error('❌ ファイル検索エラー:', error);
            throw new Error(`ファイル検索に失敗しました: ${error.message}`);
        }
    }

    /**
     * ファイル内容を安全に読み込み
     * @param {string} filePath ファイルパス
     * @returns {Promise<string>} ファイル内容
     */
    async readFileContent(filePath) {
        try {
            console.log(`📖 ファイル読み込み: ${filePath}`);

            // パスの検証
            const normalizedPath = await this.validateAndNormalizePath(filePath);
            
            // ファイル権限とサイズチェック
            await this.checkFilePermissions(normalizedPath, 'read');
            
            // ファイルサイズチェック
            const stats = await fs.stat(normalizedPath);
            if (stats.size > this.MAX_FILE_SIZE) {
                throw new Error(`ファイルサイズが制限を超えています (${Math.round(stats.size / 1024 / 1024)}MB > ${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB)`);
            }

            // ファイル内容読み込み
            const content = await fs.readFile(normalizedPath, 'utf8');
            console.log(`✅ ファイル読み込み完了: ${normalizedPath}`);
            
            return content;

        } catch (error) {
            console.error(`❌ ファイル読み込みエラー: ${filePath}`, error);
            throw new Error(`ファイル読み込みに失敗しました: ${error.message}`);
        }
    }

    /**
     * ファイル内容を安全に書き込み
     * @param {string} filePath ファイルパス
     * @param {string} content ファイル内容
     * @returns {Promise<void>}
     */
    async writeFileContent(filePath, content) {
        try {
            console.log(`✏️ ファイル書き込み: ${filePath}`);

            // パスの検証
            const normalizedPath = await this.validateAndNormalizePath(filePath);
            
            // ファイル権限チェック
            await this.checkFilePermissions(normalizedPath, 'write');

            // 内容のサイズチェック
            const contentSize = Buffer.byteLength(content, 'utf8');
            if (contentSize > this.MAX_FILE_SIZE) {
                throw new Error(`書き込み内容が制限を超えています (${Math.round(contentSize / 1024 / 1024)}MB > ${Math.round(this.MAX_FILE_SIZE / 1024 / 1024)}MB)`);
            }

            // ファイル書き込み
            await fs.writeFile(normalizedPath, content, 'utf8');
            console.log(`✅ ファイル書き込み完了: ${normalizedPath}`);

        } catch (error) {
            console.error(`❌ ファイル書き込みエラー: ${filePath}`, error);
            throw new Error(`ファイル書き込みに失敗しました: ${error.message}`);
        }
    }

    /**
     * ファイル権限をチェック
     * @param {string} filePath ファイルパス
     * @param {string} operation 操作種別（'read'|'write'）
     * @returns {Promise<boolean>} 権限があるかどうか
     */
    async checkFilePermissions(filePath, operation = 'read') {
        try {
            const normalizedPath = await this.validateAndNormalizePath(filePath);
            
            // ファイル存在チェック
            const exists = await fs.access(normalizedPath, fs.constants.F_OK)
                .then(() => true)
                .catch(() => false);

            if (!exists && operation === 'read') {
                throw new Error(`ファイルが存在しません: ${normalizedPath}`);
            }

            // 権限チェック
            const mode = operation === 'write' ? fs.constants.W_OK : fs.constants.R_OK;
            await fs.access(normalizedPath, mode);

            console.log(`✅ ${operation}権限OK: ${normalizedPath}`);
            return true;

        } catch (error) {
            console.error(`❌ 権限チェックエラー: ${filePath} (${operation})`, error);
            
            if (error.code === 'ENOENT') {
                throw new Error(`ファイルが見つかりません: ${filePath}`);
            } else if (error.code === 'EACCES') {
                throw new Error(`ファイルの${operation === 'write' ? '書き込み' : '読み取り'}権限がありません: ${filePath}`);
            } else {
                throw new Error(`ファイルアクセスエラー: ${error.message}`);
            }
        }
    }

    /**
     * パスの検証と正規化
     * @param {string} inputPath 入力パス
     * @returns {Promise<string>} 正規化されたパス
     * @private
     */
    async validateAndNormalizePath(inputPath) {
        if (!inputPath || typeof inputPath !== 'string') {
            throw new Error('無効なパスが指定されました');
        }

        // パスの正規化
        const normalizedPath = path.resolve(inputPath);

        // セキュリティチェック：../ を含むパスの排除
        if (normalizedPath.includes('..')) {
            throw new Error('セキュリティ上許可されないパスです');
        }

        // システムディレクトリへのアクセス制限（基本的なチェック）
        const restrictedPaths = ['/etc', '/usr', '/bin', '/sbin', 'C:\\Windows', 'C:\\System'];
        const isRestricted = restrictedPaths.some(restricted => 
            normalizedPath.toLowerCase().startsWith(restricted.toLowerCase())
        );

        if (isRestricted) {
            throw new Error('システムディレクトリへのアクセスは許可されていません');
        }

        return normalizedPath;
    }

    /**
     * ファイルを再帰的に検索（内部実装）
     * @param {string} directory ディレクトリパス
     * @param {string[]} extensions 拡張子フィルタ
     * @param {string[]} excludePatterns 除外パターン
     * @param {number} depth 現在の深度
     * @returns {Promise<string[]>} ファイルパスの配列
     * @private
     */
    async _searchFilesRecursive(directory, extensions, excludePatterns, depth) {
        // 深度制限チェック
        if (depth > this.MAX_SEARCH_DEPTH) {
            console.warn(`⚠️ 最大検索深度に到達: ${directory}`);
            return [];
        }

        let files = [];

        try {
            const entries = await fs.readdir(directory, { withFileTypes: true });

            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);
                const relativePath = path.relative(process.cwd(), fullPath);

                // 除外パターンチェック
                if (this._isExcluded(relativePath, excludePatterns)) {
                    continue;
                }

                if (entry.isDirectory()) {
                    // ディレクトリの場合、再帰検索
                    const subFiles = await this._searchFilesRecursive(
                        fullPath, 
                        extensions, 
                        excludePatterns, 
                        depth + 1
                    );
                    files = files.concat(subFiles);
                    
                } else if (entry.isFile()) {
                    // ファイルの場合、拡張子チェック
                    if (this._isValidExtension(fullPath, extensions)) {
                        files.push(fullPath);
                    }
                }
            }

        } catch (error) {
            console.warn(`⚠️ ディレクトリアクセスエラー: ${directory}`, error.message);
            // ディレクトリアクセスエラーは警告として扱い、処理を続行
        }

        return files;
    }

    /**
     * 除外パターンチェック
     * @param {string} filePath ファイルパス
     * @param {string[]} excludePatterns 除外パターン
     * @returns {boolean} 除外対象かどうか
     * @private
     */
    _isExcluded(filePath, excludePatterns) {
        const normalizedPath = filePath.replace(/\\/g, '/');
        
        return excludePatterns.some(pattern => {
            // 単純なグロブパターンマッチング（**、*をサポート）
            const regexPattern = pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '[^/]');
            
            const regex = new RegExp(`^${regexPattern}$`);
            return regex.test(normalizedPath);
        });
    }

    /**
     * ファイル拡張子の検証
     * @param {string} filePath ファイルパス
     * @param {string[]} extensions 許可する拡張子（空配列で全ファイル）
     * @returns {boolean} 有効な拡張子かどうか
     * @private
     */
    _isValidExtension(filePath, extensions) {
        if (!extensions || extensions.length === 0) {
            // 拡張子フィルタなしの場合、サポートする拡張子のみ許可
            const fileExt = path.extname(filePath).toLowerCase();
            return this.SUPPORTED_EXTENSIONS.includes(fileExt) || fileExt === '';
        }

        const fileExt = path.extname(filePath).toLowerCase();
        const normalizedExtensions = extensions.map(ext => 
            ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
        );

        return normalizedExtensions.includes(fileExt);
    }

    /**
     * ファイル統計情報を取得
     * @param {string[]} files ファイルパスの配列
     * @returns {Promise<Object>} 統計情報
     */
    async getFileStats(files) {
        try {
            console.log('📊 ファイル統計情報を計算中...');

            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                extensionCount: {},
                largestFile: null,
                oldestFile: null,
                newestFile: null
            };

            for (const filePath of files) {
                try {
                    const fileStat = await fs.stat(filePath);
                    const ext = path.extname(filePath).toLowerCase() || '(no extension)';

                    // サイズ集計
                    stats.totalSize += fileStat.size;

                    // 拡張子別カウント
                    stats.extensionCount[ext] = (stats.extensionCount[ext] || 0) + 1;

                    // 最大ファイル
                    if (!stats.largestFile || fileStat.size > stats.largestFile.size) {
                        stats.largestFile = { path: filePath, size: fileStat.size };
                    }

                    // 最古・最新ファイル
                    if (!stats.oldestFile || fileStat.mtime < stats.oldestFile.mtime) {
                        stats.oldestFile = { path: filePath, mtime: fileStat.mtime };
                    }
                    if (!stats.newestFile || fileStat.mtime > stats.newestFile.mtime) {
                        stats.newestFile = { path: filePath, mtime: fileStat.mtime };
                    }

                } catch (error) {
                    console.warn(`⚠️ ファイル統計取得エラー: ${filePath}`, error.message);
                }
            }

            console.log('✅ ファイル統計情報計算完了');
            return stats;

        } catch (error) {
            console.error('❌ ファイル統計エラー:', error);
            throw new Error(`ファイル統計の取得に失敗しました: ${error.message}`);
        }
    }

    // ===== 新しい高度な処理メソッド =====

    /**
     * 高度なファイル検索（フィルタ強化版）
     * @param {string} directory 検索対象ディレクトリ
     * @param {Object} filterConfig フィルタ設定
     * @returns {Promise<string[]>} フィルタリング後のファイル配列
     */
    async findFilesAdvanced(directory, filterConfig = {}) {
        try {
            console.log(`🔍 高度なファイル検索開始: ${directory}`);
            
            // パフォーマンス監視開始
            if (this.processingMode.enablePerformanceMonitoring) {
                this.performanceMonitor.startMonitoring();
            }

            // 基本的なファイル検索
            const rawFiles = await this.findFiles(
                directory, 
                filterConfig.extensions || [], 
                filterConfig.excludePatterns || []
            );

            console.log(`📋 基本検索結果: ${rawFiles.length}件`);

            // 高度なフィルタリング適用
            const filteredFiles = await this.fileFilters.filterFiles(rawFiles, filterConfig);

            // パフォーマンス監視終了
            if (this.processingMode.enablePerformanceMonitoring) {
                const stats = this.performanceMonitor.stopMonitoring();
                console.log(`📊 検索パフォーマンス: ${stats.summary.totalTime}秒`);
            }

            console.log(`✅ 高度な検索完了: ${filteredFiles.length}件`);
            return filteredFiles;

        } catch (error) {
            console.error('❌ 高度なファイル検索エラー:', error);
            throw new Error(`高度なファイル検索に失敗しました: ${error.message}`);
        }
    }

    /**
     * 大容量ファイル一括置換処理（Stream + 並列処理）
     * @param {string[]} filePaths ファイルパス配列
     * @param {Array} replacementRules 置換ルール配列
     * @param {Function} progressCallback 進捗コールバック
     * @returns {Promise<Object>} 処理結果
     */
    async processBatchReplacement(filePaths, replacementRules, progressCallback = null) {
        try {
            console.log(`🚀 一括置換処理開始: ${filePaths.length}ファイル`);

            // パフォーマンス監視開始
            if (this.processingMode.enablePerformanceMonitoring) {
                this.performanceMonitor.startMonitoring(filePaths.length);
            }

            // 処理方式の判定
            const useAsync = filePaths.length >= this.processingMode.asyncBatchThreshold;
            const largeFiles = [];
            const normalFiles = [];

            // ファイルサイズに基づく分類
            for (const filePath of filePaths) {
                try {
                    const shouldUseStream = await this.streamProcessor.shouldUseStreamProcessing(
                        filePath, 
                        this.processingMode.streamSizeThreshold
                    );
                    
                    if (shouldUseStream && this.processingMode.useStreamProcessing) {
                        largeFiles.push(filePath);
                    } else {
                        normalFiles.push(filePath);
                    }
                } catch (error) {
                    console.warn(`⚠️ ファイル分類エラー: ${filePath}`, error.message);
                    normalFiles.push(filePath); // フォールバック
                }
            }

            console.log(`📊 処理分類: 大容量 ${largeFiles.length}件, 通常 ${normalFiles.length}件`);

            const results = [];

            // 大容量ファイルのStream処理
            if (largeFiles.length > 0) {
                console.log(`🌊 大容量ファイルStream処理開始: ${largeFiles.length}件`);
                
                const streamResults = await this.streamProcessor.processBatchLargeFiles(
                    largeFiles, 
                    replacementRules, 
                    this._createProgressWrapper(progressCallback, 'stream')
                );
                
                results.push(...streamResults.results);
            }

            // 通常ファイルの処理
            if (normalFiles.length > 0) {
                if (useAsync && this.processingMode.useWorkerThreads) {
                    console.log(`👥 通常ファイル並列処理開始: ${normalFiles.length}件`);
                    
                    const asyncResults = await this.asyncProcessor.processBatch(
                        normalFiles, 
                        replacementRules, 
                        this._createProgressWrapper(progressCallback, 'async')
                    );
                    
                    results.push(...asyncResults.results.completed);
                    results.push(...asyncResults.results.failed);
                    
                } else {
                    console.log(`📋 通常ファイル順次処理開始: ${normalFiles.length}件`);
                    
                    for (const filePath of normalFiles) {
                        try {
                            const result = await this._processSingleFile(filePath, replacementRules);
                            results.push(result);
                            
                            // 進捗通知
                            if (progressCallback) {
                                progressCallback(results.length, filePaths.length, filePath, result);
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
                }
            }

            // パフォーマンス監視終了
            let performanceStats = null;
            if (this.processingMode.enablePerformanceMonitoring) {
                performanceStats = this.performanceMonitor.stopMonitoring();
                console.log(`📊 処理パフォーマンス: ${performanceStats.summary.totalTime}秒`);
            }

            // 最終結果集計
            const finalResult = this._generateBatchResult(results, performanceStats);
            
            console.log(`✅ 一括置換処理完了: 成功 ${finalResult.summary.successCount}件, 失敗 ${finalResult.summary.errorCount}件`);
            
            return finalResult;

        } catch (error) {
            console.error('❌ 一括置換処理エラー:', error);
            throw new Error(`一括置換処理に失敗しました: ${error.message}`);
        }
    }

    /**
     * 単一ファイルの置換処理（最適化版）
     * @param {string} filePath ファイルパス
     * @param {Array} replacementRules 置換ルール配列
     * @returns {Promise<Object>} 処理結果
     * @private
     */
    async _processSingleFile(filePath, replacementRules) {
        const startTime = performance.now();
        
        try {
            // ファイルサイズチェック
            const shouldUseStream = await this.streamProcessor.shouldUseStreamProcessing(
                filePath, 
                this.processingMode.streamSizeThreshold
            );
            
            if (shouldUseStream && this.processingMode.useStreamProcessing) {
                // Stream処理
                return await this.streamProcessor.processLargeFile(filePath, replacementRules);
            } else {
                // 通常処理
                return await this.asyncProcessor.processFile(filePath, replacementRules);
            }
            
        } catch (error) {
            const endTime = performance.now();
            console.error(`❌ 単一ファイル処理エラー: ${filePath}`, error);
            
            return {
                filePath,
                success: false,
                error: error.message,
                processingTime: endTime - startTime
            };
        }
    }

    /**
     * 進捗コールバックのラッパー作成
     * @param {Function} originalCallback 元のコールバック
     * @param {string} processorType プロセッサタイプ
     * @returns {Function} ラップされたコールバック
     * @private
     */
    _createProgressWrapper(originalCallback, processorType) {
        if (!originalCallback) return null;
        
        return (current, total, currentFile, result) => {
            console.log(`📊 ${processorType}進捗: ${current}/${total} - ${currentFile}`);
            originalCallback(current, total, currentFile, result);
        };
    }

    /**
     * 一括処理結果の生成
     * @param {Array} results 個別処理結果
     * @param {Object} performanceStats パフォーマンス統計
     * @returns {Object} 最終結果
     * @private
     */
    _generateBatchResult(results, performanceStats) {
        const successResults = results.filter(r => r.success !== false);
        const errorResults = results.filter(r => r.success === false);
        
        const totalReplacements = successResults.reduce((sum, r) => sum + (r.replacements || 0), 0);
        const totalBytes = successResults.reduce((sum, r) => sum + (r.originalSize || 0), 0);
        
        return {
            summary: {
                totalFiles: results.length,
                successCount: successResults.length,
                errorCount: errorResults.length,
                successRate: Math.round((successResults.length / results.length) * 100),
                totalReplacements,
                totalBytes,
                processedSizeMB: Math.round(totalBytes / 1024 / 1024)
            },
            results: {
                success: successResults,
                errors: errorResults
            },
            performance: performanceStats,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * システム情報の取得
     * @returns {Object} システム情報
     */
    getSystemInfo() {
        return {
            fileSystemUtils: this.fileSystemUtils.getSystemInfo(),
            performanceMonitor: this.performanceMonitor.generateReport(),
            processingMode: this.processingMode,
            capabilities: {
                workerThreadsSupported: this.processingMode.useWorkerThreads,
                streamProcessingSupported: this.processingMode.useStreamProcessing,
                performanceMonitoringEnabled: this.processingMode.enablePerformanceMonitoring
            }
        };
    }

    /**
     * 設定の更新
     * @param {Object} newOptions 新しい設定
     */
    updateSettings(newOptions) {
        console.log('⚙️ FileOperations設定更新');
        
        // 基本設定更新
        if (newOptions.maxFileSize) {
            this.MAX_FILE_SIZE = newOptions.maxFileSize;
        }
        
        if (newOptions.maxSearchDepth) {
            this.MAX_SEARCH_DEPTH = newOptions.maxSearchDepth;
        }
        
        // 処理モード更新
        if (newOptions.processingMode) {
            this.processingMode = { ...this.processingMode, ...newOptions.processingMode };
        }
        
        console.log('✅ 設定更新完了');
    }

    /**
     * リソースのクリーンアップ
     */
    cleanup() {
        console.log('🧹 FileOperationsリソースクリーンアップ');
        
        // 進行中の処理をキャンセル
        if (this.asyncProcessor.getStatus().processing) {
            this.asyncProcessor.cancel();
        }
        
        // パフォーマンス監視停止
        if (this.performanceMonitor.monitoring) {
            this.performanceMonitor.stopMonitoring();
        }
        
        console.log('✅ クリーンアップ完了');
    }
}

module.exports = FileOperations;