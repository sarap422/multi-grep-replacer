const fs = require('fs').promises;
const path = require('path');
const { dialog } = require('electron');

/**
 * 設定管理クラス
 * JSON設定ファイルの読み込み・保存・バリデーションを担当
 */
class ConfigManager {
    constructor() {
        // 設定ディレクトリパス
        this.configDir = path.join(__dirname, '../../config');
        this.defaultConfigPath = path.join(this.configDir, 'default.json');
        this.userConfigDir = path.join(require('os').homedir(), '.multi-grep-replacer');
        this.recentConfigsPath = path.join(this.userConfigDir, 'recent.json');
        this.maxRecentConfigs = 10;

        // JSON Schema定義
        this.configSchema = {
            type: 'object',
            required: ['app_info', 'replacements', 'target_settings'],
            properties: {
                app_info: {
                    type: 'object',
                    required: ['name', 'version'],
                    properties: {
                        name: { type: 'string', minLength: 1 },
                        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
                        created_at: { type: 'string' },
                        description: { type: 'string' },
                        author: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } }
                    }
                },
                replacements: {
                    type: 'array',
                    items: {
                        type: 'object',
                        required: ['id', 'from', 'to', 'enabled'],
                        properties: {
                            id: { type: 'string', minLength: 1 },
                            from: { type: 'string' },
                            to: { type: 'string' },
                            enabled: { type: 'boolean' },
                            description: { type: 'string' },
                            case_sensitive: { type: 'boolean' },
                            whole_word: { type: 'boolean' }
                        }
                    }
                },
                target_settings: {
                    type: 'object',
                    properties: {
                        file_extensions: { 
                            type: 'array', 
                            items: { type: 'string', pattern: '^\\.\\w+$' } 
                        },
                        exclude_patterns: { 
                            type: 'array', 
                            items: { type: 'string' } 
                        },
                        include_subdirectories: { type: 'boolean' },
                        max_file_size: { type: 'number', minimum: 0 },
                        encoding: { type: 'string', enum: ['utf-8', 'utf-16', 'shift_jis'] }
                    }
                },
                replacement_settings: {
                    type: 'object',
                    properties: {
                        case_sensitive: { type: 'boolean' },
                        use_regex: { type: 'boolean' },
                        backup_enabled: { type: 'boolean' },
                        preserve_file_permissions: { type: 'boolean' },
                        dry_run: { type: 'boolean' }
                    }
                },
                ui_settings: {
                    type: 'object',
                    properties: {
                        theme: { type: 'string', enum: ['light', 'dark', 'auto'] },
                        window: {
                            type: 'object',
                            properties: {
                                width: { type: 'number', minimum: 400 },
                                height: { type: 'number', minimum: 300 },
                                resizable: { type: 'boolean' },
                                center: { type: 'boolean' }
                            }
                        },
                        remember_last_folder: { type: 'boolean' },
                        auto_save_config: { type: 'boolean' },
                        show_file_count_preview: { type: 'boolean' },
                        confirm_before_execution: { type: 'boolean' }
                    }
                },
                advanced_settings: {
                    type: 'object',
                    properties: {
                        max_concurrent_files: { type: 'number', minimum: 1, maximum: 50 },
                        progress_update_interval: { type: 'number', minimum: 50 },
                        log_level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'] },
                        enable_crash_reporting: { type: 'boolean' }
                    }
                }
            }
        };

        this._initializeUserConfigDir();
    }

    /**
     * ユーザー設定ディレクトリの初期化
     * @private
     */
    async _initializeUserConfigDir() {
        try {
            await fs.mkdir(this.userConfigDir, { recursive: true });
            console.log(`📁 ユーザー設定ディレクトリ準備完了: ${this.userConfigDir}`);
        } catch (error) {
            console.warn('⚠️ ユーザー設定ディレクトリ作成エラー:', error.message);
        }
    }

    /**
     * デフォルト設定を取得
     * @returns {Promise<Object>} デフォルト設定オブジェクト
     */
    async getDefaultConfig() {
        try {
            console.log('📋 デフォルト設定を読み込み中...');
            
            const configContent = await fs.readFile(this.defaultConfigPath, 'utf8');
            const config = JSON.parse(configContent);
            
            // 設定の検証
            await this.validateConfig(config);
            
            console.log('✅ デフォルト設定読み込み完了');
            return config;

        } catch (error) {
            console.error('❌ デフォルト設定読み込みエラー:', error);
            
            // フォールバック設定を返す
            return this._getFallbackConfig();
        }
    }

    /**
     * 設定ファイルを読み込み
     * @param {string} configPath 設定ファイルパス（undefinedの場合はダイアログ表示）
     * @param {BrowserWindow} parentWindow 親ウィンドウ
     * @returns {Promise<Object>} 設定オブジェクト
     */
    async loadConfig(configPath = null, parentWindow = null) {
        try {
            let targetPath = configPath;

            // パスが指定されていない場合、ファイル選択ダイアログを表示
            if (!targetPath) {
                const result = await dialog.showOpenDialog(parentWindow, {
                    title: 'Load Configuration File',
                    message: '設定ファイルを選択してください',
                    filters: [
                        { name: 'JSON Config Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ],
                    properties: ['openFile']
                });

                if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
                    console.log('📝 設定ファイル選択がキャンセルされました');
                    return null;
                }

                targetPath = result.filePaths[0];
            }

            console.log(`📂 設定ファイル読み込み: ${targetPath}`);

            // ファイル存在確認
            await fs.access(targetPath, fs.constants.F_OK);

            // ファイル読み込み
            const configContent = await fs.readFile(targetPath, 'utf8');
            const config = JSON.parse(configContent);

            // 設定検証
            await this.validateConfig(config);

            // デフォルト値とマージ
            const defaultConfig = await this.getDefaultConfig();
            const mergedConfig = this.mergeConfig(defaultConfig, config);

            // 最近使用した設定に追加
            await this.addToRecentConfigs(targetPath, mergedConfig.app_info);

            console.log('✅ 設定ファイル読み込み完了');
            return mergedConfig;

        } catch (error) {
            console.error(`❌ 設定ファイル読み込みエラー:`, error);

            if (error.name === 'SyntaxError') {
                throw new Error('設定ファイルのJSON形式が無効です');
            } else if (error.code === 'ENOENT') {
                throw new Error('設定ファイルが見つかりません');
            } else if (error.code === 'EACCES') {
                throw new Error('設定ファイルの読み取り権限がありません');
            } else {
                throw new Error(`設定ファイルの読み込みに失敗しました: ${error.message}`);
            }
        }
    }

    /**
     * 設定ファイルを保存
     * @param {Object} config 設定オブジェクト
     * @param {string} configPath 保存先パス（undefinedの場合はダイアログ表示）
     * @param {BrowserWindow} parentWindow 親ウィンドウ
     * @returns {Promise<string>} 保存されたファイルパス
     */
    async saveConfig(config, configPath = null, parentWindow = null) {
        try {
            console.log('💾 設定ファイル保存開始...');

            // 設定検証
            await this.validateConfig(config);

            let targetPath = configPath;

            // パスが指定されていない場合、ファイル保存ダイアログを表示
            if (!targetPath) {
                const result = await dialog.showSaveDialog(parentWindow, {
                    title: 'Save Configuration File',
                    message: '設定ファイルを保存してください',
                    defaultPath: `multi-grep-replacer-config-${new Date().toISOString().split('T')[0]}.json`,
                    filters: [
                        { name: 'JSON Config Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });

                if (result.canceled || !result.filePath) {
                    console.log('📝 設定ファイル保存がキャンセルされました');
                    return null;
                }

                targetPath = result.filePath;
            }

            // app_infoを更新
            const configToSave = {
                ...config,
                app_info: {
                    ...config.app_info,
                    created_at: new Date().toISOString(),
                    version: config.app_info.version || '1.0.0'
                }
            };

            // JSON文字列に変換（整形）
            const configJson = JSON.stringify(configToSave, null, 2);

            // ファイル保存
            await fs.writeFile(targetPath, configJson, 'utf8');

            // 最近使用した設定に追加
            await this.addToRecentConfigs(targetPath, configToSave.app_info);

            console.log(`✅ 設定ファイル保存完了: ${targetPath}`);
            return targetPath;

        } catch (error) {
            console.error('❌ 設定ファイル保存エラー:', error);
            throw new Error(`設定ファイルの保存に失敗しました: ${error.message}`);
        }
    }

    /**
     * 設定をバリデーション
     * @param {Object} config 設定オブジェクト
     * @returns {Promise<boolean>} バリデーション結果
     */
    async validateConfig(config) {
        try {
            console.log('🔍 設定バリデーション実行中...');

            if (!config || typeof config !== 'object') {
                throw new Error('設定が無効なオブジェクトです');
            }

            // 基本構造チェック
            const errors = this._validateAgainstSchema(config, this.configSchema);
            if (errors.length > 0) {
                throw new Error(`設定バリデーションエラー: ${errors.join(', ')}`);
            }

            // ビジネスロジックバリデーション
            this._validateBusinessRules(config);

            console.log('✅ 設定バリデーション完了');
            return true;

        } catch (error) {
            console.error('❌ 設定バリデーションエラー:', error);
            throw error;
        }
    }

    /**
     * 設定をマージ（デフォルト + ユーザー設定）
     * @param {Object} defaultConfig デフォルト設定
     * @param {Object} userConfig ユーザー設定
     * @returns {Object} マージされた設定
     */
    mergeConfig(defaultConfig, userConfig) {
        const merged = JSON.parse(JSON.stringify(defaultConfig));

        // 再帰的にマージ
        this._deepMerge(merged, userConfig);

        return merged;
    }

    /**
     * 最近使用した設定一覧を取得
     * @returns {Promise<Array>} 最近使用した設定一覧
     */
    async getRecentConfigs() {
        try {
            console.log('📋 最近使用した設定一覧を取得中...');

            const recentContent = await fs.readFile(this.recentConfigsPath, 'utf8');
            const recentConfigs = JSON.parse(recentContent);

            console.log(`✅ 最近使用した設定: ${recentConfigs.length}件`);
            return recentConfigs;

        } catch (error) {
            console.log('📝 最近使用した設定履歴はありません');
            return [];
        }
    }

    /**
     * 最近使用した設定に追加
     * @param {string} configPath 設定ファイルパス
     * @param {Object} appInfo アプリ情報
     * @returns {Promise<void>}
     * @private
     */
    async addToRecentConfigs(configPath, appInfo) {
        try {
            let recentConfigs = await this.getRecentConfigs();

            // 既存の同じパスを削除
            recentConfigs = recentConfigs.filter(item => item.path !== configPath);

            // 新しいエントリを先頭に追加
            recentConfigs.unshift({
                path: configPath,
                name: appInfo.name || path.basename(configPath),
                description: appInfo.description || '',
                lastUsed: new Date().toISOString()
            });

            // 最大件数制限
            if (recentConfigs.length > this.maxRecentConfigs) {
                recentConfigs = recentConfigs.slice(0, this.maxRecentConfigs);
            }

            // 保存
            await fs.writeFile(this.recentConfigsPath, JSON.stringify(recentConfigs, null, 2), 'utf8');
            console.log('✅ 最近使用した設定を更新');

        } catch (error) {
            console.warn('⚠️ 最近使用した設定の更新エラー:', error.message);
        }
    }

    /**
     * フォールバック設定を取得
     * @returns {Object} 最小限の設定オブジェクト
     * @private
     */
    _getFallbackConfig() {
        return {
            app_info: {
                name: "Multi Grep Replacer",
                version: "1.0.0",
                created_at: new Date().toISOString(),
                description: "Fallback configuration"
            },
            replacements: [],
            target_settings: {
                file_extensions: [".html", ".css", ".js"],
                exclude_patterns: ["node_modules/**", ".git/**"],
                include_subdirectories: true,
                max_file_size: 104857600,
                encoding: "utf-8"
            },
            replacement_settings: {
                case_sensitive: true,
                use_regex: false,
                backup_enabled: false,
                preserve_file_permissions: true,
                dry_run: false
            },
            ui_settings: {
                theme: "auto",
                window: {
                    width: 800,
                    height: 700,
                    resizable: true,
                    center: true
                },
                remember_last_folder: true,
                auto_save_config: false,
                show_file_count_preview: true,
                confirm_before_execution: true
            },
            advanced_settings: {
                max_concurrent_files: 10,
                progress_update_interval: 100,
                log_level: "info",
                enable_crash_reporting: false
            }
        };
    }

    /**
     * スキーマに対するバリデーション
     * @param {Object} obj 検証対象オブジェクト
     * @param {Object} schema スキーマ
     * @returns {Array} エラーメッセージ配列
     * @private
     */
    _validateAgainstSchema(obj, schema, path = '') {
        const errors = [];

        if (schema.type === 'object') {
            if (typeof obj !== 'object' || obj === null) {
                errors.push(`${path}: オブジェクトである必要があります`);
                return errors;
            }

            // 必須プロパティチェック
            if (schema.required) {
                for (const requiredProp of schema.required) {
                    if (!(requiredProp in obj)) {
                        errors.push(`${path}.${requiredProp}: 必須プロパティが不足しています`);
                    }
                }
            }

            // プロパティのバリデーション
            if (schema.properties) {
                for (const [prop, propSchema] of Object.entries(schema.properties)) {
                    if (prop in obj) {
                        const propErrors = this._validateAgainstSchema(
                            obj[prop], 
                            propSchema, 
                            path ? `${path}.${prop}` : prop
                        );
                        errors.push(...propErrors);
                    }
                }
            }
        } else if (schema.type === 'array') {
            if (!Array.isArray(obj)) {
                errors.push(`${path}: 配列である必要があります`);
                return errors;
            }

            if (schema.items) {
                obj.forEach((item, index) => {
                    const itemErrors = this._validateAgainstSchema(
                        item, 
                        schema.items, 
                        `${path}[${index}]`
                    );
                    errors.push(...itemErrors);
                });
            }
        } else if (schema.type) {
            const actualType = typeof obj;
            if (actualType !== schema.type) {
                errors.push(`${path}: ${schema.type}型である必要があります（実際: ${actualType}）`);
            }

            // 追加の制約チェック
            if (schema.enum && !schema.enum.includes(obj)) {
                errors.push(`${path}: 許可された値のいずれかである必要があります (${schema.enum.join(', ')})`);
            }
            if (schema.pattern && typeof obj === 'string' && !new RegExp(schema.pattern).test(obj)) {
                errors.push(`${path}: パターンに一致しません (${schema.pattern})`);
            }
            if (schema.minimum !== undefined && typeof obj === 'number' && obj < schema.minimum) {
                errors.push(`${path}: ${schema.minimum}以上である必要があります`);
            }
            if (schema.maximum !== undefined && typeof obj === 'number' && obj > schema.maximum) {
                errors.push(`${path}: ${schema.maximum}以下である必要があります`);
            }
            if (schema.minLength !== undefined && typeof obj === 'string' && obj.length < schema.minLength) {
                errors.push(`${path}: ${schema.minLength}文字以上である必要があります`);
            }
        }

        return errors;
    }

    /**
     * ビジネスルールのバリデーション
     * @param {Object} config 設定オブジェクト
     * @private
     */
    _validateBusinessRules(config) {
        // 置換ルールの重複チェック
        if (config.replacements && config.replacements.length > 0) {
            const ids = config.replacements.map(rule => rule.id);
            const uniqueIds = new Set(ids);
            if (ids.length !== uniqueIds.size) {
                throw new Error('置換ルールのIDに重複があります');
            }
        }

        // ファイルサイズ制限チェック
        if (config.target_settings?.max_file_size > 1073741824) { // 1GB
            throw new Error('最大ファイルサイズが制限を超えています（1GB以下に設定してください）');
        }

        // 同時実行数制限チェック
        if (config.advanced_settings?.max_concurrent_files > 50) {
            throw new Error('最大同時実行ファイル数が制限を超えています（50以下に設定してください）');
        }
    }

    /**
     * オブジェクトの深いマージ
     * @param {Object} target マージ先オブジェクト
     * @param {Object} source マージ元オブジェクト
     * @private
     */
    _deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                }
                this._deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
}

module.exports = ConfigManager;