/**
 * @fileoverview ウィンドウ状態管理クラス
 * 
 * ウィンドウのサイズ・位置を記憶・復元する機能を提供
 * マルチモニター環境にも対応
 */

class WindowState {
    constructor() {
        this.state = {
            width: 800,
            height: 700,
            x: null,
            y: null,
            maximized: false,
            fullscreen: false
        };
        
        this.saveDelay = 1000; // 保存遅延（ms）
        this.saveTimeout = null;
        this.isLoaded = false;
        
        // デバッグ用ログ
        console.log('[WindowState] 初期化開始');
        
        this.initialize();
    }
    
    /**
     * ウィンドウ状態管理の初期化
     */
    async initialize() {
        try {
            // 保存されたウィンドウ状態を読み込み
            await this.loadState();
            
            // ウィンドウイベントの監視を開始
            this.watchWindow();
            
            console.log('[WindowState] 初期化完了', this.state);
        } catch (error) {
            console.error('[WindowState] 初期化エラー:', error);
        }
    }
    
    /**
     * 保存されたウィンドウ状態を読み込み
     */
    async loadState() {
        try {
            if (window.electronAPI && window.electronAPI.getWindowState) {
                const savedState = await window.electronAPI.getWindowState();
                
                if (savedState) {
                    // 保存された状態をマージ
                    this.state = {
                        ...this.state,
                        ...savedState
                    };
                    
                    // 画面境界内に収まるかチェック
                    this.validatePosition();
                    
                    console.log('[WindowState] 保存された状態を読み込み:', this.state);
                }
            }
        } catch (error) {
            console.error('[WindowState] 状態読み込みエラー:', error);
        }
        
        this.isLoaded = true;
    }
    
    /**
     * ウィンドウ位置が画面境界内に収まるかチェック
     */
    validatePosition() {
        if (this.state.x === null || this.state.y === null) {
            return;
        }
        
        // 利用可能な画面サイズを取得
        const screenWidth = window.screen.availWidth;
        const screenHeight = window.screen.availHeight;
        
        // ウィンドウが画面外にある場合は中央に配置
        if (this.state.x < 0 || 
            this.state.y < 0 || 
            this.state.x + this.state.width > screenWidth ||
            this.state.y + this.state.height > screenHeight) {
            
            this.state.x = Math.max(0, (screenWidth - this.state.width) / 2);
            this.state.y = Math.max(0, (screenHeight - this.state.height) / 2);
            
            console.log('[WindowState] ウィンドウ位置を修正:', {
                x: this.state.x,
                y: this.state.y
            });
        }
        
        // ウィンドウサイズの上限・下限チェック
        this.state.width = Math.max(400, Math.min(this.state.width, screenWidth));
        this.state.height = Math.max(300, Math.min(this.state.height, screenHeight));
    }
    
    /**
     * ウィンドウイベントを監視
     */
    watchWindow() {
        if (!window.electronAPI) {
            console.warn('[WindowState] Electron API が利用できません');
            return;
        }
        
        // ウィンドウリサイズ
        if (window.electronAPI.onWindowResize) {
            window.electronAPI.onWindowResize((bounds) => {
                console.log('[WindowState] ウィンドウリサイズ:', bounds);
                this.updateState({
                    width: bounds.width,
                    height: bounds.height
                });
            });
        }
        
        // ウィンドウ移動
        if (window.electronAPI.onWindowMove) {
            window.electronAPI.onWindowMove((bounds) => {
                console.log('[WindowState] ウィンドウ移動:', bounds);
                this.updateState({
                    x: bounds.x,
                    y: bounds.y
                });
            });
        }
        
        // ウィンドウ最大化
        if (window.electronAPI.onWindowMaximize) {
            window.electronAPI.onWindowMaximize(() => {
                console.log('[WindowState] ウィンドウ最大化');
                this.updateState({ maximized: true });
            });
        }
        
        // ウィンドウ最大化解除
        if (window.electronAPI.onWindowUnmaximize) {
            window.electronAPI.onWindowUnmaximize(() => {
                console.log('[WindowState] ウィンドウ最大化解除');
                this.updateState({ maximized: false });
            });
        }
        
        // フルスクリーン
        if (window.electronAPI.onWindowEnterFullscreen) {
            window.electronAPI.onWindowEnterFullscreen(() => {
                console.log('[WindowState] フルスクリーン開始');
                this.updateState({ fullscreen: true });
            });
        }
        
        // フルスクリーン解除
        if (window.electronAPI.onWindowLeaveFullscreen) {
            window.electronAPI.onWindowLeaveFullscreen(() => {
                console.log('[WindowState] フルスクリーン終了');
                this.updateState({ fullscreen: false });
            });
        }
        
        // ウィンドウ閉じる前
        if (window.electronAPI.onWindowBeforeClose) {
            window.electronAPI.onWindowBeforeClose(() => {
                console.log('[WindowState] ウィンドウ閉じる前');
                this.saveStateImmediate();
            });
        }
    }
    
    /**
     * ウィンドウ状態を更新
     * @param {Object} newState - 新しい状態
     */
    updateState(newState) {
        if (!this.isLoaded) return;
        
        // 状態を更新
        this.state = {
            ...this.state,
            ...newState
        };
        
        // 遅延保存をスケジュール
        this.scheduleStateSave();
    }
    
    /**
     * 状態保存をスケジュール
     */
    scheduleStateSave() {
        // 既存のタイマーをクリア
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        // 新しいタイマーを設定
        this.saveTimeout = setTimeout(() => {
            this.saveState();
        }, this.saveDelay);
    }
    
    /**
     * ウィンドウ状態を保存
     */
    async saveState() {
        try {
            if (window.electronAPI && window.electronAPI.saveWindowState) {
                await window.electronAPI.saveWindowState(this.state);
                console.log('[WindowState] 状態を保存:', this.state);
            }
        } catch (error) {
            console.error('[WindowState] 状態保存エラー:', error);
        }
        
        this.saveTimeout = null;
    }
    
    /**
     * ウィンドウ状態を即座に保存
     */
    async saveStateImmediate() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        
        await this.saveState();
    }
    
    /**
     * 現在のウィンドウ状態を取得
     * @returns {Object} ウィンドウ状態
     */
    getCurrentState() {
        return { ...this.state };
    }
    
    /**
     * ウィンドウサイズを設定
     * @param {number} width - 幅
     * @param {number} height - 高さ
     */
    async setSize(width, height) {
        if (window.electronAPI && window.electronAPI.setWindowSize) {
            await window.electronAPI.setWindowSize(width, height);
            console.log('[WindowState] ウィンドウサイズ設定:', { width, height });
        }
    }
    
    /**
     * ウィンドウ位置を設定
     * @param {number} x - X座標
     * @param {number} y - Y座標
     */
    async setPosition(x, y) {
        if (window.electronAPI && window.electronAPI.setWindowPosition) {
            await window.electronAPI.setWindowPosition(x, y);
            console.log('[WindowState] ウィンドウ位置設定:', { x, y });
        }
    }
    
    /**
     * ウィンドウを中央に配置
     */
    async centerWindow() {
        const screenWidth = window.screen.availWidth;
        const screenHeight = window.screen.availHeight;
        
        const x = Math.max(0, (screenWidth - this.state.width) / 2);
        const y = Math.max(0, (screenHeight - this.state.height) / 2);
        
        await this.setPosition(x, y);
    }
    
    /**
     * ウィンドウを最大化
     */
    async maximizeWindow() {
        if (window.electronAPI && window.electronAPI.maximizeWindow) {
            await window.electronAPI.maximizeWindow();
            console.log('[WindowState] ウィンドウ最大化実行');
        }
    }
    
    /**
     * ウィンドウの最大化を解除
     */
    async unmaximizeWindow() {
        if (window.electronAPI && window.electronAPI.unmaximizeWindow) {
            await window.electronAPI.unmaximizeWindow();
            console.log('[WindowState] ウィンドウ最大化解除実行');
        }
    }
    
    /**
     * ウィンドウ最大化状態を切り替え
     */
    async toggleMaximize() {
        if (this.state.maximized) {
            await this.unmaximizeWindow();
        } else {
            await this.maximizeWindow();
        }
    }
    
    /**
     * ウィンドウを最小化
     */
    async minimizeWindow() {
        if (window.electronAPI && window.electronAPI.minimizeWindow) {
            await window.electronAPI.minimizeWindow();
            console.log('[WindowState] ウィンドウ最小化実行');
        }
    }
    
    /**
     * フルスクリーンモードを切り替え
     */
    async toggleFullscreen() {
        if (window.electronAPI && window.electronAPI.toggleFullscreen) {
            await window.electronAPI.toggleFullscreen();
            console.log('[WindowState] フルスクリーン切り替え実行');
        }
    }
    
    /**
     * ウィンドウ状態をリセット
     */
    async resetWindowState() {
        this.state = {
            width: 800,
            height: 700,
            x: null,
            y: null,
            maximized: false,
            fullscreen: false
        };
        
        // 中央に配置
        await this.centerWindow();
        await this.setSize(this.state.width, this.state.height);
        
        // 最大化・フルスクリーンを解除
        if (this.state.maximized) {
            await this.unmaximizeWindow();
        }
        
        console.log('[WindowState] ウィンドウ状態をリセット');
    }
    
    /**
     * ウィンドウの境界情報を取得
     * @returns {Object} 境界情報
     */
    getWindowBounds() {
        return {
            x: this.state.x,
            y: this.state.y,
            width: this.state.width,
            height: this.state.height
        };
    }
    
    /**
     * 画面情報を取得
     * @returns {Object} 画面情報
     */
    getScreenInfo() {
        return {
            width: window.screen.width,
            height: window.screen.height,
            availWidth: window.screen.availWidth,
            availHeight: window.screen.availHeight,
            colorDepth: window.screen.colorDepth,
            pixelDepth: window.screen.pixelDepth
        };
    }
    
    /**
     * ウィンドウが表示可能な範囲にあるかチェック
     * @returns {boolean} 表示可能か
     */
    isWindowVisible() {
        if (this.state.x === null || this.state.y === null) {
            return true; // 初期状態
        }
        
        const screen = this.getScreenInfo();
        
        return (
            this.state.x >= 0 &&
            this.state.y >= 0 &&
            this.state.x + this.state.width <= screen.availWidth &&
            this.state.y + this.state.height <= screen.availHeight
        );
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        // 最終状態を保存
        this.saveStateImmediate();
        
        // タイマーをクリア
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
        
        console.log('[WindowState] クリーンアップ完了');
    }
}

// グローバルに公開
window.WindowState = WindowState;