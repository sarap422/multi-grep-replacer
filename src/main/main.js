const { app, BrowserWindow } = require('electron');
const path = require('path');
const IPCHandlers = require('./ipc-handlers');

// Electronのセキュリティ警告を有効化（開発時に重要）
process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'false';

class MultiGrepReplacerApp {
    constructor() {
        this.mainWindow = null;
        this.config = null;
        this.ipcHandlers = null;
    }

    initialize() {
        // アプリケーションイベントの設定
        app.whenReady().then(() => {
            this.createMainWindow();
        });

        app.on('window-all-closed', () => {
            // macOS以外では、全ウィンドウが閉じられたらアプリを終了
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            // macOSで、ドックアイコンがクリックされた時
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createMainWindow();
            }
        });

        app.on('before-quit', () => {
            // アプリケーション終了前のクリーンアップ
            this.cleanup();
        });
    }

    createMainWindow() {
        // メインウィンドウの作成
        this.mainWindow = new BrowserWindow({
            width: 800,
            height: 700,
            minWidth: 600,
            minHeight: 500,
            center: true,
            resizable: true,
            title: 'Multi Grep Replacer',
            webPreferences: {
                // セキュリティ設定（重要）
                nodeIntegration: false,           // 必須：無効化
                contextIsolation: true,           // 必須：有効化
                enableRemoteModule: false,        // 必須：無効化
                webSecurity: true,                // 必須：有効化
                allowRunningInsecureContent: false, // 必須：無効化
                experimentalFeatures: false,       // 必須：無効化
                preload: path.join(__dirname, '../preload/preload.js')
            },
            // macOS用の設定
            titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
            // アイコン設定（将来的に追加）
            // icon: path.join(__dirname, '../renderer/assets/icons/icon.png')
        });

        // メインHTMLファイルの読み込み
        this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

        // 開発環境では自動的にDevToolsを開く
        if (process.env.NODE_ENV === 'development') {
            this.mainWindow.webContents.openDevTools();
        }

        // ウィンドウが閉じられた時の処理
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // エラーハンドリング
        this.mainWindow.webContents.on('crashed', () => {
            console.error('Renderer process crashed');
        });

        this.mainWindow.webContents.on('unresponsive', () => {
            console.error('Renderer process became unresponsive');
        });

        // IPC通信ハンドラーの初期化
        this.ipcHandlers = new IPCHandlers(this.mainWindow);
        console.log('✅ IPC通信ハンドラー初期化完了');
    }

    cleanup() {
        // アプリケーション終了時のクリーンアップ処理
        console.log('Application is shutting down...');
        
        // IPC通信ハンドラーのクリーンアップ
        if (this.ipcHandlers) {
            this.ipcHandlers.cleanup();
            this.ipcHandlers = null;
        }
    }
}

// アプリケーションの起動
const multiGrepReplacerApp = new MultiGrepReplacerApp();
multiGrepReplacerApp.initialize();

// グローバルエラーハンドリング
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});