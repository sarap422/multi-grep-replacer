/**
 * 置換ルール管理UI - Multi Grep Replacer
 * 置換ルールの動的管理・ドラッグ&ドロップ並び替え・テンプレート機能
 */

class ReplacementUI {
    constructor() {
        this.rules = [];
        this.ruleIdCounter = 1;
        this.templates = {};
        
        // ドラッグ&ドロップ状態
        this.draggedElement = null;
        this.draggedIndex = -1;
        
        // コールバック関数
        this.onRulesChanged = null;
        this.onTemplateSelected = null;
        
        // DOM要素への参照
        this.elements = {};
        
        // イベントリスナーのAbortController
        this.abortController = new AbortController();
        
        // 初期化
        this.initialize();
    }
    
    /**
     * 初期化
     */
    initialize() {
        console.log('ReplacementUI: Initializing...');
        
        // DOM要素のキャッシュ
        this.cacheElements();
        
        // テンプレートの読み込み
        this.loadTemplates();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // 初期ルールを追加
        this.addRule();
        
        console.log('ReplacementUI: Initialization complete');
    }
    
    /**
     * DOM要素キャッシュ
     */
    cacheElements() {
        this.elements = {
            templateSelect: document.getElementById('templateSelect'),
            rulesContainer: document.getElementById('rulesContainer'),
            addRuleBtn: document.getElementById('addRuleBtn'),
            rulesSection: document.querySelector('.rules-section')
        };
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        const signal = this.abortController.signal;
        
        // テンプレート選択
        this.elements.templateSelect?.addEventListener('change', 
            this.handleTemplateChange.bind(this), { signal });
        
        // ルール追加ボタン
        this.elements.addRuleBtn?.addEventListener('click', 
            this.handleAddRuleClick.bind(this), { signal });
        
        // キーボードショートカット
        document.addEventListener('keydown', 
            this.handleKeydown.bind(this), { signal });
    }
    
    /**
     * テンプレート読み込み
     */
    async loadTemplates() {
        try {
            // デフォルトテンプレートを定義（アイコン追加）
            this.templates = {
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
                        { from: 'float: left;', to: 'display: flex;', description: 'フロートをFlexboxに変換' },
                        { from: 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);', 
                          to: 'position: absolute; inset: 0; margin: auto;', description: '現代的なセンタリング' }
                    ]
                },
                'variable-rename': {
                    name: 'Variable Rename',
                    icon: '🏷️',
                    description: '変数名の一括リネーム',
                    category: 'refactoring',
                    rules: [
                        { from: 'oldVariableName', to: 'newVariableName', description: '変数名変更' },
                        { from: 'OLD_CONSTANT', to: 'NEW_CONSTANT', description: '定数名変更' }
                    ]
                },
                'framework-migration': {
                    name: 'Framework Migration',
                    icon: '🚀',
                    description: 'フレームワーク移行時の一括変更',
                    category: 'migration',
                    rules: [
                        { from: 'React.Component', to: 'Component', description: 'React import 簡略化' },
                        { from: 'class ', to: 'function ', description: '関数コンポーネント化' },
                        { from: 'componentDidMount', to: 'useEffect', description: 'Hooks移行' }
                    ]
                },
                'api-modernization': {
                    name: 'API Modernization',
                    icon: '🔗',
                    description: 'API呼び出しの近代化',
                    category: 'api',
                    rules: [
                        { from: 'XMLHttpRequest', to: 'fetch', description: 'Fetch API移行' },
                        { from: '$.ajax', to: 'fetch', description: 'jQuery Ajax からFetch移行' },
                        { from: 'async: false', to: '', description: '同期Ajax削除' }
                    ]
                }
            };
            
            // テンプレート選択肢を更新
            this.updateTemplateOptions();
            
        } catch (error) {
            console.error('Template loading failed:', error);
        }
    }
    
    /**
     * テンプレート選択肢更新
     */
    updateTemplateOptions() {
        const select = this.elements.templateSelect;
        if (!select) return;
        
        // 既存のオプションをクリア（最初のオプション以外）
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        // テンプレートオプションを追加
        Object.entries(this.templates).forEach(([key, template]) => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = template.name;
            option.title = template.description;
            select.appendChild(option);
        });
    }
    
    /**
     * テンプレート変更処理
     */
    handleTemplateChange(event) {
        const templateKey = event.target.value;
        
        if (!templateKey) return;
        
        const template = this.templates[templateKey];
        if (!template) return;
        
        // 確認ダイアログ
        if (this.rules.length > 0) {
            const shouldReplace = confirm(
                `現在のルールを${template.name}のテンプレートで置き換えますか？\n\n` +
                `${template.description}\n\n` +
                `※ 現在のルールは失われます。`
            );
            
            if (!shouldReplace) {
                // 選択をリセット
                event.target.value = '';
                return;
            }
        }
        
        // テンプレートを適用
        this.applyTemplate(template);
        
        // 選択をリセット
        event.target.value = '';
        
        // アナウンス
        this.announceToScreenReader(`${template.name}テンプレートが適用されました`);
    }
    
    /**
     * テンプレート適用
     */
    applyTemplate(template) {
        // 既存ルールをクリア
        this.clearAllRules();
        
        // テンプレートのルールを追加
        template.rules.forEach(rule => {
            this.addRule(rule.from, rule.to, true, rule.description);
        });
        
        // テンプレート適用アニメーション
        this.elements.rulesContainer?.classList.add('fade-in');
        setTimeout(() => {
            this.elements.rulesContainer?.classList.remove('fade-in');
        }, 500);
    }
    
    /**
     * ルール追加ボタンクリック処理
     */
    handleAddRuleClick() {
        this.addRule();
        
        // 新しいルールのFromフィールドにフォーカス
        const newRule = this.elements.rulesContainer?.lastElementChild;
        const fromInput = newRule?.querySelector('[data-rule-from]');
        fromInput?.focus();
    }
    
    /**
     * キーボードショートカット処理
     */
    handleKeydown(event) {
        // Ctrl/Cmd + R: ルール追加
        if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
            event.preventDefault();
            this.handleAddRuleClick();
        }
        
        // Escape: フォーカスされているルールの編集終了
        if (event.key === 'Escape') {
            const activeInput = document.activeElement;
            if (activeInput?.matches('[data-rule-from], [data-rule-to]')) {
                activeInput.blur();
            }
        }
    }
    
    /**
     * ルール追加
     */
    addRule(from = '', to = '', enabled = true, description = '') {
        const ruleId = `rule_${this.ruleIdCounter++}`;
        const rule = {
            id: ruleId,
            from,
            to,
            enabled,
            description,
            order: this.rules.length
        };
        
        this.rules.push(rule);
        
        // DOM要素作成
        const ruleElement = this.createRuleElement(rule);
        this.elements.rulesContainer?.appendChild(ruleElement);
        
        // 表示アニメーション
        ruleElement.classList.add('slide-in-up');
        setTimeout(() => {
            ruleElement.classList.remove('slide-in-up');
        }, 300);
        
        // コールバック実行
        this.notifyRulesChanged();
        
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
        div.setAttribute('draggable', 'true');
        div.setAttribute('tabindex', '0');
        div.setAttribute('aria-label', `置換ルール: ${rule.from || '未設定'} を ${rule.to || '未設定'} に置換`);
        
        div.innerHTML = `
            <div class="rule-content">
                <div class="rule-drag-handle" aria-label="ドラッグハンドル" role="button" tabindex="-1">
                    ⋮⋮
                </div>
                <div class="rule-enable">
                    <label class="checkbox-wrapper">
                        <input 
                            type="checkbox" 
                            id="enable_${rule.id}"
                            ${rule.enabled ? 'checked' : ''}
                            data-rule-enable
                            aria-label="このルールを有効にする">
                        <span class="checkbox-custom"></span>
                    </label>
                </div>
                <div class="rule-inputs">
                    <div class="form-group">
                        <label for="from_${rule.id}" class="form-label">From:</label>
                        <input 
                            type="text" 
                            id="from_${rule.id}"
                            class="form-input form-input-animated"
                            placeholder="検索文字列"
                            value="${Utils.escapeHtml(rule.from)}"
                            data-rule-from
                            aria-describedby="from_${rule.id}_help">
                        <div id="from_${rule.id}_help" class="sr-only">置換対象の文字列を入力してください</div>
                    </div>
                    <div class="form-group">
                        <label for="to_${rule.id}" class="form-label">To:</label>
                        <input 
                            type="text" 
                            id="to_${rule.id}"
                            class="form-input form-input-animated"
                            placeholder="置換文字列"
                            value="${Utils.escapeHtml(rule.to)}"
                            data-rule-to
                            aria-describedby="to_${rule.id}_help">
                        <div id="to_${rule.id}_help" class="sr-only">置換後の文字列を入力してください</div>
                    </div>
                </div>
                <div class="rule-actions">
                    <button 
                        type="button"
                        class="btn btn-sm btn-outline btn-hover-lift"
                        data-rule-delete
                        aria-label="このルールを削除"
                        title="ルールを削除">🗑️</button>
                </div>
            </div>
            ${rule.description ? `<div class="rule-description">${Utils.escapeHtml(rule.description)}</div>` : ''}
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
            this.updateRuleAriaLabel(element, rule);
            this.notifyRulesChanged();
            this.announceToScreenReader(`ルール${rule.enabled ? '有効' : '無効'}化: ${rule.from}`);
        }, { signal });
        
        // From入力
        const fromInput = element.querySelector('[data-rule-from]');
        fromInput?.addEventListener('input', 
            Utils.debounce((e) => {
                rule.from = e.target.value;
                this.updateRuleAriaLabel(element, rule);
                this.notifyRulesChanged();
            }, 300), { signal });
        
        // To入力
        const toInput = element.querySelector('[data-rule-to]');
        toInput?.addEventListener('input', 
            Utils.debounce((e) => {
                rule.to = e.target.value;
                this.updateRuleAriaLabel(element, rule);
                this.notifyRulesChanged();
            }, 300), { signal });
        
        // 削除ボタン
        const deleteBtn = element.querySelector('[data-rule-delete]');
        deleteBtn?.addEventListener('click', () => {
            this.deleteRule(rule.id);
        }, { signal });
        
        // ドラッグ&ドロップ
        this.setupRuleDragAndDrop(element, rule);
        
        // キーボードナビゲーション
        this.setupRuleKeyboardNavigation(element, rule);
    }
    
    /**
     * ルールのドラッグ&ドロップ設定
     */
    setupRuleDragAndDrop(element, rule) {
        const signal = this.abortController.signal;
        
        element.addEventListener('dragstart', (e) => {
            this.draggedElement = element;
            this.draggedIndex = this.getRuleIndex(rule.id);
            
            element.classList.add('drag-start');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', element.outerHTML);
            
            // ゴーストイメージの設定
            const dragImage = element.cloneNode(true);
            dragImage.style.opacity = '0.8';
            dragImage.style.transform = 'rotate(2deg)';
            document.body.appendChild(dragImage);
            e.dataTransfer.setDragImage(dragImage, e.offsetX, e.offsetY);
            
            setTimeout(() => {
                document.body.removeChild(dragImage);
            }, 0);
            
        }, { signal });
        
        element.addEventListener('dragend', () => {
            element.classList.remove('drag-start');
            this.draggedElement = null;
            this.draggedIndex = -1;
            
            // すべてのドロップインジケーターをクリア
            this.clearDropIndicators();
        }, { signal });
        
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            
            if (this.draggedElement && this.draggedElement !== element) {
                const afterElement = this.getDragAfterElement(e.clientY);
                this.showDropIndicator(element, afterElement);
            }
        }, { signal });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (this.draggedElement && this.draggedElement !== element) {
                const dropIndex = this.getRuleIndex(rule.id);
                this.moveRule(this.draggedIndex, dropIndex);
            }
            
            this.clearDropIndicators();
        }, { signal });
    }
    
    /**
     * ルールのキーボードナビゲーション設定
     */
    setupRuleKeyboardNavigation(element, rule) {
        const signal = this.abortController.signal;
        
        element.addEventListener('keydown', (e) => {
            // Delete/Backspace: ルール削除
            if ((e.key === 'Delete' || e.key === 'Backspace') && 
                !e.target.matches('input')) {
                e.preventDefault();
                this.deleteRule(rule.id);
            }
            
            // Arrow Up/Down: フォーカス移動
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const direction = e.key === 'ArrowUp' ? -1 : 1;
                this.moveFocusToRule(rule.id, direction);
            }
            
            // Enter/Space: 有効/無効切り替え
            if ((e.key === 'Enter' || e.key === ' ') && 
                !e.target.matches('input, button')) {
                e.preventDefault();
                const checkbox = element.querySelector('[data-rule-enable]');
                checkbox?.click();
            }
            
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
        
        // 削除確認（ルールに内容がある場合）
        const rule = this.rules[ruleIndex];
        if (rule.from.trim() || rule.to.trim()) {
            const shouldDelete = confirm(
                `ルールを削除しますか？\n\n` +
                `From: "${rule.from}"\n` +
                `To: "${rule.to}"\n\n` +
                `※ この操作は取り消せません。`
            );
            
            if (!shouldDelete) return;
        }
        
        // 削除アニメーション
        ruleElement.classList.add('scale-out');
        
        setTimeout(() => {
            this.rules.splice(ruleIndex, 1);
            ruleElement.remove();
            this.updateRuleOrder();
            this.notifyRulesChanged();
            this.announceToScreenReader(`ルールが削除されました`);
        }, 150);
    }
    
    /**
     * 全ルールクリア
     */
    clearAllRules() {
        this.rules = [];
        this.elements.rulesContainer.innerHTML = '';
        this.notifyRulesChanged();
    }
    
    /**
     * ルール移動
     */
    moveRule(fromIndex, toIndex) {
        if (fromIndex === toIndex) return;
        
        const [movedRule] = this.rules.splice(fromIndex, 1);
        this.rules.splice(toIndex, 0, movedRule);
        
        this.updateRuleOrder();
        this.renderRules();
        this.notifyRulesChanged();
        
        this.announceToScreenReader(`ルールが移動されました`);
    }
    
    /**
     * ルール順序更新
     */
    updateRuleOrder() {
        this.rules.forEach((rule, index) => {
            rule.order = index;
        });
    }
    
    /**
     * ルール一覧を再描画
     */
    renderRules() {
        const container = this.elements.rulesContainer;
        if (!container) return;
        
        container.innerHTML = '';
        
        this.rules.forEach(rule => {
            const element = this.createRuleElement(rule);
            container.appendChild(element);
        });
    }
    
    /**
     * ユーティリティメソッド群
     */
    getRuleIndex(ruleId) {
        return this.rules.findIndex(r => r.id === ruleId);
    }
    
    updateRuleAriaLabel(element, rule) {
        const fromText = rule.from || '未設定';
        const toText = rule.to || '未設定';
        const statusText = rule.enabled ? '有効' : '無効';
        element.setAttribute('aria-label', 
            `置換ルール (${statusText}): ${fromText} を ${toText} に置換`);
    }
    
    getDragAfterElement(y) {
        const draggableElements = [...this.elements.rulesContainer.querySelectorAll('.replacement-rule:not(.drag-start)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    showDropIndicator(targetElement, afterElement) {
        this.clearDropIndicators();
        
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        indicator.innerHTML = '<div class="drop-line"></div>';
        
        if (afterElement == null) {
            this.elements.rulesContainer.appendChild(indicator);
        } else {
            this.elements.rulesContainer.insertBefore(indicator, afterElement);
        }
    }
    
    clearDropIndicators() {
        this.elements.rulesContainer.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    }
    
    moveFocusToRule(currentRuleId, direction) {
        const currentIndex = this.getRuleIndex(currentRuleId);
        const newIndex = currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < this.rules.length) {
            const newRule = this.rules[newIndex];
            const newElement = document.querySelector(`[data-rule-id="${newRule.id}"]`);
            newElement?.focus();
        }
    }
    
    /**
     * ルール変更通知
     */
    notifyRulesChanged() {
        if (this.onRulesChanged) {
            this.onRulesChanged(this.rules);
        }
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
     * 現在の状態を取得
     */
    getState() {
        return {
            rules: this.rules.map(rule => ({ ...rule })), // ディープコピー
            ruleIdCounter: this.ruleIdCounter
        };
    }
    
    /**
     * 状態を設定
     */
    setState(state) {
        if (state.rules) {
            this.clearAllRules();
            this.ruleIdCounter = state.ruleIdCounter || 1;
            
            state.rules.forEach(rule => {
                this.addRule(rule.from, rule.to, rule.enabled, rule.description);
            });
        }
    }
    
    /**
     * バリデーション
     */
    validateRules() {
        const errors = [];
        
        this.rules.forEach((rule, index) => {
            if (!rule.from.trim() && rule.enabled) {
                errors.push(`ルール ${index + 1}: 検索文字列が空です`);
            }
            
            if (rule.from.trim() && !rule.to.trim() && rule.enabled) {
                errors.push(`ルール ${index + 1}: 置換文字列が空です`);
            }
        });
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * 有効なルールの取得
     */
    getValidRules() {
        return this.rules.filter(rule => 
            rule.enabled && 
            rule.from.trim() && 
            rule.to.trim()
        );
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        this.abortController.abort();
        this.onRulesChanged = null;
        this.onTemplateSelected = null;
        console.log('ReplacementUI: Destroyed');
    }
}

// モジュールエクスポート
window.ReplacementUI = ReplacementUI;