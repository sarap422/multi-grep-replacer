/**
 * UIコントローラー - Multi Grep Replacer
 * UI制御・イベントハンドリング・応答性向上
 */

class UIController {
    constructor() {
        this.currentConfig = {};
        this.isProcessing = false;
        this.rules = [];
        this.ruleIdCounter = 1;
        
        // UI応答性向上のためのdebounce/throttle関数取得
        this.debounce = Utils.debounce;
        this.throttle = Utils.throttle;
        
        // DOM要素への参照（キャッシュ）
        this.elements = {};
        
        // イベントリスナーのAbortController
        this.abortController = new AbortController();
        
        // 実行制御関連のクラス
        this.progressDisplay = null;
        this.resultsDisplay = null;
        this.executionController = null;
        
        // 初期化
        this.initialize();
    }
    
    /**
     * UI初期化
     */
    initialize() {
        console.log('UIController: Initializing...');
        
        // DOM要素のキャッシュ
        this.cacheElements();
        
        // 実行制御クラスの初期化
        this.initializeExecutionClasses();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // テーマの初期化
        this.initializeTheme();
        
        // 初期状態の設定
        this.resetToInitialState();
        
        // キーボードショートカットの設定
        this.setupKeyboardShortcuts();
        
        console.log('UIController: Initialization complete');
    }
    
    /**
     * 実行制御クラスの初期化
     */
    initializeExecutionClasses() {
        try {
            // ProgressDisplayの初期化
            this.progressDisplay = new ProgressDisplay();
            console.log('✅ ProgressDisplay初期化完了');
            
            // ResultsDisplayの初期化
            this.resultsDisplay = new ResultsDisplay();
            console.log('✅ ResultsDisplay初期化完了');
            
            // ExecutionControllerの初期化
            this.executionController = new ExecutionController(
                this,
                this.progressDisplay,
                this.resultsDisplay
            );
            console.log('✅ ExecutionController初期化完了');
            
        } catch (error) {
            console.error('❌ 実行制御クラス初期化エラー:', error);
        }
    }
    
    /**
     * DOM要素キャッシュ（パフォーマンス向上）
     */
    cacheElements() {
        this.elements = {
            // ヘッダー
            themeToggle: document.getElementById('themeToggle'),
            settingsBtn: document.getElementById('settingsBtn'),
            
            // フォルダ選択
            folderPath: document.getElementById('folderPath'),
            browseBtn: document.getElementById('browseBtn'),
            
            // ファイル拡張子
            fileExtensions: document.getElementById('fileExtensions'),
            
            // 置換ルール
            templateSelect: document.getElementById('templateSelect'),
            rulesContainer: document.getElementById('rulesContainer'),
            addRuleBtn: document.getElementById('addRuleBtn'),
            
            // プレビュー
            previewText: document.getElementById('previewText'),
            
            // アクションボタン
            loadConfigBtn: document.getElementById('loadConfigBtn'),
            saveConfigBtn: document.getElementById('saveConfigBtn'),
            executeBtn: document.getElementById('executeBtn'),
            
            // モーダル
            progressModal: document.getElementById('progressModal'),
            resultModal: document.getElementById('resultModal'),
            
            // 進捗モーダル
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            currentFile: document.getElementById('currentFile'),
            pauseBtn: document.getElementById('pauseBtn'),
            stopBtn: document.getElementById('stopBtn'),
            
            // 結果モーダル
            resultSummary: document.getElementById('resultSummary'),
            resultDetails: document.getElementById('resultDetails'),
            exportResultsBtn: document.getElementById('exportResultsBtn'),
            copySummaryBtn: document.getElementById('copySummaryBtn'),
            closeResultBtn: document.getElementById('closeResultBtn'),
            
            // 設定ダイアログ
            loadConfigDialog: document.getElementById('loadConfigDialog'),
            saveConfigDialog: document.getElementById('saveConfigDialog'),
            templateDialog: document.getElementById('templateDialog'),
            configDropZone: document.getElementById('configDropZone'),
            selectConfigFileBtn: document.getElementById('selectConfigFileBtn'),
            configHistory: document.getElementById('configHistory'),
            configPreview: document.getElementById('configPreview'),
            configValidationResult: document.getElementById('configValidationResult'),
            loadConfigConfirmBtn: document.getElementById('loadConfigConfirmBtn'),
            saveConfigPreview: document.getElementById('saveConfigPreview'),
            configName: document.getElementById('configName'),
            configDescription: document.getElementById('configDescription'),
            addToTemplates: document.getElementById('addToTemplates'),
            saveConfigConfirmBtn: document.getElementById('saveConfigConfirmBtn'),
            templateGrid: document.getElementById('templateGrid'),
            templatePreview: document.getElementById('templatePreview'),
            applyTemplateBtn: document.getElementById('applyTemplateBtn'),
            
            // グローバル
            globalAnnouncements: document.getElementById('globalAnnouncements'),
            body: document.body,
            appContainer: document.querySelector('.app-container')
        };
    }
    
    /**
     * イベントリスナー設定（UI応答性重視）
     */
    setupEventListeners() {
        const signal = this.abortController.signal;
        
        // テーマ切り替え（即座反応）
        this.elements.themeToggle?.addEventListener('click', 
            this.handleThemeToggle.bind(this), { signal, passive: true });
        
        // フォルダ選択（即座反応）
        this.elements.browseBtn?.addEventListener('click', 
            this.handleFolderBrowse.bind(this), { signal });
        
        // ファイル拡張子入力（debounce適用）
        this.elements.fileExtensions?.addEventListener('input', 
            this.debounce(this.handleExtensionsChange.bind(this), 200), { signal });
        
        // テンプレート選択（即座反応）
        this.elements.templateSelect?.addEventListener('change', 
            this.handleTemplateChange.bind(this), { signal });
        
        // ルール追加（即座反応）
        this.elements.addRuleBtn?.addEventListener('click', 
            this.handleAddRule.bind(this), { signal });
        
        // アクションボタン（即座反応）
        this.elements.loadConfigBtn?.addEventListener('click', 
            this.handleLoadConfig.bind(this), { signal });
        this.elements.saveConfigBtn?.addEventListener('click', 
            this.handleSaveConfig.bind(this), { signal });
        this.elements.executeBtn?.addEventListener('click', 
            this.handleExecute.bind(this), { signal });
        
        // 進捗モーダルボタン
        this.elements.pauseBtn?.addEventListener('click', 
            this.handlePause.bind(this), { signal });
        this.elements.stopBtn?.addEventListener('click', 
            this.handleStop.bind(this), { signal });
        
        // 結果モーダルボタン
        this.elements.exportResultsBtn?.addEventListener('click', 
            this.handleExportResults.bind(this), { signal });
        this.elements.copySummaryBtn?.addEventListener('click', 
            this.handleCopySummary.bind(this), { signal });
        this.elements.closeResultBtn?.addEventListener('click', 
            this.handleCloseResult.bind(this), { signal });
        
        // モーダルクローズ（Escキー対応）
        document.addEventListener('keydown', this.handleKeydown.bind(this), { signal });
        
        // ウィンドウリサイズ（throttle適用）
        window.addEventListener('resize', 
            this.throttle(this.handleResize.bind(this), 100), { signal, passive: true });
        
        // 設定ダイアログ関連イベント
        this.setupConfigDialogListeners(signal);
    }
    
    /**
     * テーマ初期化
     */
    initializeTheme() {
        const savedTheme = localStorage.getItem('app-theme') || 'auto';
        this.setTheme(savedTheme);
        this.updateThemeToggleIcon(savedTheme);
    }
    
    /**
     * 初期状態にリセット
     */
    resetToInitialState() {
        this.isProcessing = false;
        this.rules = [];
        this.ruleIdCounter = 1;
        
        // プレビューテキストを初期状態に
        this.updatePreview(0, 0);
        
        // 実行ボタンを無効化
        this.updateExecuteButton();
        
        // デフォルトルールを1つ追加
        this.addReplacementRule();
        
        // アナウンス
        this.announceToScreenReader('アプリケーションが準備完了しました');
    }
    
    /**
     * キーボードショートカット設定
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + S: 設定保存
            if ((event.ctrlKey || event.metaKey) && event.key === 's') {
                event.preventDefault();
                this.handleSaveConfig();
            }
            
            // Ctrl/Cmd + O: 設定読み込み
            if ((event.ctrlKey || event.metaKey) && event.key === 'o') {
                event.preventDefault();
                this.handleLoadConfig();
            }
            
            // Ctrl/Cmd + E: 実行
            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                if (!this.isProcessing) {
                    this.handleExecute();
                }
            }
            
            // Ctrl/Cmd + R: ルール追加
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                this.addReplacementRule();
            }
        }, { signal: this.abortController.signal });
    }
    
    /**
     * テーマ切り替え処理（即座反応）
     */
    handleThemeToggle() {
        const button = this.elements.themeToggle;
        if (!button) return;
        
        // ボタンにアニメーションクラス追加
        button.classList.add('switching');
        
        const currentTheme = this.elements.body.getAttribute('data-theme') || 'auto';
        const nextTheme = this.getNextTheme(currentTheme);
        
        // テーマ変更（即座実行）
        this.setTheme(nextTheme);
        this.updateThemeToggleIcon(nextTheme);
        
        // アニメーション終了後にクラス削除
        setTimeout(() => {
            button.classList.remove('switching');
        }, 300);
        
        // アナウンス
        this.announceToScreenReader(`テーマを${this.getThemeName(nextTheme)}に変更しました`);
    }
    
    /**
     * フォルダ選択処理（即座反応）
     */
    async handleFolderBrowse() {
        try {
            // ボタンの即座フィードバック
            const button = this.elements.browseBtn;
            button?.classList.add('btn-bounce');
            
            // 非同期でフォルダ選択
            const folderPath = await window.electronAPI?.selectFolder();
            
            if (folderPath) {
                this.elements.folderPath.value = folderPath;
                this.currentConfig.targetFolder = folderPath;
                
                // プレビュー更新
                this.updatePreviewDebounced();
                
                // アナウンス
                this.announceToScreenReader(`フォルダが選択されました: ${folderPath}`);
            }
            
            // アニメーション終了
            setTimeout(() => {
                button?.classList.remove('btn-bounce');
            }, 300);
            
        } catch (error) {
            console.error('Folder selection failed:', error);
            this.showErrorMessage('フォルダ選択に失敗しました');
        }
    }
    
    /**
     * ファイル拡張子変更処理（debounce適用）
     */
    handleExtensionsChange() {
        const extensions = this.elements.fileExtensions?.value || '';
        this.currentConfig.fileExtensions = extensions;
        
        // プレビュー更新
        this.updatePreviewDebounced();
    }
    
    /**
     * 置換ルール追加
     */
    addReplacementRule(from = '', to = '', enabled = true) {
        const ruleId = `rule_${this.ruleIdCounter++}`;
        const rule = { id: ruleId, from, to, enabled };
        
        this.rules.push(rule);
        
        // DOM要素作成
        const ruleElement = this.createRuleElement(rule);
        this.elements.rulesContainer?.appendChild(ruleElement);
        
        // アニメーション追加
        ruleElement.classList.add('slide-in-up');
        
        // 実行ボタン状態更新
        this.updateExecuteButton();
        
        // フォーカスを新しいFromフィールドに
        const fromInput = ruleElement.querySelector('[data-rule-from]');
        fromInput?.focus();
        
        // アナウンス
        this.announceToScreenReader('新しい置換ルールが追加されました');
        
        return rule;
    }
    
    /**
     * ルール要素の作成
     */
    createRuleElement(rule) {
        const div = document.createElement('div');
        div.className = 'replacement-rule card';
        div.setAttribute('role', 'listitem');
        div.setAttribute('data-rule-id', rule.id);
        
        div.innerHTML = `
            <div class="rule-content">
                <div class="rule-enable">
                    <input 
                        type="checkbox" 
                        id="enable_${rule.id}"
                        ${rule.enabled ? 'checked' : ''}
                        data-rule-enable
                        aria-label="このルールを有効にする">
                </div>
                <div class="rule-inputs">
                    <div class="form-group">
                        <label for="from_${rule.id}" class="sr-only">検索文字列</label>
                        <input 
                            type="text" 
                            id="from_${rule.id}"
                            class="form-input form-input-animated"
                            placeholder="From: 検索文字列"
                            value="${rule.from}"
                            data-rule-from
                            aria-label="検索文字列">
                    </div>
                    <div class="form-group">
                        <label for="to_${rule.id}" class="sr-only">置換文字列</label>
                        <input 
                            type="text" 
                            id="to_${rule.id}"
                            class="form-input form-input-animated"
                            placeholder="To: 置換文字列"
                            value="${rule.to}"
                            data-rule-to
                            aria-label="置換文字列">
                    </div>
                </div>
                <div class="rule-actions">
                    <button 
                        type="button"
                        class="btn btn-sm btn-outline btn-hover-lift"
                        data-rule-delete
                        aria-label="このルールを削除">🗑️</button>
                </div>
            </div>
        `;
        
        // イベントリスナー追加
        this.setupRuleEventListeners(div, rule);
        
        return div;
    }
    
    /**
     * ルール要素のイベントリスナー設定
     */
    setupRuleEventListeners(element, rule) {
        const signal = this.abortController.signal;
        
        // 有効/無効切り替え
        const enableCheckbox = element.querySelector('[data-rule-enable]');
        enableCheckbox?.addEventListener('change', (e) => {
            rule.enabled = e.target.checked;
            this.updateExecuteButton();
            this.announceToScreenReader(`ルールが${rule.enabled ? '有効' : '無効'}になりました`);
        }, { signal });
        
        // From入力
        const fromInput = element.querySelector('[data-rule-from]');
        fromInput?.addEventListener('input', 
            this.debounce((e) => {
                rule.from = e.target.value;
                this.updateExecuteButton();
            }, 200), { signal });
        
        // To入力
        const toInput = element.querySelector('[data-rule-to]');
        toInput?.addEventListener('input', 
            this.debounce((e) => {
                rule.to = e.target.value;
                this.updateExecuteButton();
            }, 200), { signal });
        
        // 削除ボタン
        const deleteBtn = element.querySelector('[data-rule-delete]');
        deleteBtn?.addEventListener('click', () => {
            this.deleteRule(rule.id);
        }, { signal });
    }
    
    /**
     * ルール削除
     */
    deleteRule(ruleId) {
        const ruleIndex = this.rules.findIndex(r => r.id === ruleId);
        if (ruleIndex === -1) return;
        
        const ruleElement = document.querySelector(`[data-rule-id="${ruleId}"]`);
        if (!ruleElement) return;
        
        // アニメーション追加
        ruleElement.classList.add('scale-out');
        
        // アニメーション完了後に削除
        setTimeout(() => {
            this.rules.splice(ruleIndex, 1);
            ruleElement.remove();
            this.updateExecuteButton();
            this.announceToScreenReader('置換ルールが削除されました');
        }, 150);
    }
    
    /**
     * プレビュー更新（debounce版）
     */
    updatePreviewDebounced = this.debounce(async function() {
        await this.updatePreview();
    }.bind(this), 300);
    
    /**
     * プレビュー更新
     */
    async updatePreview(fileCount = null, rulesCount = null) {
        if (fileCount === null || rulesCount === null) {
            // 実際のファイル数を取得
            try {
                const folderPath = this.elements.folderPath?.value;
                const extensions = this.elements.fileExtensions?.value;
                
                if (folderPath) {
                    const files = await window.electronAPI?.findFiles(folderPath, extensions);
                    fileCount = files?.length || 0;
                } else {
                    fileCount = 0;
                }
                
                rulesCount = this.rules.filter(r => r.enabled && r.from.trim()).length;
            } catch (error) {
                console.error('Preview update failed:', error);
                fileCount = 0;
                rulesCount = 0;
            }
        }
        
        const previewText = `📊 Preview: ${fileCount} files found, ${rulesCount} rules active`;
        this.elements.previewText.textContent = previewText;
    }
    
    /**
     * 実行ボタン状態更新
     */
    updateExecuteButton() {
        const hasValidRules = this.rules.some(r => r.enabled && r.from.trim() && r.to.trim());
        const hasFolder = this.elements.folderPath?.value.trim();
        const canExecute = hasValidRules && hasFolder && !this.isProcessing;
        
        if (this.elements.executeBtn) {
            this.elements.executeBtn.disabled = !canExecute;
            this.elements.executeBtn.setAttribute('aria-disabled', !canExecute);
        }
    }
    
    /**
     * スクリーンリーダーへのアナウンス
     */
    announceToScreenReader(message) {
        if (this.elements.globalAnnouncements) {
            this.elements.globalAnnouncements.textContent = message;
            // 少し後にクリア（重複アナウンス防止）
            setTimeout(() => {
                this.elements.globalAnnouncements.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * ユーティリティメソッド群
     */
    getNextTheme(currentTheme) {
        const themes = ['light', 'dark', 'auto'];
        const currentIndex = themes.indexOf(currentTheme);
        return themes[(currentIndex + 1) % themes.length];
    }
    
    setTheme(theme) {
        this.elements.body.setAttribute('data-theme', theme);
        localStorage.setItem('app-theme', theme);
    }
    
    updateThemeToggleIcon(theme) {
        const icons = { light: '☀️', dark: '🌙', auto: '🌓' };
        if (this.elements.themeToggle) {
            this.elements.themeToggle.textContent = icons[theme] || '🌙';
        }
    }
    
    getThemeName(theme) {
        const names = { light: 'ライトモード', dark: 'ダークモード', auto: '自動' };
        return names[theme] || '自動';
    }
    
    /**
     * 設定ダイアログイベントリスナー設定
     */
    setupConfigDialogListeners(signal) {
        // ダイアログクローズボタン
        document.querySelectorAll('[data-close-config-dialog]').forEach(btn => {
            btn.addEventListener('click', this.closeAllConfigDialogs.bind(this), { signal });
        });
        
        // 設定ファイル選択
        this.elements.selectConfigFileBtn?.addEventListener('click', 
            this.handleSelectConfigFile.bind(this), { signal });
        
        // 設定読み込み確認
        this.elements.loadConfigConfirmBtn?.addEventListener('click', 
            this.handleLoadConfigConfirm.bind(this), { signal });
        
        // 設定保存確認
        this.elements.saveConfigConfirmBtn?.addEventListener('click', 
            this.handleSaveConfigConfirm.bind(this), { signal });
        
        // テンプレート適用
        this.elements.applyTemplateBtn?.addEventListener('click', 
            this.handleApplyTemplate.bind(this), { signal });
        
        // ドラッグ&ドロップイベント
        this.setupConfigDropZone(signal);
        
        // 設定入力フィールド
        this.elements.configName?.addEventListener('input', 
            this.debounce(this.updateSaveConfigPreview.bind(this), 200), { signal });
        this.elements.configDescription?.addEventListener('input', 
            this.debounce(this.updateSaveConfigPreview.bind(this), 200), { signal });
    }
    
    /**
     * 設定ドラッグ&ドロップゾーン設定
     */
    setupConfigDropZone(signal) {
        const dropZone = this.elements.configDropZone;
        if (!dropZone) return;
        
        let dragCounter = 0;
        
        dropZone.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dragCounter++;
            dropZone.classList.add('drag-over');
        }, { signal });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dragCounter--;
            if (dragCounter === 0) {
                dropZone.classList.remove('drag-over');
            }
        }, { signal });
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
        }, { signal });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dragCounter = 0;
            dropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            const configFile = files.find(file => 
                file.name.endsWith('.json') || file.name.endsWith('.mgr'));
            
            if (configFile) {
                this.handleConfigFileDropped(configFile);
            } else {
                this.showError('JSONまたは.mgrファイルをドロップしてください');
            }
        }, { signal });
    }
    
    /**
     * 設定ダイアログを全て閉じる
     */
    closeAllConfigDialogs() {
        [this.elements.loadConfigDialog, this.elements.saveConfigDialog, this.elements.templateDialog]
            .forEach(dialog => {
                if (dialog) {
                    dialog.classList.remove('show');
                    setTimeout(() => {
                        dialog.style.display = 'none';
                    }, 150);
                }
            });
        
        this.elements.body.classList.remove('modal-open');
    }
    
    /**
     * 設定読み込みダイアログ表示
     */
    async handleLoadConfig() {
        try {
            // ダイアログ表示
            this.showConfigDialog(this.elements.loadConfigDialog);
            
            // 履歴を読み込み
            await this.loadConfigHistory();
            
            // アナウンス
            this.announceToScreenReader('設定読み込みダイアログが開きました');
            
        } catch (error) {
            console.error('Config load dialog failed:', error);
            this.showError('設定読み込みダイアログの表示に失敗しました');
        }
    }
    
    /**
     * 設定保存ダイアログ表示
     */
    async handleSaveConfig() {
        try {
            // 現在の設定をプレビューに表示
            this.updateSaveConfigPreview();
            
            // ダイアログ表示
            this.showConfigDialog(this.elements.saveConfigDialog);
            
            // デフォルト設定名を生成
            const defaultName = this.generateDefaultConfigName();
            if (this.elements.configName) {
                this.elements.configName.value = defaultName;
            }
            
            // アナウンス
            this.announceToScreenReader('設定保存ダイアログが開きました');
            
        } catch (error) {
            console.error('Config save dialog failed:', error);
            this.showError('設定保存ダイアログの表示に失敗しました');
        }
    }
    
    /**
     * テンプレート選択ダイアログ表示
     */
    async handleTemplateChange() {
        try {
            // テンプレート一覧を読み込み
            await this.loadTemplateGrid();
            
            // ダイアログ表示
            this.showConfigDialog(this.elements.templateDialog);
            
            // アナウンス
            this.announceToScreenReader('テンプレート選択ダイアログが開きました');
            
        } catch (error) {
            console.error('Template dialog failed:', error);
            this.showError('テンプレート選択ダイアログの表示に失敗しました');
        }
    }
    
    /**
     * 設定ダイアログ表示共通処理
     */
    showConfigDialog(dialog) {
        if (!dialog) return;
        
        dialog.style.display = 'flex';
        dialog.classList.add('show');
        this.elements.body.classList.add('modal-open');
        
        // フォーカス管理
        setTimeout(() => {
            const firstFocusable = dialog.querySelector('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
            firstFocusable?.focus();
        }, 150);
    }
    
    /**
     * 設定履歴読み込み
     */
    async loadConfigHistory() {
        try {
            // 履歴データを取得（仮実装）
            const history = await this.getConfigHistory();
            
            const historyContainer = this.elements.configHistory;
            if (!historyContainer) return;
            
            historyContainer.innerHTML = '';
            
            if (history.length === 0) {
                historyContainer.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--text-secondary);">
                        最近使用した設定はありません
                    </div>
                `;
                return;
            }
            
            history.forEach(item => {
                const historyItem = this.createHistoryItem(item);
                historyContainer.appendChild(historyItem);
            });
            
        } catch (error) {
            console.error('Config history load failed:', error);
            if (this.elements.configHistory) {
                this.elements.configHistory.innerHTML = `
                    <div style="text-align: center; padding: var(--spacing-lg); color: var(--color-error);">
                        履歴の読み込みに失敗しました
                    </div>
                `;
            }
        }
    }
    
    /**
     * 履歴アイテム作成
     */
    createHistoryItem(item) {
        const div = document.createElement('div');
        div.className = 'config-history-item';
        div.setAttribute('data-config-path', item.path);
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');
        
        div.innerHTML = `
            <div class="config-history-info">
                <h4 class="config-history-name">${Utils.escapeHtml(item.name)}</h4>
                <div class="config-history-meta">
                    <span>📅 ${this.formatDate(item.lastUsed)}</span>
                    <span>📝 ${item.rulesCount} ルール</span>
                    ${item.description ? `<span>💬 ${Utils.escapeHtml(item.description)}</span>` : ''}
                </div>
            </div>
            <div class="config-history-actions">
                <button class="config-history-action" data-action="preview" aria-label="プレビュー">👁️</button>
                <button class="config-history-action" data-action="delete" aria-label="削除">🗑️</button>
            </div>
        `;
        
        // イベントリスナー
        div.addEventListener('click', (e) => {
            if (!e.target.matches('[data-action]')) {
                this.selectConfigFromHistory(item);
            }
        });
        
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.selectConfigFromHistory(item);
            }
        });
        
        // アクションボタン
        const previewBtn = div.querySelector('[data-action="preview"]');
        previewBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.previewConfigFromHistory(item);
        });
        
        const deleteBtn = div.querySelector('[data-action="delete"]');
        deleteBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteConfigFromHistory(item);
        });
        
        return div;
    }
    
    /**
     * 設定プレビュー生成・表示
     */
    generateConfigPreview(config) {
        const rules = config.replacements || this.rules;
        const enabledRules = rules.filter(r => r.enabled !== false);
        
        return `
            <div class="config-preview-header">
                <h3 class="config-preview-title">📋 設定プレビュー</h3>
            </div>
            <div class="config-preview-stats">
                <div class="config-preview-stat">
                    <p class="config-preview-stat-value">${rules.length}</p>
                    <p class="config-preview-stat-label">総ルール数</p>
                </div>
                <div class="config-preview-stat">
                    <p class="config-preview-stat-value">${enabledRules.length}</p>
                    <p class="config-preview-stat-label">有効ルール</p>
                </div>
                <div class="config-preview-stat">
                    <p class="config-preview-stat-value">${config.target_settings?.file_extensions?.length || 'All'}</p>
                    <p class="config-preview-stat-label">対象拡張子</p>
                </div>
            </div>
            <div class="config-preview-rules">
                ${enabledRules.slice(0, 5).map(rule => `
                    <div class="config-preview-rule">
                        <div class="config-preview-rule-status${rule.enabled === false ? ' disabled' : ''}"></div>
                        <div class="config-preview-rule-content">
                            <p class="config-preview-rule-text">
                                ${Utils.escapeHtml(rule.from)} 
                                <span class="config-preview-rule-arrow">→</span> 
                                ${Utils.escapeHtml(rule.to)}
                            </p>
                        </div>
                    </div>
                `).join('')}
                ${enabledRules.length > 5 ? `
                    <div style="text-align: center; padding: var(--spacing-sm); color: var(--text-secondary); font-size: var(--font-size-xs);">
                        ... 他 ${enabledRules.length - 5} ルール
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    /**
     * ユーティリティメソッド
     */
    async getConfigHistory() {
        // 仮実装：将来はelectronAPIから取得
        return [
            {
                name: 'Web開発用設定',
                path: '/path/to/web-dev.json',
                description: 'HTML, CSS, JavaScript開発用',
                lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000),
                rulesCount: 5
            },
            {
                name: 'CSS モダン化',
                path: '/path/to/css-modern.json',
                description: 'CSSプロパティの近代化',
                lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                rulesCount: 8
            }
        ];
    }
    
    generateDefaultConfigName() {
        const now = new Date();
        return `設定_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    }
    
    formatDate(date) {
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (24 * 60 * 60 * 1000));
        
        if (days === 0) return '今日';
        if (days === 1) return '昨日';
        if (days < 7) return `${days}日前`;
        
        return date.toLocaleDateString('ja-JP');
    }
    
    /**
     * プレースホルダーメソッド（段階的実装）
     */
    handleAddRule() { this.addReplacementRule(); }
    /**
     * 置換実行処理
     */
    async handleExecute() {
        if (this.isProcessing) {
            console.warn('⚠️ 処理中のため実行をスキップ');
            return;
        }
        
        try {
            // 実行条件チェック
            if (!this.validateExecutionConditions()) {
                return;
            }
            
            // 設定を準備
            const config = this.buildExecutionConfig();
            
            // ExecutionControllerに実行を委譲
            await this.executionController.executeReplacement(config);
            
        } catch (error) {
            console.error('❌ 実行エラー:', error);
            this.showError(`実行エラー: ${error.message}`);
        }
    }
    
    /**
     * 実行条件をバリデーション
     */
    validateExecutionConditions() {
        // フォルダ選択チェック
        if (!this.elements.folderPath?.value?.trim()) {
            this.showError('対象フォルダを選択してください');
            this.elements.browseBtn?.focus();
            return false;
        }
        
        // アクティブなルールチェック
        const activeRules = this.rules.filter(rule => rule.enabled);
        if (activeRules.length === 0) {
            this.showError('有効な置換ルールが設定されていません');
            this.elements.addRuleBtn?.focus();
            return false;
        }
        
        return true;
    }
    
    /**
     * 実行設定を構築
     */
    buildExecutionConfig() {
        return {
            targetFolder: this.elements.folderPath?.value?.trim(),
            fileExtensions: this.elements.fileExtensions?.value?.trim(),
            rules: this.rules.map(rule => ({
                id: rule.id,
                from: rule.from,
                to: rule.to,
                enabled: rule.enabled,
                description: rule.description || ''
            }))
        };
    }
    handlePause() { 
        // 進捗表示から処理される
        console.log('⏸️ 一時停止要求'); 
    }
    
    handleStop() { 
        // 進捗表示から処理される
        console.log('⏹️ 停止要求'); 
    }
    
    handleExportResults() { 
        // 結果表示から処理される
        console.log('📤 エクスポート要求'); 
    }
    
    handleCopySummary() { 
        // 結果表示から処理される
        console.log('📋 コピー要求'); 
    }
    handleCloseResult() { /* TODO: Task 3.3で実装予定 */ }
    handleKeydown(event) { /* TODO: 詳細実装予定 */ }
    handleResize() { /* TODO: 詳細実装予定 */ }
    
    /**
     * テンプレート一覧読み込み・表示
     */
    async loadTemplateGrid() {
        try {
            // replacement-ui.jsからテンプレートを取得
            const templates = window.ReplacementUI ? 
                (new ReplacementUI()).templates : 
                await this.getDefaultTemplates();
            
            const templateGrid = this.elements.templateGrid;
            if (!templateGrid) return;
            
            templateGrid.innerHTML = '';
            
            Object.entries(templates).forEach(([key, template]) => {
                const templateCard = this.createTemplateCard(key, template);
                templateGrid.appendChild(templateCard);
            });
            
        } catch (error) {
            console.error('Template grid load failed:', error);
            if (this.elements.templateGrid) {
                this.elements.templateGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: var(--spacing-lg); color: var(--color-error);">
                        テンプレートの読み込みに失敗しました
                    </div>
                `;
            }
        }
    }
    
    /**
     * テンプレートカード作成
     */
    createTemplateCard(key, template) {
        const div = document.createElement('div');
        div.className = 'template-card';
        div.setAttribute('data-template-key', key);
        div.setAttribute('role', 'button');
        div.setAttribute('tabindex', '0');
        div.setAttribute('aria-label', `${template.name}テンプレートを選択`);
        
        div.innerHTML = `
            <div class="template-card-header">
                <span class="template-card-icon">${template.icon || '📋'}</span>
                <h4 class="template-card-title">${Utils.escapeHtml(template.name)}</h4>
            </div>
            <p class="template-card-description">${Utils.escapeHtml(template.description)}</p>
            <div class="template-card-meta">
                <span class="template-card-category">${template.category || 'general'}</span>
                <span class="template-card-rules-count">${template.rules.length} ルール</span>
            </div>
        `;
        
        // クリック・キーボードイベント
        const selectTemplate = () => {
            this.selectTemplate(key, template);
        };
        
        div.addEventListener('click', selectTemplate);
        div.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectTemplate();
            }
        });
        
        return div;
    }
    
    /**
     * テンプレート選択
     */
    selectTemplate(key, template) {
        // 既存の選択をクリア
        this.elements.templateGrid?.querySelectorAll('.template-card.selected')
            .forEach(card => card.classList.remove('selected'));
        
        // 新しい選択を追加
        const selectedCard = this.elements.templateGrid?.querySelector(`[data-template-key="${key}"]`);
        selectedCard?.classList.add('selected');
        
        // プレビュー表示
        this.showTemplatePreview(template);
        
        // 適用ボタンを有効化
        if (this.elements.applyTemplateBtn) {
            this.elements.applyTemplateBtn.disabled = false;
            this.elements.applyTemplateBtn.setAttribute('data-selected-template', key);
        }
        
        // アナウンス
        this.announceToScreenReader(`${template.name}テンプレートが選択されました`);
    }
    
    /**
     * テンプレートプレビュー表示
     */
    showTemplatePreview(template) {
        const previewContainer = this.elements.templatePreview;
        if (!previewContainer) return;
        
        const previewHTML = this.generateConfigPreview({ replacements: template.rules });
        previewContainer.innerHTML = previewHTML;
        previewContainer.style.display = 'block';
    }
    
    /**
     * テンプレート適用
     */
    async handleApplyTemplate() {
        try {
            const selectedTemplateKey = this.elements.applyTemplateBtn?.getAttribute('data-selected-template');
            if (!selectedTemplateKey) return;
            
            const templates = window.ReplacementUI ? 
                (new ReplacementUI()).templates : 
                await this.getDefaultTemplates();
            
            const template = templates[selectedTemplateKey];
            if (!template) return;
            
            // 確認ダイアログ
            if (this.rules.length > 0) {
                const shouldReplace = confirm(
                    `現在のルールを${template.name}のテンプレートで置き換えますか？\n\n` +
                    `${template.description}\n\n` +
                    `※ 現在のルールは失われます。`
                );
                
                if (!shouldReplace) return;
            }
            
            // テンプレート適用
            this.applyTemplateRules(template);
            
            // ダイアログを閉じる
            this.closeAllConfigDialogs();
            
            // アナウンス
            this.announceToScreenReader(`${template.name}テンプレートが適用されました`);
            
        } catch (error) {
            console.error('Template apply failed:', error);
            this.showError('テンプレートの適用に失敗しました');
        }
    }
    
    /**
     * テンプレートルール適用
     */
    applyTemplateRules(template) {
        // 既存ルールをクリア
        this.rules = [];
        this.elements.rulesContainer.innerHTML = '';
        
        // テンプレートのルールを追加
        template.rules.forEach(rule => {
            this.addReplacementRule(rule.from, rule.to, true);
        });
        
        // プレビュー更新
        this.updatePreviewDebounced();
    }
    
    /**
     * 設定保存プレビュー更新
     */
    updateSaveConfigPreview() {
        const previewContainer = this.elements.saveConfigPreview;
        if (!previewContainer) return;
        
        const config = this.getCurrentConfig();
        const previewHTML = this.generateConfigPreview(config);
        previewContainer.innerHTML = previewHTML;
    }
    
    /**
     * 現在の設定を取得
     */
    getCurrentConfig() {
        return {
            app_info: {
                name: this.elements.configName?.value || 'Untitled Config',
                description: this.elements.configDescription?.value || '',
                created_at: new Date().toISOString(),
                version: '1.0.0'
            },
            replacements: this.rules.map(rule => ({
                from: rule.from,
                to: rule.to,
                enabled: rule.enabled,
                description: rule.description || ''
            })),
            target_settings: {
                file_extensions: this.elements.fileExtensions?.value.split(',').map(s => s.trim()) || [],
                folder_path: this.elements.folderPath?.value || ''
            }
        };
    }
    
    /**
     * 設定保存確認
     */
    async handleSaveConfigConfirm() {
        try {
            const config = this.getCurrentConfig();
            const configName = this.elements.configName?.value?.trim();
            
            if (!configName) {
                this.showError('設定名を入力してください');
                this.elements.configName?.focus();
                return;
            }
            
            // 設定を保存（仮実装）
            await this.saveConfigToFile(config, configName);
            
            // ダイアログを閉じる
            this.closeAllConfigDialogs();
            
            // アナウンス
            this.announceToScreenReader(`設定「${configName}」が保存されました`);
            
        } catch (error) {
            console.error('Config save failed:', error);
            this.showError('設定の保存に失敗しました');
        }
    }
    
    /**
     * 設定読み込み確認
     */
    async handleLoadConfigConfirm() {
        try {
            // 現在選択されている設定を取得
            const selectedConfig = this.getSelectedConfigFromHistory();
            if (!selectedConfig) {
                this.showError('設定を選択してください');
                return;
            }
            
            // 設定を読み込み
            await this.loadConfigFromHistory(selectedConfig);
            
            // ダイアログを閉じる
            this.closeAllConfigDialogs();
            
            // アナウンス
            this.announceToScreenReader(`設定「${selectedConfig.name}」が読み込まれました`);
            
        } catch (error) {
            console.error('Config load failed:', error);
            this.showError('設定の読み込みに失敗しました');
        }
    }
    
    /**
     * 設定ファイル選択
     */
    async handleSelectConfigFile() {
        try {
            // ファイルダイアログを開く（仮実装）
            const filePath = await this.showFileDialog();
            if (!filePath) return;
            
            // ファイルを読み込み
            const config = await this.loadConfigFromFile(filePath);
            
            // プレビュー表示
            this.showConfigPreviewForLoad(config);
            
        } catch (error) {
            console.error('Config file select failed:', error);
            this.showError('設定ファイルの選択に失敗しました');
        }
    }
    
    /**
     * 設定管理機能 - 完全実装
     */
    
    /**
     * ドロップされた設定ファイル処理
     */
    async handleConfigFileDropped(file) {
        try {
            // ファイル読み込み
            const content = await this.readConfigFile(file);
            const config = JSON.parse(content);
            
            // バリデーション
            const validation = this.validateConfig(config);
            this.showConfigValidation(validation);
            
            // プレビュー表示
            this.showConfigPreviewForLoad(config);
            
            // 読み込み確認ボタンを有効化
            if (this.elements.loadConfigConfirmBtn) {
                this.elements.loadConfigConfirmBtn.disabled = false;
                this.elements.loadConfigConfirmBtn.setAttribute('data-loaded-config', JSON.stringify(config));
            }
            
        } catch (error) {
            console.error('Dropped config file processing failed:', error);
            this.showError('設定ファイルの読み込みに失敗しました');
        }
    }
    
    /**
     * 設定ファイル読み込み
     */
    async readConfigFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('ファイル読み込みエラー'));
            reader.readAsText(file, 'utf-8');
        });
    }
    
    /**
     * 設定バリデーション
     */
    validateConfig(config) {
        const errors = [];
        const warnings = [];
        
        // 基本構造チェック
        if (!config.replacements || !Array.isArray(config.replacements)) {
            errors.push('置換ルール (replacements) が見つかりません');
        } else {
            // 各ルールのチェック
            config.replacements.forEach((rule, index) => {
                if (!rule.from && rule.enabled !== false) {
                    warnings.push(`ルール ${index + 1}: 検索文字列が空です`);
                }
                if (!rule.to && rule.enabled !== false) {
                    warnings.push(`ルール ${index + 1}: 置換文字列が空です`);
                }
            });
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            type: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'success'
        };
    }
    
    /**
     * 設定バリデーション結果表示
     */
    showConfigValidation(validation) {
        const container = this.elements.configValidationResult;
        if (!container) return;
        
        container.style.display = 'block';
        container.className = `config-validation-result ${validation.type}`;
        
        const icon = validation.type === 'error' ? '❌' : validation.type === 'warning' ? '⚠️' : '✅';
        const title = validation.type === 'error' ? 'エラー' : validation.type === 'warning' ? '警告' : '設定は有効です';
        
        container.innerHTML = `
            <div class="config-validation-header">
                <span class="config-validation-icon">${icon}</span>
                <h4 class="config-validation-title">${title}</h4>
            </div>
            ${validation.errors.length > 0 ? `
                <ul class="config-validation-list">
                    ${validation.errors.map(error => `<li class="config-validation-item">${Utils.escapeHtml(error)}</li>`).join('')}
                </ul>
            ` : ''}
            ${validation.warnings.length > 0 ? `
                <ul class="config-validation-list">
                    ${validation.warnings.map(warning => `<li class="config-validation-item">${Utils.escapeHtml(warning)}</li>`).join('')}
                </ul>
            ` : ''}
        `;
    }
    
    /**
     * 読み込み用設定プレビュー表示
     */
    showConfigPreviewForLoad(config) {
        const previewContainer = this.elements.configPreview;
        if (!previewContainer) return;
        
        const previewHTML = this.generateConfigPreview(config);
        previewContainer.innerHTML = previewHTML;
        previewContainer.style.display = 'block';
        
        // 読み込みボタンを有効化
        if (this.elements.loadConfigConfirmBtn) {
            this.elements.loadConfigConfirmBtn.disabled = false;
        }
    }
    
    /**
     * 履歴から選択された設定を取得
     */
    getSelectedConfigFromHistory() {
        const selectedItem = this.elements.configHistory?.querySelector('.config-history-item.selected');
        if (!selectedItem) return null;
        
        const configPath = selectedItem.getAttribute('data-config-path');
        return {
            name: selectedItem.querySelector('.config-history-name')?.textContent || 'Unknown',
            path: configPath
        };
    }
    
    /**
     * 履歴から設定読み込み
     */
    async loadConfigFromHistory(configItem) {
        try {
            // 実際の実装では、configItem.pathからファイルを読み込む
            // 仮実装：サンプル設定を生成
            const sampleConfig = await this.generateSampleConfig(configItem.name);
            await this.applyConfig(sampleConfig);
            
        } catch (error) {
            console.error('Config load from history failed:', error);
            throw error;
        }
    }
    
    /**
     * 設定適用
     */
    async applyConfig(config) {
        try {
            // ルールをクリア
            this.rules = [];
            this.elements.rulesContainer.innerHTML = '';
            
            // フォルダパスを設定
            if (config.target_settings?.folder_path) {
                this.elements.folderPath.value = config.target_settings.folder_path;
            }
            
            // ファイル拡張子を設定
            if (config.target_settings?.file_extensions) {
                const extensions = Array.isArray(config.target_settings.file_extensions) 
                    ? config.target_settings.file_extensions.join(',')
                    : config.target_settings.file_extensions;
                this.elements.fileExtensions.value = extensions;
            }
            
            // 置換ルールを適用
            if (config.replacements && Array.isArray(config.replacements)) {
                config.replacements.forEach(rule => {
                    this.addReplacementRule(
                        rule.from || '', 
                        rule.to || '', 
                        rule.enabled !== false
                    );
                });
            }
            
            // プレビュー更新
            this.updatePreviewDebounced();
            
        } catch (error) {
            console.error('Config apply failed:', error);
            throw error;
        }
    }
    
    /**
     * サンプル設定生成（開発用）
     */
    async generateSampleConfig(configName) {
        const sampleConfigs = {
            'Web開発用設定': {
                app_info: {
                    name: 'Web開発用設定',
                    description: 'HTML, CSS, JavaScript開発用置換設定'
                },
                replacements: [
                    { from: 'var ', to: 'const ', enabled: true },
                    { from: 'http://', to: 'https://', enabled: true },
                    { from: 'old-class', to: 'new-class', enabled: true }
                ],
                target_settings: {
                    file_extensions: ['.html', '.css', '.js'],
                    folder_path: ''
                }
            },
            'CSS モダン化': {
                app_info: {
                    name: 'CSS モダン化',
                    description: 'CSSプロパティの近代化設定'
                },
                replacements: [
                    { from: 'display: -webkit-box;', to: 'display: flex;', enabled: true },
                    { from: 'float: left;', to: 'display: flex;', enabled: true },
                    { from: 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);', 
                      to: 'position: absolute; inset: 0; margin: auto;', enabled: true }
                ],
                target_settings: {
                    file_extensions: ['.css', '.scss'],
                    folder_path: ''
                }
            }
        };
        
        return sampleConfigs[configName] || sampleConfigs['Web開発用設定'];
    }
    
    /**
     * 設定ファイル保存（仮実装）
     */
    async saveConfigToFile(config, configName) {
        try {
            // 実際の実装では electronAPI.saveConfigFile を使用
            if (window.electronAPI?.saveConfigFile) {
                const filePath = await window.electronAPI.saveConfigFile(config, configName);
                console.log('Config saved to:', filePath);
            } else {
                // 開発用：ローカルストレージに保存
                const savedConfigs = JSON.parse(localStorage.getItem('mgr-saved-configs') || '[]');
                const newConfig = {
                    ...config,
                    id: Date.now(),
                    name: configName,
                    saved_at: new Date().toISOString()
                };
                savedConfigs.push(newConfig);
                localStorage.setItem('mgr-saved-configs', JSON.stringify(savedConfigs));
                console.log('Config saved to localStorage:', configName);
            }
            
        } catch (error) {
            console.error('Config save failed:', error);
            throw error;
        }
    }
    
    /**
     * 設定ファイル読み込み（仮実装）
     */
    async loadConfigFromFile(filePath) {
        try {
            // 実際の実装では electronAPI.loadConfigFile を使用
            if (window.electronAPI?.loadConfigFile) {
                return await window.electronAPI.loadConfigFile(filePath);
            } else {
                // 開発用：デフォルト設定を返す
                return await this.generateSampleConfig('Web開発用設定');
            }
            
        } catch (error) {
            console.error('Config load failed:', error);
            throw error;
        }
    }
    
    /**
     * ファイルダイアログ表示（仮実装）
     */
    async showFileDialog() {
        try {
            // 実際の実装では electronAPI.showOpenDialog を使用
            if (window.electronAPI?.showOpenDialog) {
                return await window.electronAPI.showOpenDialog({
                    filters: [
                        { name: 'Multi Grep Replacer Config', extensions: ['json', 'mgr'] },
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });
            } else {
                // 開発用：ファイル入力要素を作成
                return new Promise((resolve) => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json,.mgr';
                    input.onchange = (e) => {
                        const file = e.target.files[0];
                        resolve(file ? file.name : null);
                    };
                    input.click();
                });
            }
            
        } catch (error) {
            console.error('File dialog failed:', error);
            throw error;
        }
    }
    
    /**
     * 履歴から設定選択
     */
    selectConfigFromHistory(item) {
        // 既存の選択をクリア
        this.elements.configHistory?.querySelectorAll('.config-history-item.selected')
            .forEach(el => el.classList.remove('selected'));
        
        // 新しい選択を追加
        const historyItem = this.elements.configHistory?.querySelector(`[data-config-path="${item.path}"]`);
        historyItem?.classList.add('selected');
        
        // 読み込み確認ボタンを有効化
        if (this.elements.loadConfigConfirmBtn) {
            this.elements.loadConfigConfirmBtn.disabled = false;
        }
        
        // アナウンス
        this.announceToScreenReader(`設定「${item.name}」が選択されました`);
    }
    
    /**
     * 履歴から設定プレビュー
     */
    async previewConfigFromHistory(item) {
        try {
            const config = await this.generateSampleConfig(item.name);
            this.showConfigPreviewForLoad(config);
            
        } catch (error) {
            console.error('Config preview failed:', error);
            this.showError('設定のプレビューに失敗しました');
        }
    }
    
    /**
     * 履歴から設定削除
     */
    async deleteConfigFromHistory(item) {
        try {
            const shouldDelete = confirm(`設定「${item.name}」を履歴から削除しますか？`);
            if (!shouldDelete) return;
            
            // 履歴アイテムを削除
            const historyItem = this.elements.configHistory?.querySelector(`[data-config-path="${item.path}"]`);
            historyItem?.remove();
            
            // アナウンス
            this.announceToScreenReader(`設定「${item.name}」が履歴から削除されました`);
            
        } catch (error) {
            console.error('Config delete failed:', error);
            this.showError('設定の削除に失敗しました');
        }
    }
    
    /**
     * デフォルトテンプレート取得（fallback）
     */
    async getDefaultTemplates() {
        return {
            'web-development': {
                name: 'Web Development',
                icon: '🌐',
                description: 'Web開発でよく使用される置換パターン',
                category: 'development',
                rules: [
                    { from: 'var ', to: 'const ', description: 'JavaScript変数の近代化' },
                    { from: 'http://', to: 'https://', description: 'HTTPS強制' },
                    { from: 'className="old-btn"', to: 'className="btn btn-primary"', description: 'ボタンクラス更新' }
                ]
            },
            'css-modernization': {
                name: 'CSS Modernization',
                icon: '🎨',
                description: 'CSSプロパティと値の近代化',
                category: 'styling',
                rules: [
                    { from: 'display: -webkit-box;', to: 'display: flex;', description: '古いFlexbox構文を置換' },
                    { from: 'float: left;', to: 'display: flex;', description: 'フロートをFlexboxに変換' }
                ]
            }
        };
    }
    
    /**
     * エラー表示
     */
    showError(message) {
        // 簡易エラー表示（実際の実装では専用のエラーモーダルを使用）
        alert(`エラー: ${message}`);
        console.error(message);
        this.announceToScreenReader(message);
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        this.abortController.abort();
        
        // 実行制御クラスのクリーンアップ
        if (this.executionController) {
            this.executionController.destroy();
            this.executionController = null;
        }
        
        if (this.progressDisplay) {
            this.progressDisplay.destroy();
            this.progressDisplay = null;
        }
        
        if (this.resultsDisplay) {
            this.resultsDisplay.destroy();
            this.resultsDisplay = null;
        }
        
        this.rules = [];
        this.currentConfig = {};
        console.log('UIController: Destroyed');
    }
}

// モジュールエクスポート
window.UIController = UIController;