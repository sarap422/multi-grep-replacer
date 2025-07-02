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
     * プレースホルダーメソッド（将来実装）
     */
    handleTemplateChange() { /* TODO: 実装予定 */ }
    handleAddRule() { this.addReplacementRule(); }
    handleLoadConfig() { /* TODO: 実装予定 */ }
    handleSaveConfig() { /* TODO: 実装予定 */ }
    handleExecute() { /* TODO: 実装予定 */ }
    handlePause() { /* TODO: 実装予定 */ }
    handleStop() { /* TODO: 実装予定 */ }
    handleExportResults() { /* TODO: 実装予定 */ }
    handleCopySummary() { /* TODO: 実装予定 */ }
    handleCloseResult() { /* TODO: 実装予定 */ }
    handleKeydown(event) { /* TODO: 実装予定 */ }
    handleResize() { /* TODO: 実装予定 */ }
    showErrorMessage(message) { console.error(message); }
    
    /**
     * クリーンアップ
     */
    destroy() {
        this.abortController.abort();
        console.log('UIController: Destroyed');
    }
}

// モジュールエクスポート
window.UIController = UIController;