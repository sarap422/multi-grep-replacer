/**
 * フロントエンド エラーハンドリングシステム
 * ユーザーフレンドリーなエラー表示とエラー回復ガイダンス
 */
class ErrorHandler {
    constructor() {
        this.errorContainer = null;
        this.notificationContainer = null;
        this.errorHistory = [];
        this.maxErrorHistory = 50;
        
        this.initialize();
        console.log('🚨 エラーハンドラー初期化完了');
    }

    initialize() {
        // エラー表示用コンテナを作成
        this.createErrorContainers();
        
        // グローバルエラーハンドラーを設定
        this.setupGlobalErrorHandlers();
        
        // 既存のコンソールエラーをキャッチ
        this.interceptConsoleErrors();
    }

    createErrorContainers() {
        // メインエラー表示エリア
        this.errorContainer = document.createElement('div');
        this.errorContainer.id = 'error-container';
        this.errorContainer.className = 'error-container hidden';
        this.errorContainer.innerHTML = `
            <div class="error-header">
                <span class="error-icon">⚠️</span>
                <span class="error-title">エラーが発生しました</span>
                <button class="error-close" onclick="window.errorHandler.hideError()">&times;</button>
            </div>
            <div class="error-body">
                <div class="error-message"></div>
                <div class="error-details hidden"></div>
                <div class="error-suggestions"></div>
            </div>
            <div class="error-actions">
                <button class="btn-secondary" onclick="window.errorHandler.toggleDetails()">詳細を表示</button>
                <button class="btn-primary" onclick="window.errorHandler.hideError()">OK</button>
            </div>
        `;

        // 通知表示エリア
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.id = 'notification-container';
        this.notificationContainer.className = 'notification-container';

        // DOM に追加
        document.body.appendChild(this.errorContainer);
        document.body.appendChild(this.notificationContainer);
    }

    setupGlobalErrorHandlers() {
        // JavaScript エラー
        window.addEventListener('error', (event) => {
            this.handleError({
                type: 'JavaScript Error',
                message: event.message,
                file: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error
            });
        });

        // Promise rejection
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError({
                type: 'Unhandled Promise Rejection',
                message: event.reason?.message || String(event.reason),
                error: event.reason
            });
        });
    }

    interceptConsoleErrors() {
        const originalError = console.error;
        console.error = (...args) => {
            // 元のconsole.errorを実行
            originalError.apply(console, args);
            
            // エラーハンドラーで処理
            if (args[0] && typeof args[0] === 'string' && args[0].includes('❌')) {
                this.handleError({
                    type: 'Console Error',
                    message: args.join(' ')
                });
            }
        };
    }

    /**
     * エラーを処理する
     * @param {Object} errorInfo エラー情報
     */
    handleError(errorInfo) {
        // エラー履歴に記録
        this.addToHistory(errorInfo);

        // エラータイプに応じて処理
        const processedError = this.processError(errorInfo);
        
        // エラー表示
        this.displayError(processedError);

        console.error('🚨 エラーハンドラーでキャッチ:', errorInfo);
    }

    addToHistory(errorInfo) {
        this.errorHistory.unshift({
            ...errorInfo,
            timestamp: Date.now(),
            id: Date.now().toString(36) + Math.random().toString(36).substr(2)
        });

        // 履歴の上限を維持
        if (this.errorHistory.length > this.maxErrorHistory) {
            this.errorHistory = this.errorHistory.slice(0, this.maxErrorHistory);
        }
    }

    processError(errorInfo) {
        const processed = {
            type: errorInfo.type || 'Error',
            userMessage: '',
            technicalMessage: errorInfo.message || '',
            suggestions: [],
            severity: 'error',
            canRetry: false
        };

        // エラータイプ別の処理
        switch (true) {
            case errorInfo.message?.includes('electronAPI が利用できません'):
                processed.userMessage = 'アプリケーションの初期化に失敗しました';
                processed.suggestions = [
                    'アプリケーションを再起動してください',
                    'それでも解決しない場合は、アプリケーションを再インストールしてください'
                ];
                processed.severity = 'critical';
                break;

            case errorInfo.message?.includes('フォルダ選択'):
                processed.userMessage = 'フォルダの選択中にエラーが発生しました';
                processed.suggestions = [
                    'フォルダが存在することを確認してください',
                    'フォルダへのアクセス権限があることを確認してください',
                    '再度フォルダを選択してください'
                ];
                processed.canRetry = true;
                break;

            case errorInfo.message?.includes('ファイル'):
                processed.userMessage = 'ファイル操作中にエラーが発生しました';
                processed.suggestions = [
                    'ファイルが他のアプリケーションで使用されていないか確認してください',
                    'ファイルへの読み書き権限があることを確認してください',
                    'ディスクの空き容量が十分にあることを確認してください'
                ];
                processed.canRetry = true;
                break;

            case errorInfo.message?.includes('置換'):
                processed.userMessage = '置換処理中にエラーが発生しました';
                processed.suggestions = [
                    '置換ルールの設定を確認してください',
                    '対象ファイルが正しく指定されているか確認してください',
                    '一時的にルールを減らして実行してみてください'
                ];
                processed.canRetry = true;
                break;

            case errorInfo.message?.includes('設定'):
                processed.userMessage = '設定の処理中にエラーが発生しました';
                processed.suggestions = [
                    '設定ファイルの形式が正しいか確認してください',
                    'デフォルト設定をリロードしてみてください',
                    '設定ファイルを手動で編集した場合は、構文エラーがないか確認してください'
                ];
                processed.canRetry = true;
                break;

            case errorInfo.message?.includes('タイムアウト'):
                processed.userMessage = '処理がタイムアウトしました';
                processed.suggestions = [
                    'インターネット接続を確認してください',
                    'ファイル数を減らして再実行してください',
                    'しばらく待ってから再度お試しください'
                ];
                processed.canRetry = true;
                break;

            default:
                processed.userMessage = '予期しないエラーが発生しました';
                processed.suggestions = [
                    'アプリケーションを再起動してください',
                    '問題が解決しない場合は、サポートにお問い合わせください'
                ];
                break;
        }

        return processed;
    }

    displayError(errorInfo) {
        // エラーメッセージを設定
        const messageEl = this.errorContainer.querySelector('.error-message');
        messageEl.textContent = errorInfo.userMessage;

        // 技術的詳細を設定
        const detailsEl = this.errorContainer.querySelector('.error-details');
        detailsEl.textContent = errorInfo.technicalMessage;

        // 提案を設定
        const suggestionsEl = this.errorContainer.querySelector('.error-suggestions');
        if (errorInfo.suggestions.length > 0) {
            suggestionsEl.innerHTML = `
                <h4>解決方法:</h4>
                <ul>
                    ${errorInfo.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            `;
        } else {
            suggestionsEl.innerHTML = '';
        }

        // 重要度に応じてスタイルを設定
        this.errorContainer.className = `error-container ${errorInfo.severity}`;

        // 再試行ボタンの表示制御
        const actionsEl = this.errorContainer.querySelector('.error-actions');
        if (errorInfo.canRetry) {
            const retryBtn = actionsEl.querySelector('.btn-retry') || document.createElement('button');
            retryBtn.className = 'btn-primary btn-retry';
            retryBtn.textContent = '再試行';
            retryBtn.onclick = () => {
                this.hideError();
                window.dispatchEvent(new CustomEvent('retry-last-operation'));
            };
            actionsEl.insertBefore(retryBtn, actionsEl.firstChild);
        }

        // エラーを表示
        this.errorContainer.classList.remove('hidden');

        // 自動非表示（重大でないエラーの場合）
        if (errorInfo.severity !== 'critical') {
            setTimeout(() => {
                if (!this.errorContainer.classList.contains('hidden')) {
                    this.hideError();
                }
            }, 10000); // 10秒後に自動非表示
        }
    }

    /**
     * 通知を表示する（エラーでない情報表示用）
     * @param {string} message メッセージ
     * @param {string} type タイプ（success, info, warning）
     * @param {number} duration 表示時間（ミリ秒）
     */
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <span class="notification-icon">${this.getNotificationIcon(type)}</span>
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
        `;

        this.notificationContainer.appendChild(notification);

        // 自動削除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, duration);

        // アニメーション
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }

    getNotificationIcon(type) {
        const icons = {
            success: '✅',
            info: 'ℹ️',
            warning: '⚠️',
            error: '❌'
        };
        return icons[type] || icons.info;
    }

    hideError() {
        this.errorContainer.classList.add('hidden');
    }

    toggleDetails() {
        const detailsEl = this.errorContainer.querySelector('.error-details');
        const btn = this.errorContainer.querySelector('.error-actions button');
        
        if (detailsEl.classList.contains('hidden')) {
            detailsEl.classList.remove('hidden');
            btn.textContent = '詳細を隠す';
        } else {
            detailsEl.classList.add('hidden');
            btn.textContent = '詳細を表示';
        }
    }

    /**
     * エラー履歴を取得
     * @returns {Array} エラー履歴
     */
    getErrorHistory() {
        return [...this.errorHistory];
    }

    /**
     * エラー履歴をクリア
     */
    clearErrorHistory() {
        this.errorHistory = [];
        console.log('🧹 エラー履歴をクリアしました');
    }

    /**
     * エラー統計を取得
     * @returns {Object} エラー統計
     */
    getErrorStatistics() {
        const stats = {
            total: this.errorHistory.length,
            byType: {},
            bySeverity: {},
            recent: this.errorHistory.slice(0, 10)
        };

        this.errorHistory.forEach(error => {
            // タイプ別集計
            const type = error.type || 'Unknown';
            stats.byType[type] = (stats.byType[type] || 0) + 1;

            // 重要度別集計（おおまかな推定）
            let severity = 'info';
            if (error.message?.includes('critical') || error.message?.includes('fatal')) {
                severity = 'critical';
            } else if (error.message?.includes('error') || error.message?.includes('❌')) {
                severity = 'error';
            } else if (error.message?.includes('warn')) {
                severity = 'warning';
            }
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
        });

        return stats;
    }
}

// CSS スタイルを動的に追加
function addErrorHandlerStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .error-container {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            border: 2px solid #dc3545;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            max-width: 500px;
            min-width: 300px;
            z-index: 10000;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .error-container.hidden {
            display: none;
        }

        .error-container.critical {
            border-color: #dc3545;
            animation: shake 0.5s ease-in-out;
        }

        .error-header {
            background: #dc3545;
            color: white;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .error-title {
            flex: 1;
            font-weight: 600;
        }

        .error-close {
            background: none;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            width: 24px;
            height: 24px;
        }

        .error-body {
            padding: 16px;
        }

        .error-message {
            font-size: 16px;
            margin-bottom: 12px;
            color: #333;
        }

        .error-details {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            padding: 8px;
            font-family: monospace;
            font-size: 12px;
            color: #666;
            margin-bottom: 12px;
            max-height: 100px;
            overflow-y: auto;
        }

        .error-suggestions h4 {
            margin: 0 0 8px 0;
            font-size: 14px;
            color: #495057;
        }

        .error-suggestions ul {
            margin: 0;
            padding-left: 20px;
        }

        .error-suggestions li {
            margin-bottom: 4px;
            font-size: 14px;
            color: #6c757d;
        }

        .error-actions {
            padding: 12px 16px;
            border-top: 1px solid #dee2e6;
            display: flex;
            gap: 8px;
            justify-content: flex-end;
        }

        .btn-primary, .btn-secondary {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }

        .btn-primary {
            background: #007bff;
            color: white;
        }

        .btn-secondary {
            background: #6c757d;
            color: white;
        }

        .notification-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .notification {
            background: white;
            border-left: 4px solid #007bff;
            border-radius: 4px;
            padding: 12px 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            gap: 8px;
            max-width: 350px;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        }

        .notification.show {
            transform: translateX(0);
        }

        .notification.success { border-left-color: #28a745; }
        .notification.warning { border-left-color: #ffc107; }
        .notification.error { border-left-color: #dc3545; }

        .notification-message {
            flex: 1;
            font-size: 14px;
        }

        .notification-close {
            background: none;
            border: none;
            font-size: 16px;
            cursor: pointer;
            padding: 0;
            width: 20px;
            height: 20px;
        }

        @keyframes shake {
            0%, 100% { transform: translate(-50%, -50%) translateX(0); }
            25% { transform: translate(-50%, -50%) translateX(-5px); }
            75% { transform: translate(-50%, -50%) translateX(5px); }
        }
    `;
    document.head.appendChild(style);
}

// グローバルエラーハンドラーの初期化
function initializeErrorHandler() {
    addErrorHandlerStyles();
    const errorHandler = new ErrorHandler();
    window.errorHandler = errorHandler;
    console.log('🚨 エラーハンドラー初期化完了');
    return errorHandler;
}

// DOMContentLoaded で自動初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeErrorHandler);
} else {
    initializeErrorHandler();
}

console.log('📦 エラーハンドラーモジュール読み込み完了');