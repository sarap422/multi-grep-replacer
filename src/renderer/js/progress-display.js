/**
 * 進捗表示・結果表示コンポーネント - Multi Grep Replacer
 * リアルタイム進捗・結果管理・エクスポート機能
 */

class ProgressDisplay {
    constructor() {
        this.isVisible = false;
        this.currentProgress = 0;
        this.totalFiles = 0;
        this.processedFiles = 0;
        this.currentFile = '';
        this.results = null;
        this.startTime = null;
        
        // コールバック関数
        this.onCancel = null;
        this.onPause = null;
        this.onResume = null;
        
        // DOM要素への参照
        this.elements = {};
        
        // イベントリスナーのAbortController
        this.abortController = new AbortController();
        
        // アニメーションフレーム制御
        this.animationFrame = null;
        
        // 初期化
        this.initialize();
    }
    
    /**
     * 初期化
     */
    initialize() {
        console.log('ProgressDisplay: Initializing...');
        
        // DOM要素のキャッシュ
        this.cacheElements();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        console.log('ProgressDisplay: Initialization complete');
    }
    
    /**
     * DOM要素キャッシュ
     */
    cacheElements() {
        this.elements = {
            // 進捗モーダル
            progressModal: document.getElementById('progressModal'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            currentFile: document.getElementById('currentFile'),
            pauseBtn: document.getElementById('pauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            
            // 結果モーダル
            resultModal: document.getElementById('resultModal'),
            resultSummary: document.getElementById('resultSummary'),
            resultDetails: document.getElementById('resultDetails'),
            exportResultsBtn: document.getElementById('exportResultsBtn'),
            copySummaryBtn: document.getElementById('copySummaryBtn'),
            closeResultBtn: document.getElementById('closeResultBtn'),
            
            // その他
            body: document.body
        };
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        const signal = this.abortController.signal;
        
        // 進捗モーダルボタン
        this.elements.pauseBtn?.addEventListener('click', 
            this.handlePauseClick.bind(this), { signal });
        this.elements.stopBtn?.addEventListener('click', 
            this.handleStopClick.bind(this), { signal });
        
        // 結果モーダルボタン
        this.elements.exportResultsBtn?.addEventListener('click', 
            this.handleExportClick.bind(this), { signal });
        this.elements.copySummaryBtn?.addEventListener('click', 
            this.handleCopyClick.bind(this), { signal });
        this.elements.closeResultBtn?.addEventListener('click', 
            this.handleCloseResultClick.bind(this), { signal });
        
        // モーダルクローズボタン
        const closeButtons = document.querySelectorAll('[data-close-result-modal]');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', this.handleCloseResultClick.bind(this), { signal });
        });
        
        // Escキーでモーダルクローズ
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (this.isProgressVisible()) {
                    this.handleStopClick();
                } else if (this.isResultVisible()) {
                    this.handleCloseResultClick();
                }
            }
        }, { signal });
    }
    
    /**
     * 進捗表示開始
     */
    startProgress(totalFiles, options = {}) {
        this.totalFiles = totalFiles;
        this.processedFiles = 0;
        this.currentProgress = 0;
        this.currentFile = options.initialMessage || 'Preparing...';
        this.startTime = Date.now();
        
        // 進捗モーダル表示
        this.showProgressModal();
        
        // 初期状態更新
        this.updateProgressDisplay();
        
        // アクセシビリティアナウンス
        this.announceToScreenReader(`置換処理を開始しました。対象ファイル数: ${totalFiles}`);
        
        console.log(`Progress started: ${totalFiles} files`);
    }
    
    /**
     * 進捗更新
     */
    updateProgress(processedFiles, currentFile = '', additionalInfo = {}) {
        this.processedFiles = processedFiles;
        this.currentFile = currentFile;
        this.currentProgress = this.totalFiles > 0 ? (processedFiles / this.totalFiles) * 100 : 0;
        
        // 進捗表示更新（フレーム制御で滑らかに）
        this.requestProgressUpdate();
        
        // 定期的なアクセシビリティアナウンス（10%刻み）
        const progressPercent = Math.floor(this.currentProgress);
        if (progressPercent % 10 === 0 && progressPercent !== this.lastAnnouncedProgress) {
            this.announceToScreenReader(`進捗 ${progressPercent}% 完了`);
            this.lastAnnouncedProgress = progressPercent;
        }
    }
    
    /**
     * 進捗表示完了
     */
    completeProgress(results) {
        this.results = results;
        this.currentProgress = 100;
        this.processedFiles = this.totalFiles;
        
        // 最終進捗更新
        this.updateProgressDisplay();
        
        // 少し待ってから結果モーダルに切り替え
        setTimeout(() => {
            this.hideProgressModal();
            this.showResultModal();
        }, 500);
        
        // アクセシビリティアナウンス
        this.announceToScreenReader('置換処理が完了しました');
        
        console.log('Progress completed:', results);
    }
    
    /**
     * 進捗表示キャンセル
     */
    cancelProgress() {
        this.hideProgressModal();
        this.announceToScreenReader('置換処理がキャンセルされました');
        console.log('Progress cancelled');
    }
    
    /**
     * 進捗モーダル表示
     */
    showProgressModal() {
        const modal = this.elements.progressModal;
        if (!modal) return;
        
        modal.style.display = 'flex';
        modal.classList.add('show', 'modal-enter');
        this.elements.body.classList.add('modal-open');
        
        // フォーカス管理
        this.trapFocus(modal);
        
        this.isVisible = true;
    }
    
    /**
     * 進捗モーダル非表示
     */
    hideProgressModal() {
        const modal = this.elements.progressModal;
        if (!modal) return;
        
        modal.classList.add('modal-exit');
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('show', 'modal-enter', 'modal-exit');
            this.elements.body.classList.remove('modal-open');
        }, 150);
        
        this.isVisible = false;
    }
    
    /**
     * 結果モーダル表示
     */
    showResultModal() {
        const modal = this.elements.resultModal;
        if (!modal || !this.results) return;
        
        // 結果内容を生成
        this.renderResults();
        
        modal.style.display = 'flex';
        modal.classList.add('show', 'modal-enter');
        this.elements.body.classList.add('modal-open');
        
        // フォーカス管理
        this.trapFocus(modal);
        
        console.log('Result modal shown');
    }
    
    /**
     * 結果モーダル非表示
     */
    hideResultModal() {
        const modal = this.elements.resultModal;
        if (!modal) return;
        
        modal.classList.add('modal-exit');
        
        setTimeout(() => {
            modal.style.display = 'none';
            modal.classList.remove('show', 'modal-enter', 'modal-exit');
            this.elements.body.classList.remove('modal-open');
        }, 150);
        
        console.log('Result modal hidden');
    }
    
    /**
     * 進捗表示更新（アニメーションフレーム制御）
     */
    requestProgressUpdate() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.animationFrame = requestAnimationFrame(() => {
            this.updateProgressDisplay();
        });
    }
    
    /**
     * 進捗表示DOM更新
     */
    updateProgressDisplay() {
        // プログレスバー更新
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${this.currentProgress}%`;
            this.elements.progressBar.setAttribute('aria-valuenow', Math.round(this.currentProgress));
        }
        
        // 進捗テキスト更新
        if (this.elements.progressText) {
            const percent = Math.round(this.currentProgress);
            const text = `${percent}% (${this.processedFiles}/${this.totalFiles} files)`;
            this.elements.progressText.textContent = text;
        }
        
        // 現在ファイル更新
        if (this.elements.currentFile) {
            this.elements.currentFile.textContent = this.currentFile;
        }
        
        // 経過時間計算・表示
        if (this.startTime) {
            const elapsed = Date.now() - this.startTime;
            const elapsedText = this.formatElapsedTime(elapsed);
            
            // 経過時間要素があれば更新
            const elapsedElement = document.getElementById('elapsedTime');
            if (elapsedElement) {
                elapsedElement.textContent = elapsedText;
            }
        }
    }
    
    /**
     * 結果内容レンダリング
     */
    renderResults() {
        if (!this.results) return;
        
        // サマリー生成
        this.renderResultSummary();
        
        // 詳細結果生成
        this.renderResultDetails();
    }
    
    /**
     * 結果サマリーレンダリング
     */
    renderResultSummary() {
        const summary = this.elements.resultSummary;
        if (!summary || !this.results) return;
        
        const {
            totalFiles,
            modifiedFiles,
            totalReplacements,
            elapsedTime,
            errors = []
        } = this.results;
        
        const successRate = totalFiles > 0 ? ((modifiedFiles / totalFiles) * 100).toFixed(1) : 0;
        const avgReplacementsPerFile = modifiedFiles > 0 ? (totalReplacements / modifiedFiles).toFixed(1) : 0;
        
        summary.innerHTML = `
            <div class="result-summary-grid">
                <div class="summary-card success">
                    <div class="summary-icon">✅</div>
                    <div class="summary-content">
                        <div class="summary-title">変更ファイル数</div>
                        <div class="summary-value">${modifiedFiles}</div>
                        <div class="summary-subtitle">/ ${totalFiles} ファイル</div>
                    </div>
                </div>
                <div class="summary-card primary">
                    <div class="summary-icon">🔄</div>
                    <div class="summary-content">
                        <div class="summary-title">総置換回数</div>
                        <div class="summary-value">${totalReplacements}</div>
                        <div class="summary-subtitle">平均 ${avgReplacementsPerFile} 箇所/ファイル</div>
                    </div>
                </div>
                <div class="summary-card info">
                    <div class="summary-icon">⏱️</div>
                    <div class="summary-content">
                        <div class="summary-title">処理時間</div>
                        <div class="summary-value">${this.formatElapsedTime(elapsedTime)}</div>
                        <div class="summary-subtitle">成功率 ${successRate}%</div>
                    </div>
                </div>
                ${errors.length > 0 ? `
                <div class="summary-card warning">
                    <div class="summary-icon">⚠️</div>
                    <div class="summary-content">
                        <div class="summary-title">エラー</div>
                        <div class="summary-value">${errors.length}</div>
                        <div class="summary-subtitle">件のエラーが発生</div>
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * 結果詳細レンダリング
     */
    renderResultDetails() {
        const details = this.elements.resultDetails;
        if (!details || !this.results) return;
        
        const { fileResults = [], errors = [] } = this.results;
        
        let detailsHTML = '';
        
        // 成功したファイル
        if (fileResults.length > 0) {
            detailsHTML += `
                <div class="result-section">
                    <h3 class="result-section-title">変更されたファイル</h3>
                    <div class="result-files">
            `;
            
            fileResults.slice(0, 50).forEach(fileResult => { // 最大50件表示
                const { filePath, replacements = [] } = fileResult;
                const replacementCount = replacements.length;
                
                detailsHTML += `
                    <div class="result-file">
                        <div class="result-file-header">
                            <span class="result-file-icon">📄</span>
                            <span class="result-file-path" title="${Utils.escapeHtml(filePath)}">${Utils.escapeHtml(this.truncatePath(filePath))}</span>
                            <span class="result-file-count">${replacementCount} 箇所</span>
                        </div>
                        <div class="result-file-details">
                `;
                
                replacements.slice(0, 10).forEach(replacement => { // 最大10件表示
                    const { from, to, count } = replacement;
                    detailsHTML += `
                        <div class="replacement-item">
                            <span class="replacement-from">${Utils.escapeHtml(from)}</span>
                            <span class="replacement-arrow">→</span>
                            <span class="replacement-to">${Utils.escapeHtml(to)}</span>
                            <span class="replacement-count">(${count}回)</span>
                        </div>
                    `;
                });
                
                if (replacements.length > 10) {
                    detailsHTML += `<div class="replacement-more">... 他 ${replacements.length - 10} 件</div>`;
                }
                
                detailsHTML += `
                        </div>
                    </div>
                `;
            });
            
            if (fileResults.length > 50) {
                detailsHTML += `<div class="result-more">... 他 ${fileResults.length - 50} ファイル</div>`;
            }
            
            detailsHTML += `
                    </div>
                </div>
            `;
        }
        
        // エラー
        if (errors.length > 0) {
            detailsHTML += `
                <div class="result-section error">
                    <h3 class="result-section-title">エラー</h3>
                    <div class="result-errors">
            `;
            
            errors.slice(0, 20).forEach(error => { // 最大20件表示
                detailsHTML += `
                    <div class="result-error">
                        <span class="result-error-icon">❌</span>
                        <span class="result-error-message">${Utils.escapeHtml(error.message)}</span>
                        ${error.filePath ? `<span class="result-error-file">${Utils.escapeHtml(this.truncatePath(error.filePath))}</span>` : ''}
                    </div>
                `;
            });
            
            if (errors.length > 20) {
                detailsHTML += `<div class="result-more">... 他 ${errors.length - 20} エラー</div>`;
            }
            
            detailsHTML += `
                    </div>
                </div>
            `;
        }
        
        details.innerHTML = detailsHTML;
    }
    
    /**
     * イベントハンドラー群
     */
    handlePauseClick() {
        if (this.onPause) {
            this.onPause();
        }
        this.announceToScreenReader('処理を一時停止しました');
    }
    
    handleStopClick() {
        const shouldStop = confirm('処理を停止しますか？\n\n※ 処理中のファイルは完了しますが、残りのファイルは処理されません。');
        if (shouldStop && this.onCancel) {
            this.onCancel();
        }
    }
    
    async handleExportClick() {
        try {
            if (!this.results) {
                throw new Error('エクスポート可能な結果がありません');
            }
            
            // エクスポートファイル選択
            const filePath = await this.selectExportFile();
            if (!filePath) return;
            
            // 結果をJSONまたはCSV形式でエクスポート
            await this.exportResults(filePath);
            
            this.announceToScreenReader('結果がエクスポートされました');
            
        } catch (error) {
            console.error('Export failed:', error);
            this.announceToScreenReader('エクスポートに失敗しました');
        }
    }
    
    async handleCopyClick() {
        try {
            const summaryText = this.generateSummaryText();
            await navigator.clipboard.writeText(summaryText);
            
            // 成功フィードバック
            const button = this.elements.copySummaryBtn;
            const originalText = button?.textContent;
            if (button) {
                button.textContent = '✅ Copied!';
                button.classList.add('success-pulse');
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('success-pulse');
                }, 1500);
            }
            
            this.announceToScreenReader('サマリーがクリップボードにコピーされました');
            
        } catch (error) {
            console.error('Copy failed:', error);
            this.announceToScreenReader('コピーに失敗しました');
        }
    }
    
    handleCloseResultClick() {
        this.hideResultModal();
    }
    
    /**
     * ユーティリティメソッド群
     */
    formatElapsedTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        } else {
            return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
        }
    }
    
    truncatePath(path, maxLength = 50) {
        if (path.length <= maxLength) return path;
        
        const parts = path.split(/[/\\]/);
        if (parts.length <= 2) {
            return '...' + path.slice(-(maxLength - 3));
        }
        
        const fileName = parts[parts.length - 1];
        const dirName = parts[parts.length - 2];
        const prefix = '.../' + dirName + '/';
        
        if (prefix.length + fileName.length <= maxLength) {
            return prefix + fileName;
        } else {
            return prefix + fileName.slice(0, maxLength - prefix.length - 3) + '...';
        }
    }
    
    generateSummaryText() {
        if (!this.results) return '';
        
        const {
            totalFiles,
            modifiedFiles,
            totalReplacements,
            elapsedTime
        } = this.results;
        
        return `Multi Grep Replacer - 実行結果サマリー

変更ファイル数: ${modifiedFiles} / ${totalFiles}
総置換回数: ${totalReplacements}
処理時間: ${this.formatElapsedTime(elapsedTime)}
実行日時: ${new Date().toLocaleString('ja-JP')}

Generated by Multi Grep Replacer`;
    }
    
    async selectExportFile() {
        if (!window.electronAPI?.saveFile) {
            throw new Error('ファイル保存機能が利用できません');
        }
        
        return await window.electronAPI.saveFile({
            defaultPath: `multi-grep-replacer-results-${new Date().toISOString().slice(0, 10)}.json`,
            filters: [
                { name: 'JSON Files', extensions: ['json'] },
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });
    }
    
    async exportResults(filePath) {
        const fileExtension = filePath.split('.').pop().toLowerCase();
        let content;
        
        if (fileExtension === 'csv') {
            content = this.generateCSVContent();
        } else {
            content = JSON.stringify(this.results, null, 2);
        }
        
        if (!window.electronAPI?.saveTextFile) {
            throw new Error('ファイル保存機能が利用できません');
        }
        
        await window.electronAPI.saveTextFile(filePath, content);
    }
    
    generateCSVContent() {
        if (!this.results?.fileResults) return '';
        
        const lines = ['ファイルパス,検索文字列,置換文字列,置換回数'];
        
        this.results.fileResults.forEach(fileResult => {
            const { filePath, replacements = [] } = fileResult;
            replacements.forEach(replacement => {
                const { from, to, count } = replacement;
                lines.push(`"${filePath}","${from}","${to}",${count}`);
            });
        });
        
        return lines.join('\n');
    }
    
    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
    
    isProgressVisible() {
        return this.elements.progressModal?.classList.contains('show');
    }
    
    isResultVisible() {
        return this.elements.resultModal?.classList.contains('show');
    }
    
    /**
     * スクリーンリーダーへのアナウンス
     */
    announceToScreenReader(message) {
        const announcer = document.getElementById('globalAnnouncements');
        if (announcer) {
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        this.abortController.abort();
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        this.onCancel = null;
        this.onPause = null;
        this.onResume = null;
        
        console.log('ProgressDisplay: Destroyed');
    }
}

// モジュールエクスポート
window.ProgressDisplay = ProgressDisplay;