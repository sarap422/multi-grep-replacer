const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

/**
 * Multi Grep Replacer - Main Process
 * Electronアプリケーションのエントリーポイント
 */
class MultiGrepReplacerApp {
  constructor() {
    this.mainWindow = null;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.startTime = performance.now();
  }

  /**
   * アプリケーション初期化
   */
  async initialize() {
    console.log('🚀 Multi Grep Replacer starting...');
    
    // アプリイベントリスナー設定
    this.setupAppEventListeners();
    
    // IPC通信ハンドラー設定
    this.setupIpcHandlers();
    
    console.log('✅ Application initialized');
  }

  /**
   * メインウィンドウ作成
   */
  createMainWindow() {
    console.log('🪟 Creating main window...');
    
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 700,
      minWidth: 600,
      minHeight: 500,
      show: false, // 準備完了まで非表示
      title: 'Multi Grep Replacer',
      titleBarStyle: 'default',
      webPreferences: {
        // セキュリティ設定（必須）
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        experimentalFeatures: false,
        
        // preload スクリプト
        preload: path.join(__dirname, '../preload/preload.js')
      }
    });

    // HTMLファイル読み込み
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    this.mainWindow.loadFile(htmlPath);

    // ウィンドウが準備完了したら表示
    this.mainWindow.once('ready-to-show', () => {
      console.log('✅ Window ready to show');
      this.mainWindow.show();
      
      // 開発時のみ DevTools を開く
      if (this.isDevelopment) {
        this.mainWindow.webContents.openDevTools();
      }
      
      // 起動時間を計測
      const startupTime = performance.now() - this.startTime;
      console.log(`⚡ App startup time: ${startupTime.toFixed(2)}ms`);
    });

    // ウィンドウクローズ時の処理
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });

    console.log('✅ Main window created');
  }

  /**
   * アプリイベントリスナー設定
   */
  setupAppEventListeners() {
    // アプリ準備完了
    app.whenReady().then(() => {
      this.createMainWindow();
      
      // macOS: Dock アイコンクリック時のウィンドウ再作成
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
        }
      });
    });

    // 全ウィンドウクローズ時
    app.on('window-all-closed', () => {
      // macOS以外では完全終了
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // アプリ終了前の処理
    app.on('before-quit', () => {
      console.log('🔄 Application shutting down...');
    });
  }

  /**
   * IPC通信ハンドラー設定
   */
  setupIpcHandlers() {
    // 基本通信テスト（ping-pong）
    ipcMain.handle('ping', async () => {
      const timestamp = Date.now();
      console.log(`📡 IPC ping received at ${timestamp}`);
      return { 
        status: 'success', 
        timestamp,
        message: 'pong'
      };
    });

    // アプリバージョン取得
    ipcMain.handle('get-version', async () => {
      const packageJson = require('../../package.json');
      return {
        version: packageJson.version,
        name: packageJson.name,
        electron: process.versions.electron,
        node: process.versions.node
      };
    });

    // アプリ情報取得
    ipcMain.handle('get-app-info', async () => {
      return {
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        pid: process.pid
      };
    });

    console.log('✅ IPC handlers registered');
  }

  /**
   * セキュリティ設定検証
   */
  validateSecuritySettings() {
    const webPrefs = this.mainWindow?.webContents.getWebPreferences();
    if (!webPrefs) return false;

    const issues = [];
    
    if (webPrefs.nodeIntegration === true) {
      issues.push('nodeIntegration must be false for security');
    }
    
    if (webPrefs.contextIsolation === false) {
      issues.push('contextIsolation must be true for security');
    }
    
    if (webPrefs.enableRemoteModule === true) {
      issues.push('enableRemoteModule must be false for security');
    }

    if (issues.length > 0) {
      console.error('🚨 Security issues found:', issues);
      return false;
    }

    console.log('🔒 Security settings validated');
    return true;
  }
}

// アプリケーション実行
const multiGrepReplacer = new MultiGrepReplacerApp();
multiGrepReplacer.initialize();

module.exports = MultiGrepReplacerApp;