const { ipcMain } = require('electron');
const FileOperations = require('./file-operations');
const ConfigManager = require('./config-manager');
const ReplacementEngine = require('./replacement-engine');
const ReplacementPreview = require('./replacement-preview');

/**
 * IPC通信ハンドラークラス
 * レンダラープロセスからの要求に対してセキュアなAPIを提供
 */
class IPCHandlers {
    constructor(mainWindow) {
        this.mainWindow = mainWindow;
        this.fileOperations = new FileOperations();
        this.configManager = new ConfigManager();
        this.replacementPreview = new ReplacementPreview();
        
        // 置換エンジン（実行時に初期化）
        this.replacementEngine = null;
        
        // 現在の処理状態
        this.isProcessing = false;
        this.currentOperation = null;
        
        this.registerHandlers();
        console.log('🔗 IPC通信ハンドラー登録完了');
    }

    /**
     * IPCハンドラーを登録
     * @private
     */
    registerHandlers() {
        console.log('📝 IPC通信ハンドラーを登録中...');

        // ファイル操作API
        this.registerFileOperations();
        
        // 設定管理API
        this.registerConfigOperations();
        
        // 置換処理API（基本実装）
        this.registerReplacementOperations();
        
        // システム情報API
        this.registerSystemOperations();

        console.log('✅ IPC通信ハンドラー登録完了');
    }

    /**
     * ファイル操作関連のハンドラーを登録
     * @private
     */
    registerFileOperations() {
        // フォルダ選択
        ipcMain.handle('select-folder', async () => {
            try {
                console.log('📂 フォルダ選択要求受信');
                const folderPath = await this.fileOperations.selectFolder(this.mainWindow);
                console.log(`✅ フォルダ選択結果: ${folderPath || 'キャンセル'}`);
                return folderPath;
            } catch (error) {
                console.error('❌ フォルダ選択エラー:', error);
                throw error;
            }
        });

        // ファイル検索
        ipcMain.handle('find-files', async (event, directory, extensions) => {
            try {
                console.log(`🔍 ファイル検索要求: ${directory} (${extensions?.join(', ') || '全ファイル'})`);
                
                // パラメータ検証
                if (!directory || typeof directory !== 'string') {
                    throw new Error('ディレクトリパスが無効です');
                }

                const files = await this.fileOperations.findFiles(directory, extensions);
                console.log(`✅ ファイル検索完了: ${files.length}件`);
                
                return files;
            } catch (error) {
                console.error('❌ ファイル検索エラー:', error);
                throw error;
            }
        });

        // ファイル読み込み
        ipcMain.handle('read-file', async (event, filePath) => {
            try {
                console.log(`📖 ファイル読み込み要求: ${filePath}`);
                
                if (!filePath || typeof filePath !== 'string') {
                    throw new Error('ファイルパスが無効です');
                }

                const content = await this.fileOperations.readFileContent(filePath);
                console.log(`✅ ファイル読み込み完了: ${filePath}`);
                
                return content;
            } catch (error) {
                console.error('❌ ファイル読み込みエラー:', error);
                throw error;
            }
        });

        // ファイル書き込み
        ipcMain.handle('write-file', async (event, filePath, content) => {
            try {
                console.log(`✏️ ファイル書き込み要求: ${filePath}`);
                
                if (!filePath || typeof filePath !== 'string') {
                    throw new Error('ファイルパスが無効です');
                }
                if (typeof content !== 'string') {
                    throw new Error('ファイル内容が無効です');
                }

                await this.fileOperations.writeFileContent(filePath, content);
                console.log(`✅ ファイル書き込み完了: ${filePath}`);
                
                return true;
            } catch (error) {
                console.error('❌ ファイル書き込みエラー:', error);
                throw error;
            }
        });

        // ファイル統計取得
        ipcMain.handle('get-file-stats', async (event, files) => {
            try {
                console.log(`📊 ファイル統計要求: ${files?.length || 0}件`);
                
                if (!Array.isArray(files)) {
                    throw new Error('ファイル一覧が無効です');
                }

                const stats = await this.fileOperations.getFileStats(files);
                console.log('✅ ファイル統計取得完了');
                
                return stats;
            } catch (error) {
                console.error('❌ ファイル統計エラー:', error);
                throw error;
            }
        });
    }

    /**
     * 設定管理関連のハンドラーを登録
     * @private
     */
    registerConfigOperations() {
        // デフォルト設定取得
        ipcMain.handle('get-default-config', async () => {
            try {
                console.log('📋 デフォルト設定取得要求');
                const config = await this.configManager.getDefaultConfig();
                console.log('✅ デフォルト設定取得完了');
                return config;
            } catch (error) {
                console.error('❌ デフォルト設定取得エラー:', error);
                throw error;
            }
        });

        // 設定読み込み
        ipcMain.handle('load-config', async (event, configPath) => {
            try {
                console.log(`📂 設定読み込み要求: ${configPath || 'ダイアログ選択'}`);
                const config = await this.configManager.loadConfig(configPath, this.mainWindow);
                console.log('✅ 設定読み込み完了');
                return config;
            } catch (error) {
                console.error('❌ 設定読み込みエラー:', error);
                throw error;
            }
        });

        // 設定保存
        ipcMain.handle('save-config', async (event, config, configPath) => {
            try {
                console.log(`💾 設定保存要求: ${configPath || 'ダイアログ選択'}`);
                
                if (!config || typeof config !== 'object') {
                    throw new Error('設定データが無効です');
                }

                const savedPath = await this.configManager.saveConfig(config, configPath, this.mainWindow);
                console.log('✅ 設定保存完了');
                return savedPath;
            } catch (error) {
                console.error('❌ 設定保存エラー:', error);
                throw error;
            }
        });

        // 設定バリデーション
        ipcMain.handle('validate-config', async (event, config) => {
            try {
                console.log('🔍 設定バリデーション要求');
                
                if (!config || typeof config !== 'object') {
                    throw new Error('設定データが無効です');
                }

                const isValid = await this.configManager.validateConfig(config);
                console.log('✅ 設定バリデーション完了');
                return isValid;
            } catch (error) {
                console.error('❌ 設定バリデーションエラー:', error);
                throw error;
            }
        });

        // 最近使用した設定取得
        ipcMain.handle('get-recent-configs', async () => {
            try {
                console.log('📋 最近使用した設定取得要求');
                const recentConfigs = await this.configManager.getRecentConfigs();
                console.log(`✅ 最近使用した設定取得完了: ${recentConfigs.length}件`);
                return recentConfigs;
            } catch (error) {
                console.error('❌ 最近使用した設定取得エラー:', error);
                throw error;
            }
        });
    }

    /**
     * 置換処理関連のハンドラーを登録（基本実装）
     * @private
     */
    registerReplacementOperations() {
        // 置換実行
        ipcMain.handle('execute-replacement', async (event, config) => {
            try {
                console.log('🚀 置換処理実行要求');
                
                if (this.isProcessing) {
                    throw new Error('他の処理が実行中です');
                }

                if (!config || typeof config !== 'object') {
                    throw new Error('設定データが無効です');
                }

                // 設定バリデーション
                await this.configManager.validateConfig(config);

                this.isProcessing = true;
                this.currentOperation = 'replacement';

                // 実際の置換処理実行
                const result = await this._executeReplacement(config);

                this.isProcessing = false;
                this.currentOperation = null;

                console.log('✅ 置換処理完了');
                return result;

            } catch (error) {
                this.isProcessing = false;
                this.currentOperation = null;
                console.error('❌ 置換処理エラー:', error);
                
                // エラー通知をレンダラーに送信
                this._sendToRenderer('replacement-error', error.message);
                throw error;
            }
        });

        // 置換キャンセル
        ipcMain.handle('cancel-replacement', async () => {
            try {
                console.log('⏹️ 置換処理キャンセル要求');
                
                if (!this.isProcessing) {
                    console.log('📝 キャンセル対象の処理がありません');
                    return false;
                }

                // ReplacementEngine のキャンセル
                if (this.replacementEngine) {
                    this.replacementEngine.cancel();
                }

                this.isProcessing = false;
                this.currentOperation = null;

                // キャンセル通知をレンダラーに送信
                this._sendToRenderer('replacement-cancelled', true);

                console.log('✅ 置換処理キャンセル完了');
                return true;

            } catch (error) {
                console.error('❌ 置換処理キャンセルエラー:', error);
                throw error;
            }
        });

        // 置換プレビュー生成
        ipcMain.handle('generate-preview', async (event, config) => {
            try {
                console.log('👁️ 置換プレビュー生成要求');
                
                if (!config || typeof config !== 'object') {
                    throw new Error('設定データが無効です');
                }

                // 設定バリデーション
                await this.configManager.validateConfig(config);

                // ファイル検索
                const targetFolder = config.target_folder;
                const extensions = config.target_settings?.file_extensions;
                const files = await this.fileOperations.findFiles(targetFolder, extensions);

                // プレビュー生成
                const preview = await this.replacementPreview.generateComprehensivePreview(
                    files, 
                    config.replacements || []
                );

                console.log('✅ 置換プレビュー生成完了');
                return preview;

            } catch (error) {
                console.error('❌ 置換プレビュー生成エラー:', error);
                throw error;
            }
        });
    }

    /**
     * システム情報関連のハンドラーを登録
     * @private
     */
    registerSystemOperations() {
        // アプリケーション情報取得
        ipcMain.handle('get-app-info', async () => {
            try {
                const appInfo = {
                    name: 'Multi Grep Replacer',
                    version: '1.0.0',
                    platform: process.platform,
                    arch: process.arch,
                    nodeVersion: process.version,
                    electronVersion: process.versions.electron,
                    chromeVersion: process.versions.chrome
                };
                
                console.log('✅ アプリケーション情報取得完了');
                return appInfo;
            } catch (error) {
                console.error('❌ アプリケーション情報取得エラー:', error);
                throw error;
            }
        });

        // 処理状態取得
        ipcMain.handle('get-processing-status', async () => {
            return {
                isProcessing: this.isProcessing,
                currentOperation: this.currentOperation
            };
        });
    }

    /**
     * 実際の置換処理を実行
     * @param {Object} config 設定オブジェクト
     * @returns {Promise<Object>} 処理結果
     * @private
     */
    async _executeReplacement(config) {
        try {
            console.log('🔧 置換処理開始...');

            // 1. ファイル検索
            const targetFolder = config.target_folder;
            const extensions = config.target_settings?.file_extensions;
            const files = await this.fileOperations.findFiles(targetFolder, extensions);

            console.log(`📂 対象ファイル: ${files.length}件`);

            // 2. 置換ルール準備
            const rules = config.replacements?.filter(r => r.enabled) || [];
            if (rules.length === 0) {
                throw new Error('有効な置換ルールがありません');
            }

            console.log(`⚙️ 適用ルール: ${rules.length}件`);

            // 3. ReplacementEngine 初期化
            this.replacementEngine = new ReplacementEngine(rules, {
                caseSensitive: config.replacement_settings?.case_sensitive !== false,
                wholeWord: config.replacement_settings?.whole_word || false,
                dryRun: config.replacement_settings?.dry_run || false,
                maxConcurrency: config.advanced_settings?.max_concurrent_files || 10
            });

            // 4. 進捗通知開始
            this._sendToRenderer('replacement-started', { 
                totalFiles: files.length,
                activeRules: rules.length
            });

            // 5. 進捗コールバック設定
            const progressCallback = (progress) => {
                this._sendToRenderer('replacement-progress', progress);
            };

            // 6. 一括置換実行
            const result = await this.replacementEngine.processBatch(files, progressCallback);

            // 7. 結果変換
            const processedResult = {
                success: !result.cancelled,
                cancelled: result.cancelled,
                filesProcessed: result.summary.processedFiles,
                modifiedFiles: result.summary.modifiedFiles,
                totalChanges: result.summary.totalReplacements,
                duration: result.summary.processingTime,
                errors: result.results.errors || [],
                details: result.results.files.filter(f => f.modified).map(f => ({
                    file: f.filePath,
                    changes: f.stats?.totalReplacements || 0,
                    rules: f.changes?.map(c => `${c.from} → ${c.to}`) || []
                }))
            };

            // 8. 完了通知
            this._sendToRenderer('replacement-complete', processedResult);

            console.log('✅ 置換処理完了');
            return processedResult;

        } catch (error) {
            console.error('❌ 置換処理エラー:', error);
            throw error;
        } finally {
            // ReplacementEngine をクリーンアップ
            if (this.replacementEngine) {
                this.replacementEngine.removeAllListeners();
                this.replacementEngine = null;
            }
        }
    }

    /**
     * レンダラープロセスにメッセージを送信
     * @param {string} channel チャンネル名
     * @param {any} data 送信データ
     * @private
     */
    _sendToRenderer(channel, data) {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send(channel, data);
            console.log(`📤 Renderer通知送信: ${channel}`);
        }
    }

    /**
     * ハンドラーのクリーンアップ
     */
    cleanup() {
        console.log('🧹 IPC通信ハンドラーをクリーンアップ中...');
        
        // 処理中の操作をキャンセル
        this.isProcessing = false;
        this.currentOperation = null;

        // IPCハンドラーを削除
        const handlers = [
            'select-folder', 'find-files', 'read-file', 'write-file', 'get-file-stats',
            'get-default-config', 'load-config', 'save-config', 'validate-config', 'get-recent-configs',
            'execute-replacement', 'cancel-replacement', 'generate-preview',
            'get-app-info', 'get-processing-status'
        ];

        handlers.forEach(handler => {
            try {
                ipcMain.removeHandler(handler);
            } catch (error) {
                console.warn(`⚠️ ハンドラー削除エラー: ${handler}`, error.message);
            }
        });

        console.log('✅ IPC通信ハンドラークリーンアップ完了');
    }
}

module.exports = IPCHandlers;