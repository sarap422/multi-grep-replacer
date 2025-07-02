/**
 * 結果表示クラス - Multi Grep Replacer
 * 詳細結果・統計・エクスポート機能
 */

class ResultsDisplay {
    constructor(container = document.body) {
        this.container = container;
        this.dialog = null;
        this.isVisible = false;
        this.results = null;
        this.expandedFiles = new Set();
        
        this.createDialog();
        this.bindEvents();
        
        console.log('✅ ResultsDisplay初期化完了');
    }
    
    /**
     * ダイアログのDOM構造を作成
     */
    createDialog() {
        this.dialog = document.createElement('div');
        this.dialog.className = 'results-dialog';
        this.dialog.id = 'resultsDialog';
        this.dialog.setAttribute('role', 'dialog');
        this.dialog.setAttribute('aria-modal', 'true');
        this.dialog.setAttribute('aria-labelledby', 'resultsTitle');
        
        this.dialog.innerHTML = `
            <div class="dialog-content large">
                <div class="results-header">
                    <h3 id="resultsTitle">✅ 置換完了!</h3>
                    <button class="close-btn" id="closeResults" 
                            aria-label="結果表示を閉じる">✕</button>
                </div>
                
                <div class="results-summary">
                    <div class="summary-card">
                        <h4>📊 実行サマリー</h4>
                        <div class="summary-stats" id="summaryStats">
                            <!-- 動的生成 -->
                        </div>
                    </div>
                </div>
                
                <div class="results-details">
                    <h4>📄 変更詳細</h4>
                    <div class="file-list" id="fileChangesList">
                        <!-- 動的生成 -->
                    </div>
                </div>
                
                <div class="results-actions">
                    <button class="btn-secondary" id="exportResultsCSV">
                        📤 Export CSV
                    </button>
                    <button class="btn-secondary" id="exportResultsJSON">
                        📤 Export JSON
                    </button>
                    <button class="btn-secondary" id="copyResultsSummary">
                        📋 Copy Summary
                    </button>
                    <button class="btn-primary" id="closeResultsDialog">
                        ✅ Close
                    </button>
                </div>
            </div>
            
            <!-- スクリーンリーダー用のライブリージョン -->
            <div class="results-live-region" aria-live="polite" id="resultsAnnouncements"></div>
        `;
        
        this.container.appendChild(this.dialog);
        
        // 要素参照をキャッシュ
        this.elements = {
            header: this.dialog.querySelector('.results-header h3'),
            summaryStats: this.dialog.querySelector('#summaryStats'),
            fileList: this.dialog.querySelector('#fileChangesList'),
            closeBtn: this.dialog.querySelector('#closeResults'),
            exportCSVBtn: this.dialog.querySelector('#exportResultsCSV'),
            exportJSONBtn: this.dialog.querySelector('#exportResultsJSON'),
            copyBtn: this.dialog.querySelector('#copyResultsSummary'),
            closeDialogBtn: this.dialog.querySelector('#closeResultsDialog'),
            announcements: this.dialog.querySelector('#resultsAnnouncements')
        };
    }
    
    /**
     * イベントリスナーの設定
     */
    bindEvents() {
        // 閉じるボタン
        this.elements.closeBtn.addEventListener('click', () => {
            this.hide();
        });
        
        this.elements.closeDialogBtn.addEventListener('click', () => {
            this.hide();
        });
        
        // エクスポートボタン
        this.elements.exportCSVBtn.addEventListener('click', () => {
            this.exportResults('csv');
        });
        
        this.elements.exportJSONBtn.addEventListener('click', () => {
            this.exportResults('json');
        });
        
        // コピーボタン
        this.elements.copyBtn.addEventListener('click', () => {
            this.copyResultsSummary();
        });
        
        // ESCキーで閉じる
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
        
        // ダイアログ外クリックで閉じる
        this.dialog.addEventListener('click', (e) => {
            if (e.target === this.dialog) {
                this.hide();
            }
        });
    }
    
    /**
     * 結果を表示
     * @param {Object} results - 処理結果
     */
    show(results) {
        this.results = results;
        this.expandedFiles.clear();
        
        // サマリー生成
        this.renderSummary();
        
        // 詳細リスト生成
        this.renderFileList();
        
        // ダイアログを表示
        this.isVisible = true;
        this.dialog.classList.add('show');
        
        // フォーカス管理
        setTimeout(() => {
            this.elements.closeBtn.focus();
        }, 100);
        
        // アクセシビリティ通知
        this.announce('置換結果を表示しました');
        
        console.log('📊 結果表示:', results);
    }
    
    /**
     * サマリー統計を生成
     */
    renderSummary() {
        if (!this.results) return;
        
        const {
            modifiedFiles = 0,
            totalFiles = 0,
            totalChanges = 0,
            executionTime = 0,
            errors = []
        } = this.results;
        
        const successRate = totalFiles > 0 ? ((modifiedFiles / totalFiles) * 100).toFixed(1) : 0;
        const avgChangesPerFile = modifiedFiles > 0 ? (totalChanges / modifiedFiles).toFixed(1) : 0;
        const processingSpeed = executionTime > 0 ? (totalFiles / (executionTime / 1000)).toFixed(1) : 0;
        
        this.elements.summaryStats.innerHTML = `
            <div class="stat">
                <span class="number">${modifiedFiles}</span>
                <span class="label">files modified</span>
            </div>
            <div class="stat">
                <span class="number">${totalChanges}</span>
                <span class="label">total changes</span>
            </div>
            <div class="stat">
                <span class="number">${this.formatTime(executionTime)}</span>
                <span class="label">completed in</span>
            </div>
            <div class="stat">
                <span class="number">${successRate}%</span>
                <span class="label">success rate</span>
            </div>
            ${avgChangesPerFile > 0 ? `
            <div class="stat">
                <span class="number">${avgChangesPerFile}</span>
                <span class="label">avg changes/file</span>
            </div>
            ` : ''}
            ${processingSpeed > 0 ? `
            <div class="stat">
                <span class="number">${processingSpeed}</span>
                <span class="label">files/sec</span>
            </div>
            ` : ''}
            ${errors.length > 0 ? `
            <div class="stat error">
                <span class="number">${errors.length}</span>
                <span class="label">errors</span>
            </div>
            ` : ''}
        `;
    }
    
    /**
     * ファイル変更詳細リストを生成
     */
    renderFileList() {
        if (!this.results || !this.results.fileResults) {
            this.elements.fileList.innerHTML = `
                <div class="empty-results">
                    <div class="icon">📂</div>
                    <h3>変更されたファイルがありません</h3>
                    <p>指定された条件では、ファイルに変更は加えられませんでした。</p>
                </div>
            `;
            return;
        }
        
        const { fileResults } = this.results;
        let html = '';
        
        fileResults.forEach((fileResult, index) => {
            const { filePath, changes = [], totalChanges = 0 } = fileResult;
            const isExpanded = this.expandedFiles.has(filePath);
            const fileId = `file-${index}`;
            
            html += `
                <div class="file-item ${isExpanded ? 'expanded' : ''}" data-file-path="${filePath}">
                    <div class="file-header" role="button" tabindex="0" 
                         aria-expanded="${isExpanded}" aria-controls="${fileId}-details"
                         data-file-index="${index}">
                        <span class="file-path">${this.escapeHtml(this.truncateFilePath(filePath))}</span>
                        <div class="file-stats">
                            <span class="change-count">${totalChanges} changes</span>
                            <span class="expand-icon">▶</span>
                        </div>
                    </div>
                    <div class="file-details" id="${fileId}-details">
                        <ul class="change-list">
            `;
            
            changes.forEach(change => {
                const { from, to, count = 1 } = change;
                html += `
                    <li class="change-item">
                        <div class="change-text">
                            <span class="change-from">${this.escapeHtml(from)}</span>
                            <span class="change-arrow">→</span>
                            <span class="change-to">${this.escapeHtml(to)}</span>
                            <span class="occurrence-count">(${count} occurrence${count !== 1 ? 's' : ''})</span>
                        </div>
                    </li>
                `;
            });
            
            html += `
                        </ul>
                    </div>
                </div>
            `;
        });
        
        this.elements.fileList.innerHTML = html;
        
        // ファイルヘッダーのクリックイベントを設定
        this.bindFileListEvents();
    }
    
    /**
     * ファイルリストのイベントを設定
     */
    bindFileListEvents() {
        const fileHeaders = this.elements.fileList.querySelectorAll('.file-header');
        
        fileHeaders.forEach(header => {
            header.addEventListener('click', (e) => {
                this.toggleFileDetails(header);
            });
            
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleFileDetails(header);
                }
            });
        });
    }
    
    /**
     * ファイル詳細の表示/非表示を切り替え
     */
    toggleFileDetails(header) {
        const fileItem = header.closest('.file-item');
        const filePath = fileItem.dataset.filePath;
        const isExpanded = fileItem.classList.contains('expanded');
        
        if (isExpanded) {
            fileItem.classList.remove('expanded');
            this.expandedFiles.delete(filePath);
            header.setAttribute('aria-expanded', 'false');
        } else {
            fileItem.classList.add('expanded');
            this.expandedFiles.add(filePath);
            header.setAttribute('aria-expanded', 'true');
        }
    }
    
    /**
     * 結果をエクスポート
     * @param {string} format - エクスポート形式 ('csv' | 'json')
     */
    async exportResults(format) {
        if (!this.results) {
            this.announce('エクスポート可能な結果がありません');
            return;
        }
        
        try {
            const content = format === 'csv' ? this.generateCSV() : this.generateJSON();
            const fileName = `multi-grep-replacer-results-${this.formatDate()}.${format}`;
            
            // ファイル保存（ダウンロード）
            this.downloadFile(content, fileName, format === 'csv' ? 'text/csv' : 'application/json');
            
            // 成功フィードバック
            const button = format === 'csv' ? this.elements.exportCSVBtn : this.elements.exportJSONBtn;
            this.showButtonSuccess(button, '✅ Exported!');
            
            this.announce(`結果が${format.toUpperCase()}形式でエクスポートされました`);
            
        } catch (error) {
            console.error('Export failed:', error);
            this.announce(`エクスポートに失敗しました: ${error.message}`);
        }
    }
    
    /**
     * CSV形式でデータを生成
     */
    generateCSV() {
        if (!this.results?.fileResults) return '';
        
        const lines = [
            'File Path,Search Text,Replacement Text,Occurrences'
        ];
        
        this.results.fileResults.forEach(fileResult => {
            const { filePath, changes = [] } = fileResult;
            changes.forEach(change => {
                const { from, to, count = 1 } = change;
                lines.push(`"${filePath}","${from}","${to}",${count}`);
            });
        });
        
        return lines.join('\n');
    }
    
    /**
     * JSON形式でデータを生成
     */
    generateJSON() {
        const exportData = {
            summary: {
                modifiedFiles: this.results.modifiedFiles || 0,
                totalFiles: this.results.totalFiles || 0,
                totalChanges: this.results.totalChanges || 0,
                executionTime: this.results.executionTime || 0,
                timestamp: new Date().toISOString()
            },
            fileResults: this.results.fileResults || [],
            errors: this.results.errors || []
        };
        
        return JSON.stringify(exportData, null, 2);
    }
    
    /**
     * 結果サマリーをクリップボードにコピー
     */
    async copyResultsSummary() {
        try {
            const summaryText = this.generateSummaryText();
            await navigator.clipboard.writeText(summaryText);
            
            // 成功フィードバック
            this.showButtonSuccess(this.elements.copyBtn, '✅ Copied!');
            this.announce('サマリーがクリップボードにコピーされました');
            
        } catch (error) {
            console.error('Copy failed:', error);
            this.announce('コピーに失敗しました');
        }
    }
    
    /**
     * サマリーテキストを生成
     */
    generateSummaryText() {
        if (!this.results) return '';
        
        const {
            modifiedFiles = 0,
            totalFiles = 0,
            totalChanges = 0,
            executionTime = 0
        } = this.results;
        
        return `Multi Grep Replacer - 実行結果サマリー

変更ファイル数: ${modifiedFiles} / ${totalFiles}
総置換回数: ${totalChanges}
処理時間: ${this.formatTime(executionTime)}
実行日時: ${new Date().toLocaleString('ja-JP')}

Generated by Multi Grep Replacer (Electron Edition)`;
    }
    
    /**
     * ファイルをダウンロード
     */
    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // URLオブジェクトを解放
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    /**
     * ボタンに成功フィードバックを表示
     */
    showButtonSuccess(button, successText) {
        const originalText = button.textContent;
        button.textContent = successText;
        button.classList.add('success-pulse');
        
        setTimeout(() => {
            button.textContent = originalText;
            button.classList.remove('success-pulse');
        }, 1500);
    }
    
    /**
     * ダイアログを非表示
     */
    hide() {
        this.isVisible = false;
        this.dialog.classList.remove('show');
        
        // 状態をリセット
        setTimeout(() => {
            this.expandedFiles.clear();
            this.results = null;
        }, 300);
    }
    
    /**
     * ユーティリティメソッド
     */
    
    /**
     * HTMLエスケープ
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * ファイルパスを短縮
     */
    truncateFilePath(filePath, maxLength = 80) {
        if (filePath.length <= maxLength) return filePath;
        
        const parts = filePath.split('/');
        if (parts.length <= 2) return filePath;
        
        const fileName = parts[parts.length - 1];
        const dirName = parts[parts.length - 2];
        const prefix = '.../' + dirName + '/';
        
        if (prefix.length + fileName.length <= maxLength) {
            return prefix + fileName;
        } else {
            return prefix + fileName.slice(0, maxLength - prefix.length - 3) + '...';
        }
    }
    
    /**
     * 時間をフォーマット
     */
    formatTime(milliseconds) {
        if (milliseconds < 1000) {
            return `${milliseconds}ms`;
        }
        
        const seconds = Math.floor(milliseconds / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    /**
     * 日付をファイル名用にフォーマット
     */
    formatDate() {
        const now = new Date();
        return now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
    }
    
    /**
     * スクリーンリーダーにアナウンス
     */
    announce(message) {
        if (this.elements.announcements) {
            this.elements.announcements.textContent = message;
            
            setTimeout(() => {
                this.elements.announcements.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * 現在の結果データを取得
     */
    getResults() {
        return this.results;
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        if (this.dialog) {
            this.dialog.remove();
            this.dialog = null;
        }
        
        this.expandedFiles.clear();
        this.results = null;
        
        console.log('🗑️ ResultsDisplay破棄完了');
    }
}

// グローバルに登録
window.ResultsDisplay = ResultsDisplay;