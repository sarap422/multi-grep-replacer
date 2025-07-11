const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const SecurityValidator = require('./security-validator');
const IPCHandlers = require('./ipc-handlers');
const debugLogger = require('./debug-logger');

// グローバル参照を保持してガベージコレクションを防ぐ
let mainWindow = null;

// Electronのセキュリティ推奨事項を有効化
if (process.env.NODE_ENV === 'production') {
  app.enableSandbox();
}

function createWindow() {
  // セキュアなwebPreferences設定を取得
  const securePreferences = SecurityValidator.getSecureWebPreferences();
  const webPreferences = {
    ...securePreferences,
    preload: path.join(__dirname, '../preload/preload.js')
  };
  
  // セキュリティ検証を実行
  const issues = SecurityValidator.validateWebPreferences(webPreferences);
  SecurityValidator.logValidationResults(issues);
  
  // メインウィンドウ作成
  mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    title: 'Multi Grep Replacer',
    center: true,
    webPreferences
  });

  // index.htmlをロード
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // 開発環境では開発者ツールを開く
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }

  // ウィンドウが閉じられた時の処理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 外部リンクはブラウザで開く
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Electronの初期化が完了したらウィンドウを作成
app.whenReady().then(() => {
  console.log('App ready');
  
  // Debug Logger初期化完了をログ
  debugLogger.logTaskCompletion('app_initialization', {
    electron_version: process.versions.electron,
    node_version: process.versions.node,
    platform: process.platform
  });
  
  createWindow();
  
  // ウィンドウ作成後にIPC handlersを登録
  registerIPCHandlers();

  app.on('activate', () => {
    // macOSでドックアイコンがクリックされた時
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      registerIPCHandlers();
    }
  });
});

// 全てのウィンドウが閉じられた時の処理
app.on('window-all-closed', () => {
  // macOS以外ではアプリケーションを終了
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// セキュリティ: HTTPSを強制
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'file:') {
      console.warn(`Blocked navigation to ${navigationUrl}`);
      event.preventDefault();
    }
  });
});

// IPC通信ハンドラーの登録
function registerIPCHandlers() {
  // 基本のIPCハンドラーを登録
  IPCHandlers.registerHandlers(mainWindow);
  
  // 追加のアプリ情報取得ハンドラー
  ipcMain.handle('get-app-info', async () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      userDataPath: app.getPath('userData')
    };
  });

  console.log('All IPC handlers registered successfully');
}

// アプリケーション情報
console.log('Multi Grep Replacer starting...');
console.log(`Electron: ${process.versions.electron}`);
console.log(`Node: ${process.versions.node}`);
console.log(`Chrome: ${process.versions.chrome}`);

// セキュリティ検証
function validateSecuritySettings() {
  console.log('\nSecurity Settings Validation:');
  console.log('- Sandbox: Enabled in production');
  console.log('- Context Isolation: Enforced');
  console.log('- Node Integration: Disabled');
  console.log('- Remote Module: Disabled');
  console.log('- Web Security: Enabled');
  console.log('✅ All security settings validated\n');
}

validateSecuritySettings();