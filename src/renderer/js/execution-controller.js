/**
 * 実行制御クラス - Multi Grep Replacer
 * 置換実行の制御・確認ダイアログ・状態管理
 */

class ExecutionController {
    constructor(uiController, progressDisplay, resultsDisplay) {
        this.uiController = uiController;
        this.progressDisplay = progressDisplay;
        this.resultsDisplay = resultsDisplay;
        
        this.isExecuting = false;
        this.isPaused = false;
        this.executionState = {
            totalFiles: 0,
            processedFiles: 0,
            errors: [],
            results: []
        };
        
        this.confirmDialog = null;
        
        this.bindEvents();
        
        console.log('✅ ExecutionController初期化完了');
    }
    
    /**
     * イベントリスナーの設定
     */
    bindEvents() {
        // 進捗表示からのイベント
        if (this.progressDisplay.dialog) {
            this.progressDisplay.dialog.addEventListener('progress-pause', (e) => {
                this.handlePause(e.detail);
            });
            
            this.progressDisplay.dialog.addEventListener('progress-stop', () => {
                this.handleStop();
            });
            
            this.progressDisplay.dialog.addEventListener('progress-showResults', (e) => {
                this.showResults(e.detail);
            });
            
            this.progressDisplay.dialog.addEventListener('progress-minimize', () => {
                this.handleMinimize();
            });
        }
    }
    
    /**
     * 置換実行を開始
     * @param {Object} config - 実行設定
     */
    async executeReplacement(config) {
        if (this.isExecuting) {
            console.warn('⚠️ 実行中のため、新しい実行はキャンセルされました');
            return;
        }
        
        try {
            // 実行前確認
            const confirmed = await this.showConfirmDialog(config);
            if (!confirmed) {
                return;
            }
            
            // 実行開始
            this.startExecution(config);
            
        } catch (error) {
            console.error('❌ 実行エラー:', error);
            this.progressDisplay.showError(error);
        }
    }
    
    /**
     * 実行確認ダイアログを表示
     * @param {Object} config - 実行設定
     * @returns {Promise<boolean>} 確認結果
     */
    async showConfirmDialog(config) {
        const { targetFolder, fileExtensions, rules } = config;
        const activeRules = rules.filter(rule => rule.enabled);
        
        // 対象ファイル数を事前計算（簡易版）
        const estimatedFiles = await this.estimateFileCount(targetFolder, fileExtensions);
        
        return new Promise((resolve) => {
            this.confirmDialog = document.createElement('div');
            this.confirmDialog.className = 'execution-dialog show';
            this.confirmDialog.innerHTML = `
                <div class="dialog-content">
                    <h3>🚀 置換実行の確認</h3>
                    <div class="execution-summary">
                        <p>📁 対象フォルダ: <span>${this.escapeHtml(targetFolder || '未選択')}</span></p>
                        <p>📊 推定ファイル数: <span>${estimatedFiles.toLocaleString()}件</span></p>
                        <p>⚙️ 置換ルール: <span>${activeRules.length}個</span></p>
                        <p>🔍 対象拡張子: <span>${fileExtensions || '全ファイル'}</span></p>
                    </div>
                    ${activeRules.length > 0 ? `
                    <div class="rules-preview">
                        <h4>📋 実行されるルール:</h4>
                        <ul>
                            ${activeRules.slice(0, 5).map(rule => `
                                <li><code>${this.escapeHtml(rule.from)}</code> → <code>${this.escapeHtml(rule.to)}</code></li>
                            `).join('')}
                            ${activeRules.length > 5 ? `<li>...他 ${activeRules.length - 5} 個のルール</li>` : ''}
                        </ul>
                    </div>
                    ` : ''}
                    <div class="warning-note">
                        <p>⚠️ この操作は元に戻せません。実行前にバックアップの確認をお勧めします。</p>
                    </div>
                    <div class="dialog-buttons">
                        <button class="btn-secondary" data-action="cancel">キャンセル</button>
                        <button class="btn-primary" data-action="confirm">🚀 実行開始</button>
                    </div>
                </div>
            `;
            
            const handleClick = (e) => {
                const action = e.target.dataset.action;
                if (action) {
                    this.confirmDialog.remove();
                    this.confirmDialog = null;
                    resolve(action === 'confirm');
                }
            };
            
            // イベントリスナー設定
            this.confirmDialog.addEventListener('click', handleClick);
            
            // ESCキーでキャンセル
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    document.removeEventListener('keydown', handleKeyDown);
                    this.confirmDialog.remove();
                    this.confirmDialog = null;
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleKeyDown);
            
            document.body.appendChild(this.confirmDialog);
            
            // 確認ボタンにフォーカス
            setTimeout(() => {
                const confirmBtn = this.confirmDialog.querySelector('[data-action="confirm"]');
                if (confirmBtn) confirmBtn.focus();
            }, 100);
        });
    }
    
    /**
     * 実行開始
     * @param {Object} config - 実行設定
     */
    async startExecution(config) {
        this.isExecuting = true;
        this.isPaused = false;
        this.executionState = {
            totalFiles: 0,
            processedFiles: 0,
            errors: [],
            results: [],
            startTime: Date.now()
        };
        
        try {
            // 対象ファイル取得
            const files = await this.getTargetFiles(config);
            this.executionState.totalFiles = files.length;
            
            if (files.length === 0) {
                throw new Error('対象ファイルが見つかりませんでした');
            }
            
            // 進捗表示開始
            this.progressDisplay.startProgress(files.length);
            
            // ファイル処理実行
            await this.processFiles(files, config.rules);
            
            // 完了処理
            this.completeExecution();
            
        } catch (error) {
            console.error('❌ 実行中エラー:', error);
            this.progressDisplay.showError(error);
            this.isExecuting = false;
        }
    }
    
    /**
     * 対象ファイルを取得
     * @param {Object} config - 実行設定
     * @returns {Promise<Array>} ファイルリスト
     */
    async getTargetFiles(config) {
        try {
            if (!window.electronAPI?.findFiles) {
                throw new Error('ファイル検索機能が利用できません');
            }
            
            const { targetFolder, fileExtensions } = config;
            const extensions = fileExtensions ? 
                fileExtensions.split(',').map(ext => ext.trim()).filter(ext => ext) : 
                null;
            
            return await window.electronAPI.findFiles(targetFolder, extensions);
            
        } catch (error) {
            console.error('❌ ファイル検索エラー:', error);
            return [];
        }
    }
    
    /**
     * ファイル数を推定
     * @param {string} targetFolder - 対象フォルダ
     * @param {string} fileExtensions - ファイル拡張子
     * @returns {Promise<number>} 推定ファイル数
     */
    async estimateFileCount(targetFolder, fileExtensions) {
        try {
            if (!targetFolder) return 0;
            
            // 簡易的な推定（実際のAPIが利用可能な場合のみ）
            if (window.electronAPI?.countFiles) {
                return await window.electronAPI.countFiles(targetFolder, fileExtensions);
            }
            
            // フォールバック: デフォルト推定値
            return 50;
            
        } catch (error) {
            console.warn('⚠️ ファイル数推定エラー:', error);
            return 0;
        }
    }
    
    /**
     * ファイル群を処理
     * @param {Array} files - ファイルリスト
     * @param {Array} rules - 置換ルール
     */
    async processFiles(files, rules) {
        const activeRules = rules.filter(rule => rule.enabled);
        const batchSize = 10; // 同時処理数
        
        for (let i = 0; i < files.length; i += batchSize) {
            // 一時停止チェック
            if (this.isPaused) {
                await this.waitForResume();
            }
            
            // 実行中断チェック
            if (!this.isExecuting) {
                break;
            }
            
            const batch = files.slice(i, i + batchSize);
            const batchPromises = batch.map(file => this.processFile(file, activeRules));
            
            const batchResults = await Promise.allSettled(batchPromises);
            
            // 結果を処理
            batchResults.forEach((result, index) => {
                const file = batch[index];
                this.executionState.processedFiles++;
                
                if (result.status === 'fulfilled' && result.value) {
                    this.executionState.results.push({
                        filePath: file,
                        ...result.value
                    });
                } else if (result.status === 'rejected') {
                    this.executionState.errors.push({
                        filePath: file,
                        error: result.reason.message
                    });
                }
                
                // 進捗更新
                this.updateProgress(file);
            });
        }
    }
    
    /**
     * 単一ファイルを処理
     * @param {string} filePath - ファイルパス
     * @param {Array} rules - 置換ルール
     * @returns {Promise<Object>} 処理結果
     */
    async processFile(filePath, rules) {
        try {
            if (!window.electronAPI?.processFile) {
                throw new Error('ファイル処理機能が利用できません');
            }
            
            return await window.electronAPI.processFile(filePath, rules);
            
        } catch (error) {
            console.error(`❌ ファイル処理エラー (${filePath}):`, error);
            throw error;
        }
    }
    
    /**
     * 進捗を更新
     * @param {string} currentFile - 現在処理中のファイル
     */
    updateProgress(currentFile) {
        const { processedFiles, totalFiles } = this.executionState;
        const totalChanges = this.executionState.results.reduce((sum, result) => 
            sum + (result.totalChanges || 0), 0);
        
        this.progressDisplay.updateProgress(
            processedFiles,
            totalFiles,
            currentFile,
            { changesCount: totalChanges }
        );
    }
    
    /**
     * 一時停止処理
     * @param {Object} detail - 一時停止詳細
     */
    handlePause(detail) {
        this.isPaused = detail.isPaused;
        console.log(`⏸️ 実行${this.isPaused ? '一時停止' : '再開'}`);
    }
    
    /**
     * 停止処理
     */
    handleStop() {
        this.isExecuting = false;
        this.isPaused = false;
        console.log('⏹️ 実行停止');
    }
    
    /**
     * 最小化処理
     */
    handleMinimize() {
        console.log('📱 進捗表示最小化');
    }
    
    /**
     * 一時停止中の待機
     */
    async waitForResume() {
        return new Promise((resolve) => {
            const checkResume = () => {
                if (!this.isPaused || !this.isExecuting) {
                    resolve();
                } else {
                    setTimeout(checkResume, 100);
                }
            };
            checkResume();
        });
    }
    
    /**
     * 実行完了処理
     */
    completeExecution() {
        const endTime = Date.now();
        const executionTime = endTime - this.executionState.startTime;
        
        const results = {
            modifiedFiles: this.executionState.results.length,
            totalFiles: this.executionState.totalFiles,
            totalChanges: this.executionState.results.reduce((sum, result) => 
                sum + (result.totalChanges || 0), 0),
            executionTime,
            fileResults: this.executionState.results,
            errors: this.executionState.errors
        };
        
        // 進捗表示を完了状態に更新
        this.progressDisplay.showComplete(results);
        
        this.isExecuting = false;
        this.isPaused = false;
        
        console.log('✅ 実行完了:', results);
    }
    
    /**
     * 結果表示
     * @param {Object} results - 実行結果
     */
    showResults(results) {
        this.resultsDisplay.show(results);
        this.progressDisplay.hide();
    }
    
    /**
     * HTMLエスケープ
     * @param {string} text - エスケープ対象テキスト
     * @returns {string} エスケープ済みテキスト
     */
    escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    /**
     * 現在の実行状態を取得
     * @returns {Object} 実行状態
     */
    getExecutionState() {
        return {
            isExecuting: this.isExecuting,
            isPaused: this.isPaused,
            ...this.executionState
        };
    }
    
    /**
     * 実行を強制停止
     */
    forceStop() {
        this.isExecuting = false;
        this.isPaused = false;
        
        if (this.confirmDialog) {
            this.confirmDialog.remove();
            this.confirmDialog = null;
        }
        
        this.progressDisplay.hide();
        
        console.log('🛑 実行強制停止');
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        this.forceStop();
        
        this.uiController = null;
        this.progressDisplay = null;
        this.resultsDisplay = null;
        
        console.log('🗑️ ExecutionController破棄完了');
    }
}

// グローバルに登録
window.ExecutionController = ExecutionController;