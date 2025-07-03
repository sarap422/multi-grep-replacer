/**
 * レンダラープロセス用設定管理クラス
 * UI側での設定管理、キャッシュ、同期を担当
 */
class ConfigManager {
    constructor() {
        // 現在の設定
        this.currentConfig = null;
        this.isModified = false;
        this.lastSavedPath = null;
        
        // キャッシュ
        this.defaultConfig = null;
        this.recentConfigs = [];
        
        // 変更監視
        this.changeListeners = [];
        
        console.log('⚙️ ConfigManager (Renderer) 初期化完了');
    }

    /**
     * 初期化処理
     */
    async initialize() {
        try {
            console.log('🚀 ConfigManager初期化開始...');
            
            // デフォルト設定を読み込み
            await this.loadDefaultConfig();
            
            // 最近使用した設定を読み込み
            await this.loadRecentConfigs();
            
            console.log('✅ ConfigManager初期化完了');
            return true;

        } catch (error) {
            console.error('❌ ConfigManager初期化エラー:', error);
            throw error;
        }
    }

    /**
     * デフォルト設定を読み込み
     */
    async loadDefaultConfig() {
        try {
            console.log('📋 デフォルト設定を読み込み中...');
            
            if (!window.electronAPI?.configOperations) {
                throw new Error('Electron APIが利用できません');
            }

            this.defaultConfig = await window.electronAPI.configOperations.getDefaultConfig();
            
            // 現在の設定が未設定の場合、デフォルトをコピー
            if (!this.currentConfig) {
                this.currentConfig = JSON.parse(JSON.stringify(this.defaultConfig));
                this.isModified = false;
            }

            console.log('✅ デフォルト設定読み込み完了');
            return this.defaultConfig;

        } catch (error) {
            console.error('❌ デフォルト設定読み込みエラー:', error);
            
            // フォールバック設定
            this.defaultConfig = this._getFallbackConfig();
            if (!this.currentConfig) {
                this.currentConfig = JSON.parse(JSON.stringify(this.defaultConfig));
            }
            
            return this.defaultConfig;
        }
    }

    /**
     * 設定ファイルを読み込み
     * @param {string} filePath ファイルパス（省略時はダイアログ表示）
     */
    async loadConfig(filePath = null) {
        try {
            console.log(`📂 設定読み込み開始: ${filePath || 'ダイアログ選択'}`);
            
            if (!window.electronAPI?.configOperations) {
                throw new Error('Electron APIが利用できません');
            }

            const config = await window.electronAPI.configOperations.loadConfig(filePath);
            
            if (config) {
                this.currentConfig = config;
                this.isModified = false;
                this.lastSavedPath = filePath;
                
                // 変更通知
                this._notifyChange('config-loaded', { 
                    config: this.currentConfig,
                    filePath: filePath 
                });
                
                // 最近使用した設定を更新
                await this.loadRecentConfigs();

                console.log('✅ 設定読み込み完了');
                return config;
            }

            console.log('📝 設定読み込みがキャンセルされました');
            return null;

        } catch (error) {
            console.error('❌ 設定読み込みエラー:', error);
            
            // エラー通知
            this._notifyChange('config-error', {
                type: 'load',
                message: error.message
            });
            
            throw error;
        }
    }

    /**
     * 設定ファイルを保存
     * @param {string} filePath ファイルパス（省略時はダイアログ表示）
     */
    async saveConfig(filePath = null) {
        try {
            console.log(`💾 設定保存開始: ${filePath || 'ダイアログ選択'}`);
            
            if (!this.currentConfig) {
                throw new Error('保存する設定がありません');
            }

            if (!window.electronAPI?.configOperations) {
                throw new Error('Electron APIが利用できません');
            }

            const savedPath = await window.electronAPI.configOperations.saveConfig(
                this.currentConfig, 
                filePath
            );
            
            if (savedPath) {
                this.isModified = false;
                this.lastSavedPath = savedPath;
                
                // 変更通知
                this._notifyChange('config-saved', { 
                    config: this.currentConfig,
                    filePath: savedPath 
                });
                
                // 最近使用した設定を更新
                await this.loadRecentConfigs();

                console.log(`✅ 設定保存完了: ${savedPath}`);
                return savedPath;
            }

            console.log('📝 設定保存がキャンセルされました');
            return null;

        } catch (error) {
            console.error('❌ 設定保存エラー:', error);
            
            // エラー通知
            this._notifyChange('config-error', {
                type: 'save',
                message: error.message
            });
            
            throw error;
        }
    }

    /**
     * 最近使用した設定一覧を読み込み
     */
    async loadRecentConfigs() {
        try {
            console.log('📋 最近使用した設定を読み込み中...');
            
            if (!window.electronAPI?.configOperations) {
                console.warn('⚠️ Electron APIが利用できません');
                this.recentConfigs = [];
                return [];
            }

            this.recentConfigs = await window.electronAPI.configOperations.getRecentConfigs();
            
            // 変更通知
            this._notifyChange('recent-configs-updated', {
                recentConfigs: this.recentConfigs
            });

            console.log(`✅ 最近使用した設定読み込み完了: ${this.recentConfigs.length}件`);
            return this.recentConfigs;

        } catch (error) {
            console.error('❌ 最近使用した設定読み込みエラー:', error);
            this.recentConfigs = [];
            return [];
        }
    }

    /**
     * 現在の設定を取得
     */
    getCurrentConfig() {
        return this.currentConfig ? JSON.parse(JSON.stringify(this.currentConfig)) : null;
    }

    /**
     * 設定の一部を更新
     * @param {string} section セクション名
     * @param {string} key キー名
     * @param {any} value 値
     */
    updateConfig(section, key, value) {
        try {
            if (!this.currentConfig) {
                throw new Error('設定が初期化されていません');
            }

            if (!this.currentConfig[section]) {
                this.currentConfig[section] = {};
            }

            const oldValue = this.currentConfig[section][key];
            this.currentConfig[section][key] = value;

            if (oldValue !== value) {
                this.isModified = true;
                
                // 変更通知
                this._notifyChange('config-changed', {
                    section,
                    key,
                    value,
                    oldValue,
                    config: this.currentConfig
                });
            }

            console.log(`🔧 設定更新: ${section}.${key} = ${value}`);
            return true;

        } catch (error) {
            console.error('❌ 設定更新エラー:', error);
            throw error;
        }
    }

    /**
     * 置換ルールを追加
     * @param {Object} rule 置換ルール
     */
    addReplacementRule(rule) {
        try {
            if (!this.currentConfig?.replacements) {
                this.currentConfig.replacements = [];
            }

            // ルールIDが未設定の場合は自動生成
            if (!rule.id) {
                rule.id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            }

            // デフォルト値を設定
            const newRule = {
                enabled: true,
                case_sensitive: true,
                whole_word: false,
                description: '',
                ...rule
            };

            this.currentConfig.replacements.push(newRule);
            this.isModified = true;

            // 変更通知
            this._notifyChange('replacement-rule-added', {
                rule: newRule,
                config: this.currentConfig
            });

            console.log(`➕ 置換ルール追加: ${rule.from} → ${rule.to}`);
            return newRule;

        } catch (error) {
            console.error('❌ 置換ルール追加エラー:', error);
            throw error;
        }
    }

    /**
     * 置換ルールを削除
     * @param {string} ruleId ルールID
     */
    removeReplacementRule(ruleId) {
        try {
            if (!this.currentConfig?.replacements) {
                return false;
            }

            const index = this.currentConfig.replacements.findIndex(rule => rule.id === ruleId);
            if (index === -1) {
                throw new Error(`置換ルールが見つかりません: ${ruleId}`);
            }

            const removedRule = this.currentConfig.replacements.splice(index, 1)[0];
            this.isModified = true;

            // 変更通知
            this._notifyChange('replacement-rule-removed', {
                rule: removedRule,
                config: this.currentConfig
            });

            console.log(`🗑️ 置換ルール削除: ${removedRule.from} → ${removedRule.to}`);
            return true;

        } catch (error) {
            console.error('❌ 置換ルール削除エラー:', error);
            throw error;
        }
    }

    /**
     * 置換ルールを更新
     * @param {string} ruleId ルールID
     * @param {Object} updates 更新内容
     */
    updateReplacementRule(ruleId, updates) {
        try {
            if (!this.currentConfig?.replacements) {
                throw new Error('置換ルールが設定されていません');
            }

            const rule = this.currentConfig.replacements.find(r => r.id === ruleId);
            if (!rule) {
                throw new Error(`置換ルールが見つかりません: ${ruleId}`);
            }

            const oldRule = { ...rule };
            Object.assign(rule, updates);
            this.isModified = true;

            // 変更通知
            this._notifyChange('replacement-rule-updated', {
                rule,
                oldRule,
                config: this.currentConfig
            });

            console.log(`🔧 置換ルール更新: ${ruleId}`);
            return rule;

        } catch (error) {
            console.error('❌ 置換ルール更新エラー:', error);
            throw error;
        }
    }

    /**
     * 設定をバリデーション
     */
    async validateConfig() {
        try {
            if (!this.currentConfig) {
                throw new Error('設定が初期化されていません');
            }

            if (!window.electronAPI?.configOperations) {
                throw new Error('Electron APIが利用できません');
            }

            const isValid = await window.electronAPI.configOperations.validateConfig(
                this.currentConfig
            );

            console.log(`🔍 設定バリデーション: ${isValid ? '✅ 有効' : '❌ 無効'}`);
            return isValid;

        } catch (error) {
            console.error('❌ 設定バリデーションエラー:', error);
            throw error;
        }
    }

    /**
     * 変更リスナーを追加
     * @param {Function} listener リスナー関数
     */
    addChangeListener(listener) {
        if (typeof listener === 'function') {
            this.changeListeners.push(listener);
            console.log('👂 設定変更リスナーを追加');
        }
    }

    /**
     * 変更リスナーを削除
     * @param {Function} listener リスナー関数
     */
    removeChangeListener(listener) {
        const index = this.changeListeners.indexOf(listener);
        if (index > -1) {
            this.changeListeners.splice(index, 1);
            console.log('🗑️ 設定変更リスナーを削除');
        }
    }

    /**
     * 設定変更の状態
     */
    getModificationStatus() {
        return {
            isModified: this.isModified,
            lastSavedPath: this.lastSavedPath,
            hasUnsavedChanges: this.isModified
        };
    }

    /**
     * 設定をリセット（デフォルトに戻す）
     */
    resetToDefault() {
        if (this.defaultConfig) {
            this.currentConfig = JSON.parse(JSON.stringify(this.defaultConfig));
            this.isModified = true;
            this.lastSavedPath = null;

            // 変更通知
            this._notifyChange('config-reset', {
                config: this.currentConfig
            });

            console.log('🔄 設定をデフォルトにリセット');
            return true;
        }
        return false;
    }

    /**
     * フォールバック設定を取得
     * @returns {Object} 最小限の設定
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
                window: { width: 800, height: 700, resizable: true, center: true },
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
     * 変更通知を送信
     * @param {string} eventType イベントタイプ
     * @param {Object} data データ
     * @private
     */
    _notifyChange(eventType, data) {
        const event = {
            type: eventType,
            timestamp: Date.now(),
            data
        };

        this.changeListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                console.error('❌ 変更リスナーエラー:', error);
            }
        });

        console.log(`📡 変更通知送信: ${eventType}`);
    }
}

// グローバルに公開
window.ConfigManager = ConfigManager;