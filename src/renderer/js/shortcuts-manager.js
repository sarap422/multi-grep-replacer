/**
 * @fileoverview キーボードショートカット管理クラス
 * 
 * アプリケーション全体のキーボードショートカットを管理
 * OS標準ショートカットとの競合を回避
 */

class ShortcutsManager {
    constructor(uiController) {
        this.uiController = uiController;
        this.shortcuts = new Map();
        this.enabled = true;
        
        // デバッグ用ログ
        console.log('[ShortcutsManager] 初期化開始');
        
        this.initialize();
    }
    
    /**
     * ショートカットマネージャーの初期化
     */
    initialize() {
        // ショートカットを登録
        this.registerShortcuts();
        
        // グローバルキーイベントリスナーを設定
        this.setupEventListeners();
        
        console.log('[ShortcutsManager] 初期化完了', {
            registeredShortcuts: Array.from(this.shortcuts.keys())
        });
    }
    
    /**
     * ショートカットを登録
     */
    registerShortcuts() {
        // Ctrl/Cmd + S: 設定を保存
        this.addShortcut(['ctrl+s', 'cmd+s'], {
            description: '設定を保存',
            handler: () => {
                console.log('[ShortcutsManager] Ctrl+S: 設定保存');
                if (this.uiController && this.uiController.handleSaveConfig) {
                    this.uiController.handleSaveConfig();
                }
            }
        });
        
        // Ctrl/Cmd + O: 設定を読み込み
        this.addShortcut(['ctrl+o', 'cmd+o'], {
            description: '設定を読み込み',
            handler: () => {
                console.log('[ShortcutsManager] Ctrl+O: 設定読み込み');
                if (this.uiController && this.uiController.handleLoadConfig) {
                    this.uiController.handleLoadConfig();
                }
            }
        });
        
        // Ctrl/Cmd + E: 置換を実行
        this.addShortcut(['ctrl+e', 'cmd+e'], {
            description: '置換を実行',
            handler: () => {
                console.log('[ShortcutsManager] Ctrl+E: 置換実行');
                if (this.uiController && this.uiController.handleExecute) {
                    this.uiController.handleExecute();
                }
            }
        });
        
        // Ctrl/Cmd + N: 新しいルールを追加
        this.addShortcut(['ctrl+n', 'cmd+n'], {
            description: '新しいルールを追加',
            handler: () => {
                console.log('[ShortcutsManager] Ctrl+N: 新規ルール追加');
                if (this.uiController && this.uiController.addReplacementRule) {
                    this.uiController.addReplacementRule();
                }
            }
        });
        
        // Ctrl/Cmd + D: 現在のルールを複製
        this.addShortcut(['ctrl+d', 'cmd+d'], {
            description: '現在のルールを複製',
            handler: () => {
                console.log('[ShortcutsManager] Ctrl+D: ルール複製');
                this.duplicateCurrentRule();
            }
        });
        
        // Ctrl/Cmd + Shift + F: フォルダ選択
        this.addShortcut(['ctrl+shift+f', 'cmd+shift+f'], {
            description: 'フォルダを選択',
            handler: () => {
                console.log('[ShortcutsManager] Ctrl+Shift+F: フォルダ選択');
                const browseButton = document.getElementById('browse-folder');
                if (browseButton) {
                    browseButton.click();
                }
            }
        });
        
        // ESC: モーダルを閉じる / 操作をキャンセル
        this.addShortcut(['escape'], {
            description: 'モーダルを閉じる / キャンセル',
            handler: () => {
                console.log('[ShortcutsManager] ESC: キャンセル');
                this.handleEscape();
            }
        });
        
        // F1: ヘルプを表示
        this.addShortcut(['f1'], {
            description: 'ヘルプを表示',
            handler: () => {
                console.log('[ShortcutsManager] F1: ヘルプ表示');
                this.showShortcutHelp();
            }
        });
        
        // Tab / Shift+Tab: フォーカス移動（デフォルト動作を拡張）
        this.addShortcut(['tab'], {
            description: '次の要素にフォーカス',
            handler: (e) => {
                // デフォルト動作は維持し、必要に応じて拡張
                console.log('[ShortcutsManager] Tab: フォーカス移動');
            },
            preventDefault: false
        });
        
        // Ctrl/Cmd + Z: 元に戻す（将来実装用）
        this.addShortcut(['ctrl+z', 'cmd+z'], {
            description: '元に戻す',
            handler: () => {
                console.log('[ShortcutsManager] Ctrl+Z: 元に戻す（未実装）');
                // TODO: アンドゥ機能の実装
            }
        });
        
        // Ctrl/Cmd + Y: やり直し（将来実装用）
        this.addShortcut(['ctrl+y', 'cmd+y', 'ctrl+shift+z', 'cmd+shift+z'], {
            description: 'やり直し',
            handler: () => {
                console.log('[ShortcutsManager] Ctrl+Y: やり直し（未実装）');
                // TODO: リドゥ機能の実装
            }
        });
    }
    
    /**
     * ショートカットを追加
     * @param {Array<string>} keys - キーの組み合わせ配列
     * @param {Object} config - ショートカット設定
     */
    addShortcut(keys, config) {
        keys.forEach(key => {
            this.shortcuts.set(this.normalizeKey(key), {
                ...config,
                key: key
            });
        });
    }
    
    /**
     * キーを正規化
     * @param {string} key - キー文字列
     * @returns {string} 正規化されたキー
     */
    normalizeKey(key) {
        return key.toLowerCase()
            .replace('cmd', 'meta')
            .replace('command', 'meta')
            .replace('opt', 'alt')
            .replace('option', 'alt');
    }
    
    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            
            this.handleKeyDown(e);
        });
    }
    
    /**
     * キーダウンイベントを処理
     * @param {KeyboardEvent} event - キーボードイベント
     */
    handleKeyDown(event) {
        // 入力フィールドでのショートカットを制限
        const activeElement = document.activeElement;
        const isInputField = activeElement && (
            activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.contentEditable === 'true'
        );
        
        // キーの組み合わせを取得
        const key = this.getKeyCombo(event);
        const shortcut = this.shortcuts.get(key);
        
        if (shortcut) {
            // 入力フィールドでは一部のショートカットのみ有効
            if (isInputField && !this.isAllowedInInput(key)) {
                return;
            }
            
            console.log('[ShortcutsManager] ショートカット実行:', key);
            
            // デフォルトの動作を防ぐ
            if (shortcut.preventDefault !== false) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            // ハンドラーを実行
            if (shortcut.handler) {
                shortcut.handler(event);
            }
        }
    }
    
    /**
     * キーの組み合わせを取得
     * @param {KeyboardEvent} event - キーボードイベント
     * @returns {string} キーの組み合わせ
     */
    getKeyCombo(event) {
        const parts = [];
        
        if (event.ctrlKey || event.metaKey) {
            parts.push(navigator.platform.includes('Mac') ? 'meta' : 'ctrl');
        }
        if (event.shiftKey) parts.push('shift');
        if (event.altKey) parts.push('alt');
        
        // 特殊キーの処理
        const key = event.key.toLowerCase();
        if (key === ' ') {
            parts.push('space');
        } else if (key === 'escape' || key === 'esc') {
            parts.push('escape');
        } else if (key.startsWith('f') && /^f\d+$/.test(key)) {
            parts.push(key);
        } else if (key.length === 1) {
            parts.push(key);
        } else {
            parts.push(key.toLowerCase());
        }
        
        return parts.join('+');
    }
    
    /**
     * 入力フィールドで許可されるショートカットか確認
     * @param {string} key - キーの組み合わせ
     * @returns {boolean} 許可されるか
     */
    isAllowedInInput(key) {
        // ESCとCtrl/Cmd系のショートカットは入力フィールドでも有効
        const allowedInInput = [
            'escape',
            'ctrl+s', 'meta+s',
            'ctrl+o', 'meta+o',
            'ctrl+e', 'meta+e',
            'f1'
        ];
        
        return allowedInInput.includes(key);
    }
    
    /**
     * 現在のルールを複製
     */
    duplicateCurrentRule() {
        // フォーカスされているルールを探す
        const focusedRule = document.querySelector('.replacement-rule:focus-within');
        if (focusedRule) {
            const fromInput = focusedRule.querySelector('input[placeholder="検索文字列"]');
            const toInput = focusedRule.querySelector('input[placeholder="置換文字列"]');
            
            if (fromInput && toInput) {
                // 新しいルールを追加
                if (this.uiController && this.uiController.addReplacementRule) {
                    const newRule = this.uiController.addReplacementRule();
                    
                    // 値をコピー
                    setTimeout(() => {
                        const newFromInput = newRule.querySelector('input[placeholder="検索文字列"]');
                        const newToInput = newRule.querySelector('input[placeholder="置換文字列"]');
                        
                        if (newFromInput && newToInput) {
                            newFromInput.value = fromInput.value;
                            newToInput.value = toInput.value;
                            newFromInput.focus();
                        }
                    }, 100);
                }
            }
        }
    }
    
    /**
     * ESCキーの処理
     */
    handleEscape() {
        // モーダルが開いている場合は閉じる
        const modals = document.querySelectorAll('.modal-overlay.show');
        if (modals.length > 0) {
            modals.forEach(modal => {
                // モーダルを閉じるイベントを発火
                const closeButton = modal.querySelector('.close-button, [data-action="close"]');
                if (closeButton) {
                    closeButton.click();
                } else {
                    modal.classList.remove('show');
                }
            });
            return;
        }
        
        // 進行中の処理があればキャンセル
        if (this.uiController && this.uiController.cancelOperation) {
            this.uiController.cancelOperation();
        }
    }
    
    /**
     * ショートカットヘルプを表示
     */
    showShortcutHelp() {
        const helpContent = this.generateHelpContent();
        
        // ヘルプモーダルを作成
        const modal = document.createElement('div');
        modal.className = 'modal-overlay fade-in';
        modal.innerHTML = `
            <div class="modal-content shortcut-help scale-in">
                <div class="modal-header">
                    <h2>キーボードショートカット</h2>
                    <button class="close-button hover-scale" data-action="close">&times;</button>
                </div>
                <div class="modal-body">
                    ${helpContent}
                </div>
                <div class="modal-footer">
                    <button class="button primary hover-lift" data-action="close">閉じる</button>
                </div>
            </div>
        `;
        
        // スタイルを追加
        const style = document.createElement('style');
        style.textContent = `
            .shortcut-help {
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
            }
            
            .shortcut-group {
                margin-bottom: 20px;
            }
            
            .shortcut-group h3 {
                margin-bottom: 10px;
                color: var(--text-secondary);
                font-size: 14px;
                text-transform: uppercase;
            }
            
            .shortcut-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                background-color: var(--bg-secondary);
                border-radius: 4px;
                margin-bottom: 4px;
            }
            
            .shortcut-key {
                font-family: monospace;
                background-color: var(--bg-tertiary);
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                font-weight: bold;
            }
            
            .shortcut-description {
                color: var(--text-primary);
            }
        `;
        document.head.appendChild(style);
        
        // モーダルを表示
        document.body.appendChild(modal);
        
        // アニメーション後にshowクラスを追加
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
        
        // 閉じるボタンの処理
        modal.querySelectorAll('[data-action="close"]').forEach(button => {
            button.addEventListener('click', () => {
                modal.classList.remove('show');
                setTimeout(() => {
                    modal.remove();
                    style.remove();
                }, 300);
            });
        });
        
        // ESCキーで閉じる
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                modal.querySelector('[data-action="close"]').click();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
    
    /**
     * ヘルプコンテンツを生成
     * @returns {string} HTMLコンテンツ
     */
    generateHelpContent() {
        const isMac = navigator.platform.includes('Mac');
        const modKey = isMac ? 'Cmd' : 'Ctrl';
        
        const groups = {
            'ファイル操作': [
                { key: `${modKey}+S`, desc: '設定を保存' },
                { key: `${modKey}+O`, desc: '設定を読み込み' },
                { key: `${modKey}+Shift+F`, desc: 'フォルダを選択' }
            ],
            '置換操作': [
                { key: `${modKey}+E`, desc: '置換を実行' },
                { key: `${modKey}+N`, desc: '新しいルールを追加' },
                { key: `${modKey}+D`, desc: '現在のルールを複製' }
            ],
            'ナビゲーション': [
                { key: 'Tab', desc: '次の要素にフォーカス' },
                { key: 'Shift+Tab', desc: '前の要素にフォーカス' },
                { key: 'ESC', desc: 'モーダルを閉じる / キャンセル' }
            ],
            'その他': [
                { key: 'F1', desc: 'このヘルプを表示' }
                // { key: `${modKey}+Z`, desc: '元に戻す（将来実装）' },
                // { key: `${modKey}+Y`, desc: 'やり直し（将来実装）' }
            ]
        };
        
        let html = '';
        for (const [groupName, shortcuts] of Object.entries(groups)) {
            html += `
                <div class="shortcut-group">
                    <h3>${groupName}</h3>
                    ${shortcuts.map(s => `
                        <div class="shortcut-item">
                            <span class="shortcut-description">${s.desc}</span>
                            <span class="shortcut-key">${s.key}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }
        
        return html;
    }
    
    /**
     * ショートカットを有効化
     */
    enable() {
        this.enabled = true;
        console.log('[ShortcutsManager] ショートカット有効化');
    }
    
    /**
     * ショートカットを無効化
     */
    disable() {
        this.enabled = false;
        console.log('[ShortcutsManager] ショートカット無効化');
    }
    
    /**
     * 特定のショートカットを削除
     * @param {string} key - キーの組み合わせ
     */
    removeShortcut(key) {
        this.shortcuts.delete(this.normalizeKey(key));
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        // イベントリスナーは自動的にGCされるため、特別な処理は不要
        this.shortcuts.clear();
        console.log('[ShortcutsManager] クリーンアップ完了');
    }
}

// グローバルに公開
window.ShortcutsManager = ShortcutsManager;