/**
 * 進捗表示クラス - Multi Grep Replacer
 * 実行進捗のリアルタイム表示・UI応答性重視
 */

class ProgressDisplay {
    constructor(container = document.body) {
        this.container = container;
        this.dialog = null;
        this.isVisible = false;
        this.isPaused = false;
        this.startTime = null;
        this.currentStats = {
            current: 0,
            total: 0,
            currentFile: '',
            changesCount: 0,
            speed: 0
        };
        
        // パフォーマンス最適化用
        this.updateThrottle = null;
        this.lastUpdateTime = 0;
        
        this.createDialog();
        this.bindEvents();
        
        console.log('✅ ProgressDisplay初期化完了');
    }
    
    /**
     * ダイアログのDOM構造を作成
     */
    createDialog() {
        this.dialog = document.createElement('div');
        this.dialog.className = 'progress-dialog';
        this.dialog.id = 'progressDialog';
        this.dialog.setAttribute('role', 'dialog');
        this.dialog.setAttribute('aria-modal', 'true');
        this.dialog.setAttribute('aria-labelledby', 'progressTitle');
        
        this.dialog.innerHTML = `
            <div class="dialog-content">
                <div class="progress-header">
                    <h3 id="progressTitle">🚀 置換実行中...</h3>
                    <button class="close-btn" id="minimizeProgress" 
                            aria-label="進捗表示を最小化">−</button>
                </div>
                
                <div class="progress-body">
                    <div class="progress-bar-container">
                        <div class="progress-bar" role="progressbar" 
                             aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
                            <div class="progress-fill" style="width: 0%"></div>
                        </div>
                        <div class="progress-text">0% (0/0 files)</div>
                    </div>
                    
                    <div class="current-file">
                        <p>📄 Currently processing:</p>
                        <code id="currentFileName" aria-live="polite"></code>
                    </div>
                    
                    <div class="progress-stats">
                        <div class="stat">
                            <span class="label">⏱️ Elapsed:</span>
                            <span class="value" id="elapsedTime">00:00</span>
                        </div>
                        <div class="stat">
                            <span class="label">📊 Changes made:</span>
                            <span class="value" id="changesCount">0</span>
                        </div>
                        <div class="stat">
                            <span class="label">🚀 Speed:</span>
                            <span class="value" id="processingSpeed">0 files/sec</span>
                        </div>
                    </div>
                </div>
                
                <div class="progress-controls">
                    <button class="btn-secondary" id="pauseExecution">
                        ⏸️ Pause
                    </button>
                    <button class="btn-danger" id="stopExecution">
                        ⏹️ Stop
                    </button>
                </div>
            </div>
            
            <!-- スクリーンリーダー用のライブリージョン -->
            <div class="sr-only" aria-live="polite" id="progressAnnouncements"></div>
        `;
        
        this.container.appendChild(this.dialog);
        
        // 要素参照をキャッシュ（パフォーマンス最適化）
        this.elements = {
            progressFill: this.dialog.querySelector('.progress-fill'),
            progressText: this.dialog.querySelector('.progress-text'),
            progressBar: this.dialog.querySelector('.progress-bar'),
            currentFile: this.dialog.querySelector('#currentFileName'),
            elapsedTime: this.dialog.querySelector('#elapsedTime'),
            changesCount: this.dialog.querySelector('#changesCount'),
            processingSpeed: this.dialog.querySelector('#processingSpeed'),
            pauseBtn: this.dialog.querySelector('#pauseExecution'),
            stopBtn: this.dialog.querySelector('#stopExecution'),
            minimizeBtn: this.dialog.querySelector('#minimizeProgress'),
            announcements: this.dialog.querySelector('#progressAnnouncements')
        };
    }
    
    /**
     * イベントリスナーの設定
     */
    bindEvents() {
        // 最小化ボタン
        this.elements.minimizeBtn.addEventListener('click', () => {
            this.minimize();
        });
        
        // 一時停止ボタン
        this.elements.pauseBtn.addEventListener('click', () => {
            this.togglePause();
        });
        
        // 停止ボタン
        this.elements.stopBtn.addEventListener('click', () => {
            this.showStopConfirmation();
        });
        
        // ESCキーで最小化
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.minimize();
            }
        });
        
        // ダイアログ外クリックで最小化
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.minimize();
            }
        });
    }
    
    /**
     * 進捗表示を開始
     * @param {number} totalFiles - 総ファイル数
     * @param {Object} options - オプション設定
     */
    startProgress(totalFiles, options = {}) {
        this.currentStats = {
            current: 0,
            total: totalFiles,
            currentFile: '',
            changesCount: 0,
            speed: 0
        };
        
        this.startTime = Date.now();
        this.isPaused = false;
        
        // UI更新
        this.elements.progressFill.style.width = '0%';
        this.elements.progressText.textContent = `0% (0/${totalFiles} files)`;
        this.elements.progressBar.setAttribute('aria-valuenow', '0');
        this.elements.progressBar.setAttribute('aria-valuemax', '100');
        this.elements.currentFile.textContent = 'Initializing...';
        this.elements.elapsedTime.textContent = '00:00';
        this.elements.changesCount.textContent = '0';
        this.elements.processingSpeed.textContent = '0 files/sec';
        
        // 一時停止状態をリセット
        this.dialog.classList.remove('paused');
        this.elements.pauseBtn.innerHTML = '⏸️ Pause';
        
        this.show();
        
        // アクセシビリティ通知
        this.announce(`置換処理を開始しました。${totalFiles}個のファイルを処理します。`);
        
        console.log(`📊 進捗表示開始: ${totalFiles}ファイル`);
    }
    
    /**
     * 進捗を更新（スロットリング付き）
     * @param {number} current - 現在の処理数
     * @param {number} total - 総数
     * @param {string} currentFile - 現在処理中のファイル
     * @param {Object} stats - 追加統計情報
     */
    updateProgress(current, total, currentFile = '', stats = {}) {
        const now = performance.now();
        
        // 100ms以内の更新はスキップ（UI応答性確保）
        if (now - this.lastUpdateTime < 100) {
            return;
        }
        
        this.lastUpdateTime = now;
        this.currentStats = {
            current,
            total,
            currentFile,
            changesCount: stats.changesCount || this.currentStats.changesCount,
            speed: this.calculateSpeed(current)
        };
        
        // 非同期でUI更新（メインスレッドをブロックしない）
        requestAnimationFrame(() => {
            this.updateUI();
        });
    }
    
    /**
     * UI要素を更新
     */
    updateUI() {
        if (!this.isVisible) return;
        
        const { current, total, currentFile, changesCount, speed } = this.currentStats;
        const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
        
        // 進捗バー更新
        this.elements.progressFill.style.width = `${percentage}%`;
        this.elements.progressText.textContent = `${percentage}% (${current}/${total} files)`;
        this.elements.progressBar.setAttribute('aria-valuenow', percentage.toString());
        
        // 現在のファイル更新
        if (currentFile && currentFile !== this.elements.currentFile.textContent) {
            this.elements.currentFile.textContent = this.truncateFilePath(currentFile);
        }
        
        // 統計情報更新
        this.elements.elapsedTime.textContent = this.formatElapsedTime();
        this.elements.changesCount.textContent = changesCount.toString();
        this.elements.processingSpeed.textContent = `${speed.toFixed(1)} files/sec`;
        
        // 25%、50%、75%、100%で進捗をアナウンス
        if (percentage > 0 && percentage % 25 === 0) {
            const lastAnnounced = this.elements.announcements.dataset.lastPercentage;
            if (lastAnnounced !== percentage.toString()) {
                this.announce(`進捗: ${percentage}%完了`);
                this.elements.announcements.dataset.lastPercentage = percentage.toString();
            }
        }
    }
    
    /**
     * 処理速度を計算
     * @param {number} current - 現在の処理数
     * @returns {number} ファイル/秒
     */
    calculateSpeed(current) {
        if (!this.startTime || current === 0) return 0;
        
        const elapsedSeconds = (Date.now() - this.startTime) / 1000;
        return elapsedSeconds > 0 ? current / elapsedSeconds : 0;
    }
    
    /**
     * 経過時間をフォーマット
     * @returns {string} MM:SS形式
     */
    formatElapsedTime() {
        if (!this.startTime) return '00:00';
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * ファイルパスを表示用に短縮
     * @param {string} filePath - ファイルパス
     * @returns {string} 短縮されたパス
     */
    truncateFilePath(filePath, maxLength = 60) {
        if (filePath.length <= maxLength) return filePath;
        
        const parts = filePath.split('/');
        if (parts.length <= 2) return filePath;
        
        // 最初と最後の部分を保持して中間を省略
        const start = parts[0];
        const end = parts[parts.length - 1];
        return `${start}/.../${end}`;
    }
    
    /**
     * 一時停止状態を切り替え
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        if (this.isPaused) {
            this.dialog.classList.add('paused');
            this.elements.pauseBtn.innerHTML = '▶️ Resume';
            this.announce('処理を一時停止しました');
            
            // 一時停止メッセージを表示
            this.showPauseMessage();
        } else {
            this.dialog.classList.remove('paused');
            this.elements.pauseBtn.innerHTML = '⏸️ Pause';
            this.announce('処理を再開しました');
            
            // 一時停止メッセージを非表示
            this.hidePauseMessage();
        }
        
        // 一時停止イベントを発火
        this.dispatchEvent('pause', { isPaused: this.isPaused });
    }
    
    /**
     * 一時停止メッセージを表示
     */
    showPauseMessage() {
        const existing = this.dialog.querySelector('.pause-message');
        if (existing) return;
        
        const message = document.createElement('div');
        message.className = 'pause-message';
        message.innerHTML = '<p>⏸️ 処理が一時停止されています</p>';
        
        const progressBody = this.dialog.querySelector('.progress-body');
        progressBody.appendChild(message);
    }
    
    /**
     * 一時停止メッセージを非表示
     */
    hidePauseMessage() {
        const message = this.dialog.querySelector('.pause-message');
        if (message) {
            message.remove();
        }
    }
    
    /**
     * 停止確認ダイアログを表示
     */
    async showStopConfirmation() {
        const confirmed = await this.showConfirmDialog(
            '処理を停止しますか？',
            '現在の処理を中断して停止します。この操作は元に戻せません。',
            '⏹️ 停止',
            'btn-danger'
        );
        
        if (confirmed) {
            this.announce('処理を停止しました');
            this.dispatchEvent('stop');
        }
    }
    
    /**
     * 完了状態を表示
     * @param {Object} results - 処理結果
     */
    showComplete(results) {
        this.dialog.classList.add('completed');
        
        // ヘッダーを完了状態に更新
        const header = this.dialog.querySelector('.progress-header h3');
        header.innerHTML = '✅ 置換完了!';
        
        // コントロールボタンを完了状態に更新
        const controls = this.dialog.querySelector('.progress-controls');
        controls.innerHTML = `
            <button class="btn-primary" id="viewResults">
                📊 結果を表示
            </button>
            <button class="btn-secondary" id="closeProgress">
                ✅ 閉じる
            </button>
        `;
        
        // 新しいボタンのイベントリスナーを設定
        const viewResultsBtn = controls.querySelector('#viewResults');
        const closeBtn = controls.querySelector('#closeProgress');
        
        viewResultsBtn.addEventListener('click', () => {
            this.dispatchEvent('showResults', results);
        });
        
        closeBtn.addEventListener('click', () => {
            this.hide();
        });
        
        // 完了をアナウンス
        const { modifiedFiles, totalChanges, executionTime } = results;
        this.announce(`置換処理が完了しました。${modifiedFiles}個のファイルで${totalChanges}箇所の変更を行いました。`);
        
        console.log('✅ 進捗表示: 完了状態に移行');
    }
    
    /**
     * エラー状態を表示
     * @param {Error|string} error - エラー情報
     */
    showError(error) {
        this.dialog.classList.add('error');
        
        // ヘッダーをエラー状態に更新
        const header = this.dialog.querySelector('.progress-header h3');
        header.innerHTML = '❌ エラーが発生しました';
        
        // エラーメッセージを表示
        const progressBody = this.dialog.querySelector('.progress-body');
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.innerHTML = `
            <div style="background: var(--color-error-bg); border: 1px solid var(--color-error); 
                        border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 0; color: var(--color-error-text); font-weight: 600;">
                    ${typeof error === 'string' ? error : error.message}
                </p>
            </div>
        `;
        progressBody.appendChild(errorMessage);
        
        // コントロールボタンをエラー状態に更新
        const controls = this.dialog.querySelector('.progress-controls');
        controls.innerHTML = `
            <button class="btn-secondary" id="retryExecution">
                🔄 再試行
            </button>
            <button class="btn-danger" id="closeError">
                ✅ 閉じる
            </button>
        `;
        
        // エラーをアナウンス
        this.announce('エラーが発生して処理が中断されました');
        
        console.error('❌ 進捗表示: エラー状態', error);
    }
    
    /**
     * ダイアログを表示
     */
    show() {
        this.isVisible = true;
        this.dialog.classList.add('show');
        
        // フォーカス管理
        setTimeout(() => {
            const firstButton = this.dialog.querySelector('button');
            if (firstButton) firstButton.focus();
        }, 100);
    }
    
    /**
     * ダイアログを非表示
     */
    hide() {
        this.isVisible = false;
        this.dialog.classList.remove('show');
        
        // 状態をリセット
        setTimeout(() => {
            this.dialog.classList.remove('completed', 'error', 'paused');
            this.hidePauseMessage();
            
            // エラーメッセージを削除
            const errorMessage = this.dialog.querySelector('.error-message');
            if (errorMessage) errorMessage.remove();
        }, 300);
    }
    
    /**
     * ダイアログを最小化
     */
    minimize() {
        this.hide();
        this.dispatchEvent('minimize');
    }
    
    /**
     * 確認ダイアログを表示
     */
    async showConfirmDialog(title, message, confirmText, confirmClass = 'btn-primary') {
        return new Promise((resolve) => {
            const confirmDialog = document.createElement('div');
            confirmDialog.className = 'execution-dialog show';
            confirmDialog.innerHTML = `
                <div class="dialog-content">
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <div class="dialog-buttons">
                        <button class="btn-secondary" data-action="cancel">キャンセル</button>
                        <button class="${confirmClass}" data-action="confirm">${confirmText}</button>
                    </div>
                </div>
            `;
            
            const handleClick = (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    confirmDialog.remove();
                    resolve(action === 'confirm');
                }
            };
            
            confirmDialog.addEventListener('click', handleClick);
            document.body.appendChild(confirmDialog);
            
            // 確認ボタンにフォーカス
            setTimeout(() => {
                const confirmBtn = confirmDialog.querySelector('[data-action="confirm"]');
                if (confirmBtn) confirmBtn.focus();
            }, 100);
        });
    }
    
    /**
     * スクリーンリーダーにアナウンス
     * @param {string} message - アナウンスメッセージ
     */
    announce(message) {
        if (this.elements.announcements) {
            this.elements.announcements.textContent = message;
            
            // 1秒後にクリア
            setTimeout(() => {
                this.elements.announcements.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * カスタムイベントを発火
     * @param {string} eventName - イベント名
     * @param {*} detail - イベントデータ
     */
    dispatchEvent(eventName, detail = null) {
        const event = new CustomEvent(`progress-${eventName}`, { detail });
        this.dialog.dispatchEvent(event);
    }
    
    /**
     * 現在の状態を取得
     * @returns {Object} 現在の状態
     */
    getState() {
        return {
            isVisible: this.isVisible,
            isPaused: this.isPaused,
            stats: { ...this.currentStats },
            startTime: this.startTime
        };
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
        }
        
        if (this.updateThrottle) {
            clearTimeout(this.updateThrottle);
        }
        
        console.log('🗑️ ProgressDisplay破棄完了');
    }
}

// グローバルに登録
window.ProgressDisplay = ProgressDisplay;