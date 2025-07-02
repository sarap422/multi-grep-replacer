/**
 * Electron API クライアント
 * electronAPI呼び出しのラッパーとエラーハンドリング
 */
class APIClient {
    constructor() {
        // API の可用性チェック
        if (!window.electronAPI) {
            throw new Error('electronAPI が利用できません。preload.js が正しく読み込まれているか確認してください。');
        }

        // UI応答性のタイムアウト設定（100ms以内）
        this.UI_RESPONSE_TIMEOUT = 100;
        this.API_TIMEOUT = 30000; // 30秒

        console.log('🔗 API Client 初期化完了');
    }

    /**
     * UI応答性を保証するAPIラッパー
     * @param {Function} apiCall API呼び出し関数
     * @param {string} operationName 操作名
     * @returns {Promise} API結果
     * @private
     */
    async _callWithTimeout(apiCall, operationName) {
        const startTime = Date.now();

        try {
            // UI応答性確認（100ms以内）
            setTimeout(() => {
                const responseTime = Date.now() - startTime;
                if (responseTime > this.UI_RESPONSE_TIMEOUT) {
                    console.warn(`⚠️ UI応答性警告: ${operationName} - ${responseTime}ms`);
                }
            }, this.UI_RESPONSE_TIMEOUT);

            // API実行（タイムアウト付き）
            const result = await Promise.race([
                apiCall(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`API呼び出しタイムアウト: ${operationName}`)), this.API_TIMEOUT)
                )
            ]);

            const totalTime = Date.now() - startTime;
            console.log(`✅ ${operationName} 完了: ${totalTime}ms`);

            return result;

        } catch (error) {
            const errorTime = Date.now() - startTime;
            console.error(`❌ ${operationName} エラー (${errorTime}ms):`, error);
            throw new APIError(operationName, error.message, error);
        }
    }

    // ファイル操作API
    async selectFolder() {
        return this._callWithTimeout(
            () => window.electronAPI.fileOperations.selectFolder(),
            'フォルダ選択'
        );
    }

    async findFiles(directory, extensions) {
        return this._callWithTimeout(
            () => window.electronAPI.fileOperations.findFiles(directory, extensions),
            'ファイル検索'
        );
    }

    async readFile(path) {
        return this._callWithTimeout(
            () => window.electronAPI.fileOperations.readFile(path),
            'ファイル読み込み'
        );
    }

    async writeFile(path, content) {
        return this._callWithTimeout(
            () => window.electronAPI.fileOperations.writeFile(path, content),
            'ファイル書き込み'
        );
    }

    async getFileStats(files) {
        return this._callWithTimeout(
            () => window.electronAPI.fileOperations.getFileStats(files),
            'ファイル統計取得'
        );
    }

    // 置換処理API
    async executeReplacement(config) {
        return this._callWithTimeout(
            () => window.electronAPI.replacementOperations.executeReplacement(config),
            '置換実行'
        );
    }

    async cancelReplacement() {
        return this._callWithTimeout(
            () => window.electronAPI.replacementOperations.cancelReplacement(),
            '置換キャンセル'
        );
    }

    async generatePreview(config) {
        return this._callWithTimeout(
            () => window.electronAPI.replacementOperations.generatePreview(config),
            'プレビュー生成'
        );
    }

    async validateConfig(config) {
        return this._callWithTimeout(
            () => window.electronAPI.replacementOperations.validateConfig(config),
            '設定バリデーション'
        );
    }

    // 設定管理API
    async loadConfig(path) {
        return this._callWithTimeout(
            () => window.electronAPI.configOperations.loadConfig(path),
            '設定読み込み'
        );
    }

    async saveConfig(config, path) {
        return this._callWithTimeout(
            () => window.electronAPI.configOperations.saveConfig(config, path),
            '設定保存'
        );
    }

    async getDefaultConfig() {
        return this._callWithTimeout(
            () => window.electronAPI.configOperations.getDefaultConfig(),
            'デフォルト設定取得'
        );
    }

    async getRecentConfigs() {
        return this._callWithTimeout(
            () => window.electronAPI.configOperations.getRecentConfigs(),
            '最近使用した設定取得'
        );
    }

    // システム情報API
    async getAppInfo() {
        return this._callWithTimeout(
            () => window.electronAPI.systemOperations.getAppInfo(),
            'アプリケーション情報取得'
        );
    }

    async getProcessingStatus() {
        return this._callWithTimeout(
            () => window.electronAPI.systemOperations.getProcessingStatus(),
            '処理状態取得'
        );
    }

    // イベントリスナー登録
    onProgress(callback) {
        if (typeof callback !== 'function') {
            throw new Error('コールバック関数が必要です');
        }
        window.electronAPI.onProgress(callback);
        console.log('📊 進捗通知リスナー登録完了');
    }

    onError(callback) {
        if (typeof callback !== 'function') {
            throw new Error('コールバック関数が必要です');
        }
        window.electronAPI.onError(callback);
        console.log('🚨 エラー通知リスナー登録完了');
    }

    onComplete(callback) {
        if (typeof callback !== 'function') {
            throw new Error('コールバック関数が必要です');
        }
        window.electronAPI.onComplete(callback);
        console.log('✅ 完了通知リスナー登録完了');
    }

    // バッチ処理用ヘルパー
    async processBatch(operations, progressCallback) {
        console.log(`🔄 バッチ処理開始: ${operations.length}件`);
        
        const results = [];
        for (let i = 0; i < operations.length; i++) {
            const operation = operations[i];
            
            try {
                const result = await operation();
                results.push({ success: true, result });
                
                if (progressCallback) {
                    progressCallback(i + 1, operations.length, result);
                }
                
            } catch (error) {
                results.push({ success: false, error: error.message });
                console.error(`❌ バッチ処理エラー [${i}]:`, error);
            }
        }
        
        console.log(`✅ バッチ処理完了: 成功 ${results.filter(r => r.success).length}件`);
        return results;
    }

    // API可用性チェック
    checkAPIAvailability() {
        const apis = [
            'fileOperations',
            'replacementOperations', 
            'configOperations',
            'systemOperations'
        ];

        const availableAPIs = [];
        const unavailableAPIs = [];

        apis.forEach(api => {
            if (window.electronAPI && window.electronAPI[api]) {
                availableAPIs.push(api);
            } else {
                unavailableAPIs.push(api);
            }
        });

        console.log('🔍 API可用性チェック:');
        console.log(`  利用可能: ${availableAPIs.join(', ')}`);
        if (unavailableAPIs.length > 0) {
            console.warn(`  利用不可: ${unavailableAPIs.join(', ')}`);
        }

        return {
            available: availableAPIs,
            unavailable: unavailableAPIs,
            allAvailable: unavailableAPIs.length === 0
        };
    }
}

/**
 * API呼び出しエラークラス
 */
class APIError extends Error {
    constructor(operation, message, originalError) {
        super(`${operation}: ${message}`);
        this.name = 'APIError';
        this.operation = operation;
        this.originalError = originalError;
        this.timestamp = Date.now();
    }

    getErrorDetails() {
        return {
            operation: this.operation,
            message: this.message,
            timestamp: this.timestamp,
            originalError: this.originalError
        };
    }
}

// グローバルAPIクライアントのインスタンス
let apiClient = null;

// API初期化関数
function initializeAPI() {
    try {
        apiClient = new APIClient();
        console.log('🚀 API Client 初期化成功');
        return apiClient;
    } catch (error) {
        console.error('❌ API Client 初期化失敗:', error);
        throw error;
    }
}

// グローバルアクセス用
window.getAPIClient = () => {
    if (!apiClient) {
        throw new Error('API Client が初期化されていません。initializeAPI() を先に呼び出してください。');
    }
    return apiClient;
};

console.log('📦 API Client モジュール読み込み完了');