/**
 * アプリケーション初期化 - Multi Grep Replacer
 * UIController と ReplacementUI の初期化・連携
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Multi Grep Replacer - Starting...');
    
    // 依存性チェック
    const requiredClasses = ['Utils', 'UIController', 'ReplacementUI'];
    const missingClasses = requiredClasses.filter(className => !window[className]);
    
    if (missingClasses.length > 0) {
        console.error('❌ 必要なクラスが見つかりません:', missingClasses);
        showStartupError(`必要なモジュールが読み込まれていません: ${missingClasses.join(', ')}`);
        return;
    }
    
    let uiController = null;
    let replacementUI = null;
    let apiClient = null;
    let configManager = null;
    
    try {
        // API Client の初期化
        if (window.initializeAPI) {
            try {
                apiClient = window.initializeAPI();
                console.log('✅ API Client 初期化成功');
                
                // アプリケーション情報の表示
                const appInfo = await apiClient.getAppInfo();
                console.log('📱 アプリケーション情報:', appInfo);
            } catch (error) {
                console.warn('⚠️ API Client 初期化に一部問題:', error.message);
                // API Client がなくても UI は動作可能
            }
        }

        // ConfigManagerの初期化
        if (window.ConfigManager) {
            try {
                configManager = new window.ConfigManager();
                await configManager.initialize();
                console.log('✅ ConfigManager初期化完了');
            } catch (error) {
                console.warn('⚠️ ConfigManager初期化エラー:', error);
            }
        }
        
        // ReplacementUI の初期化
        replacementUI = new window.ReplacementUI();
        console.log('✅ ReplacementUI 初期化完了');
        
        // UIController の初期化
        uiController = new window.UIController();
        console.log('✅ UIController 初期化完了');
        
        // ReplacementUI と UIController の連携設定
        replacementUI.onRulesChanged = (rules) => {
            // UIController にルール変更を通知
            uiController.rules = rules;
            uiController.updateExecuteButton();
            uiController.updatePreviewDebounced();
        };
        
        replacementUI.onTemplateSelected = (templateKey) => {
            console.log('テンプレート選択:', templateKey);
        };
        
        // UIController にAPI Client を設定
        if (apiClient) {
            uiController.apiClient = apiClient;
        }
        
        // UIController にConfigManager を設定
        if (configManager) {
            uiController.configManager = configManager;
        }
        
        // グローバルに参照を保存（デバッグ用）
        window.app = {
            uiController,
            replacementUI,
            apiClient,
            configManager
        };
        
        console.log('✅ Multi Grep Replacer - 初期化完了');
        
        // 初期化完了をユーザーに通知
        announceToScreenReader('Multi Grep Replacer が正常に起動しました');
        
    } catch (error) {
        console.error('❌ アプリケーション初期化エラー:', error);
        showStartupError(`アプリケーションの初期化に失敗しました: ${error.message}`);
        
        // クリーンアップ
        cleanup();
    }
    
    // ウィンドウ終了時のクリーンアップ
    window.addEventListener('beforeunload', cleanup);
    
    // エラーハンドリング
    window.addEventListener('error', (event) => {
        console.error('❌ グローバルエラー:', event.error);
        if (window.errorHandler?.handleError) {
            window.errorHandler.handleError({
                type: 'Runtime Error',
                message: event.error?.message || 'Unknown error',
                stack: event.error?.stack
            });
        }
    });
    
    // 未処理のPromise拒否をキャッチ
    window.addEventListener('unhandledrejection', (event) => {
        console.error('❌ 未処理のPromise拒否:', event.reason);
        if (window.errorHandler?.handleError) {
            window.errorHandler.handleError({
                type: 'Promise Rejection',
                message: event.reason?.message || 'Unhandled promise rejection',
                stack: event.reason?.stack
            });
        }
    });
    
    /**
     * スタートアップエラー表示
     */
    function showStartupError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--color-error, #e74c3c);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        errorDiv.innerHTML = `
            <h3 style="margin: 0 0 10px 0;">❌ 起動エラー</h3>
            <p style="margin: 0;">${Utils.escapeHtml ? Utils.escapeHtml(message) : message}</p>
        `;
        document.body.appendChild(errorDiv);
        
        // 5秒後に自動で閉じる
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
    }
    
    /**
     * スクリーンリーダーへのアナウンス
     */
    function announceToScreenReader(message) {
        const announcer = document.getElementById('globalAnnouncements');
        if (announcer) {
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * クリーンアップ処理
     */
    function cleanup() {
        try {
            if (uiController && uiController.destroy) {
                uiController.destroy();
            }
            if (replacementUI && replacementUI.destroy) {
                replacementUI.destroy();
            }
            if (configManager && configManager.destroy) {
                configManager.destroy();
            }
            console.log('✅ クリーンアップ完了');
        } catch (error) {
            console.error('❌ クリーンアップエラー:', error);
        }
    }
});

/**
 * デバッグ用ユーティリティ
 */
window.debug = {
    /**
     * 現在の状態をコンソールに出力
     */
    showState() {
        if (window.app) {
            console.log('=== アプリケーション状態 ===');
            console.log('UIController:', window.app.uiController);
            console.log('ReplacementUI:', window.app.replacementUI);
            console.log('現在のルール:', window.app.replacementUI?.rules);
            console.log('現在の設定:', window.app.uiController?.currentConfig);
            console.log('========================');
        }
    },
    
    /**
     * テスト用のサンプルルールを追加
     */
    addTestRules() {
        if (window.app?.replacementUI) {
            window.app.replacementUI.addRule('test-from-1', 'test-to-1', true, 'テストルール1');
            window.app.replacementUI.addRule('test-from-2', 'test-to-2', true, 'テストルール2');
            console.log('✅ テストルールを追加しました');
        }
    },
    
    /**
     * UI応答性テスト
     */
    testUIResponsiveness() {
        console.log('⚡ UI応答性テスト開始...');
        const startTime = performance.now();
        
        // ダミーのクリックイベントを発行
        const button = document.getElementById('addRuleBtn');
        if (button) {
            button.click();
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            console.log(`⚡ UI応答時間: ${responseTime.toFixed(2)}ms`);
            
            if (responseTime < 100) {
                console.log('✅ UI応答性: 良好 (100ms以内)');
            } else {
                console.log('⚠️ UI応答性: 要改善 (100ms超過)');
            }
        }
    }
};