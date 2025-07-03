/**
 * @fileoverview テーマ管理クラス
 * 
 * ライト/ダークモード切り替え機能を提供
 * システムテーマとの連動をサポート
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'auto';
        this.systemTheme = null;
        this.themeToggleButton = null;
        this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        // デバッグ用ログ
        console.log('[ThemeManager] 初期化開始');
        
        this.initialize();
    }
    
    /**
     * テーママネージャーの初期化
     */
    initialize() {
        // 保存されたテーマ設定を読み込み
        this.loadSavedTheme();
        
        // システムテーマを検出
        this.detectSystemTheme();
        
        // システムテーマ変更を監視
        this.watchSystemTheme();
        
        // テーマ切り替えボタンを作成
        this.createThemeToggleButton();
        
        // 初期テーマを適用
        this.applyTheme();
        
        console.log('[ThemeManager] 初期化完了', {
            currentTheme: this.currentTheme,
            systemTheme: this.systemTheme,
            appliedTheme: this.getAppliedTheme()
        });
    }
    
    /**
     * 保存されたテーマ設定を読み込み
     */
    async loadSavedTheme() {
        try {
            // Electron APIを使用して設定を読み込み
            if (window.electronAPI && window.electronAPI.getThemeSetting) {
                const savedTheme = await window.electronAPI.getThemeSetting();
                if (savedTheme && ['light', 'dark', 'auto'].includes(savedTheme)) {
                    this.currentTheme = savedTheme;
                    console.log('[ThemeManager] 保存されたテーマを読み込み:', savedTheme);
                }
            }
        } catch (error) {
            console.error('[ThemeManager] テーマ設定の読み込みエラー:', error);
        }
    }
    
    /**
     * システムテーマを検出
     */
    detectSystemTheme() {
        this.systemTheme = this.mediaQuery.matches ? 'dark' : 'light';
        console.log('[ThemeManager] システムテーマ検出:', this.systemTheme);
    }
    
    /**
     * システムテーマ変更を監視
     */
    watchSystemTheme() {
        this.mediaQuery.addEventListener('change', (e) => {
            this.systemTheme = e.matches ? 'dark' : 'light';
            console.log('[ThemeManager] システムテーマ変更:', this.systemTheme);
            
            // autoモードの場合は自動的にテーマを切り替え
            if (this.currentTheme === 'auto') {
                this.applyTheme();
            }
        });
    }
    
    /**
     * テーマ切り替えボタンを作成
     */
    createThemeToggleButton() {
        // 既存のボタンがあれば削除
        const existingButton = document.querySelector('.theme-toggle');
        if (existingButton) {
            existingButton.remove();
        }
        
        // ボタン要素を作成
        this.themeToggleButton = document.createElement('button');
        this.themeToggleButton.className = 'theme-toggle hover-scale';
        this.themeToggleButton.setAttribute('aria-label', 'テーマ切り替え');
        this.themeToggleButton.setAttribute('title', 'テーマ切り替え (ライト/ダーク/自動)');
        
        // アイコンを追加
        this.themeToggleButton.innerHTML = `
            <svg class="theme-icon-light" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
                <path d="M12 2V6M12 18V22M4.22 4.22L6.34 6.34M17.66 17.66L19.78 19.78M2 12H6M18 12H22M4.22 19.78L6.34 17.66M17.66 6.34L19.78 4.22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <svg class="theme-icon-dark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        
        // クリックイベントを追加
        this.themeToggleButton.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // ボタンをドキュメントに追加
        document.body.appendChild(this.themeToggleButton);
    }
    
    /**
     * 現在適用されるべきテーマを取得
     * @returns {string} 'light' または 'dark'
     */
    getAppliedTheme() {
        if (this.currentTheme === 'auto') {
            return this.systemTheme || 'light';
        }
        return this.currentTheme;
    }
    
    /**
     * テーマを切り替え
     */
    toggleTheme() {
        // テーマの順序: auto → light → dark → auto
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        
        this.switchTheme(themes[nextIndex]);
    }
    
    /**
     * 指定されたテーマに切り替え
     * @param {string} theme - 'light', 'dark', または 'auto'
     */
    switchTheme(theme) {
        if (!['light', 'dark', 'auto'].includes(theme)) {
            console.error('[ThemeManager] 無効なテーマ:', theme);
            return;
        }
        
        console.log('[ThemeManager] テーマ切り替え:', this.currentTheme, '→', theme);
        
        this.currentTheme = theme;
        this.applyTheme();
        this.saveThemePreference();
        
        // ボタンにアニメーション効果を追加
        if (this.themeToggleButton) {
            this.themeToggleButton.classList.add('pulse-once');
            setTimeout(() => {
                this.themeToggleButton.classList.remove('pulse-once');
            }, 600);
        }
    }
    
    /**
     * テーマを適用
     */
    applyTheme() {
        const appliedTheme = this.getAppliedTheme();
        const root = document.documentElement;
        
        // トランジションを一時的に無効化（初回のみ）
        if (!root.hasAttribute('data-theme')) {
            root.classList.add('no-transition');
            requestAnimationFrame(() => {
                root.classList.remove('no-transition');
            });
        }
        
        // data-theme属性を設定
        if (this.currentTheme === 'auto') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', this.currentTheme);
        }
        
        // メタテーマカラーを更新
        this.updateMetaThemeColor(appliedTheme);
        
        // ツールチップを更新
        this.updateTooltip();
        
        console.log('[ThemeManager] テーマ適用:', appliedTheme);
    }
    
    /**
     * メタテーマカラーを更新
     * @param {string} theme - 適用されたテーマ
     */
    updateMetaThemeColor(theme) {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        
        metaThemeColor.content = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    }
    
    /**
     * ツールチップを更新
     */
    updateTooltip() {
        if (this.themeToggleButton) {
            const tooltipText = {
                'auto': '自動モード（システム設定に従う）',
                'light': 'ライトモード',
                'dark': 'ダークモード'
            };
            
            const nextTheme = this.currentTheme === 'auto' ? 'light' : 
                            this.currentTheme === 'light' ? 'dark' : 'auto';
            
            this.themeToggleButton.setAttribute('title', 
                `現在: ${tooltipText[this.currentTheme]}\nクリックで${tooltipText[nextTheme]}に切り替え`);
        }
    }
    
    /**
     * テーマ設定を保存
     */
    async saveThemePreference() {
        try {
            // Electron APIを使用して設定を保存
            if (window.electronAPI && window.electronAPI.saveThemeSetting) {
                await window.electronAPI.saveThemeSetting(this.currentTheme);
                console.log('[ThemeManager] テーマ設定を保存:', this.currentTheme);
            }
        } catch (error) {
            console.error('[ThemeManager] テーマ設定の保存エラー:', error);
        }
    }
    
    /**
     * 現在のテーマを取得
     * @returns {string} 現在のテーマ設定
     */
    getCurrentTheme() {
        return this.currentTheme;
    }
    
    /**
     * 適用されているテーマを取得
     * @returns {string} 実際に適用されているテーマ
     */
    getActiveTheme() {
        return this.getAppliedTheme();
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        // イベントリスナーを削除
        if (this.mediaQuery && this.mediaQuery.removeEventListener) {
            this.mediaQuery.removeEventListener('change', this.watchSystemTheme);
        }
        
        // ボタンを削除
        if (this.themeToggleButton) {
            this.themeToggleButton.remove();
            this.themeToggleButton = null;
        }
        
        console.log('[ThemeManager] クリーンアップ完了');
    }
}

// グローバルに公開
window.ThemeManager = ThemeManager;