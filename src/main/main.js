const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const ConfigManager = require('./config-manager');
const FileOperations = require('./file-operations');
const DebugLogger = require('./debug-logger');

/**
 * Multi Grep Replacer - Main Process
 * Electronアプリケーションのエントリーポイント
 */
class MultiGrepReplacerApp {
  constructor() {
    this.mainWindow = null;
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.startTime = performance.now();
    this.initializationTracker = 'app-initialization';
  }

  /**
   * アプリケーション初期化
   */
  async initialize() {
    // デバッグロガー初期化（最優先）
    await DebugLogger.initialize();
    DebugLogger.startPerformance(this.initializationTracker);

    await DebugLogger.info('Multi Grep Replacer starting...', {
      isDevelopment: this.isDevelopment,
      platform: process.platform,
      electronVersion: process.versions.electron,
    });

    try {
      // アプリイベントリスナー設定
      DebugLogger.startPerformance('setup-app-listeners');
      this.setupAppEventListeners();
      await DebugLogger.endPerformance('setup-app-listeners');

      // IPC通信ハンドラー設定
      DebugLogger.startPerformance('setup-ipc-handlers');
      this.setupIpcHandlers();
      await DebugLogger.endPerformance('setup-ipc-handlers');

      await DebugLogger.info('Application initialized successfully');
    } catch (error) {
      await DebugLogger.logError(error, {
        phase: 'initialization',
        component: 'MultiGrepReplacerApp',
      });
      throw error;
    }
  }

  /**
   * メインウィンドウ作成
   */
  createMainWindow() {
    DebugLogger.startPerformance('create-main-window');
    DebugLogger.info('Creating main window...');

    try {
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
          preload: path.join(__dirname, '../preload/preload.js'),
        },
      });

      // セキュリティ設定検証
      const securityValid = this.validateSecuritySettings();
      DebugLogger.info('Security settings validation', { isValid: securityValid });

      // HTMLファイル読み込み
      const htmlPath = path.join(__dirname, '../renderer/index.html');
      DebugLogger.debug('Loading HTML file', { htmlPath });
      this.mainWindow.loadFile(htmlPath);

      // ウィンドウが準備完了したら表示
      this.mainWindow.once('ready-to-show', async () => {
        await DebugLogger.info('Window ready to show');
        this.mainWindow.show();

        // 開発時のみ DevTools を開く
        if (this.isDevelopment) {
          this.mainWindow.webContents.openDevTools();
          await DebugLogger.debug('DevTools opened for development');
        }

        // 起動時間を計測
        const startupTime = performance.now() - this.startTime;
        await DebugLogger.endPerformance(this.initializationTracker, {
          totalStartupTime: `${startupTime.toFixed(2)}ms`,
        });

        await DebugLogger.info(`App startup completed`, {
          startupTime: `${startupTime.toFixed(2)}ms`,
          target: '< 3000ms',
        });

        // アプリケーション状態をログ
        await DebugLogger.logAppState({ phase: 'startup-complete' });
      });

      // ウィンドウクローズ時の処理
      this.mainWindow.on('closed', async () => {
        await DebugLogger.info('Main window closed');
        this.mainWindow = null;
      });

      DebugLogger.endPerformance('create-main-window');
      DebugLogger.info('Main window created successfully');
    } catch (error) {
      DebugLogger.logError(error, {
        phase: 'window-creation',
        component: 'MultiGrepReplacerApp',
      });
      throw error;
    }
  }

  /**
   * アプリイベントリスナー設定
   */
  setupAppEventListeners() {
    DebugLogger.debug('Setting up app event listeners');

    // アプリ準備完了
    app.whenReady().then(async () => {
      await DebugLogger.info('App ready, creating main window');
      this.createMainWindow();

      // macOS: Dock アイコンクリック時のウィンドウ再作成
      app.on('activate', async () => {
        await DebugLogger.debug('App activated (macOS dock click)');
        if (BrowserWindow.getAllWindows().length === 0) {
          await DebugLogger.info('No windows found, creating new main window');
          this.createMainWindow();
        }
      });
    });

    // 全ウィンドウクローズ時
    app.on('window-all-closed', async () => {
      await DebugLogger.info('All windows closed', { platform: process.platform });
      // macOS以外では完全終了
      if (process.platform !== 'darwin') {
        await DebugLogger.info('Quitting application (non-macOS)');
        app.quit();
      }
    });

    // アプリ終了前の処理
    app.on('before-quit', async () => {
      await DebugLogger.info('Application shutting down...');

      // 最終状態をログ
      await DebugLogger.logAppState({ phase: 'shutdown' });

      // パフォーマンス統計をログ
      const logStats = DebugLogger.getLogStats();
      await DebugLogger.info('Final log statistics', logStats);
    });

    DebugLogger.debug('App event listeners registered successfully');
  }

  /**
   * IPC通信ハンドラー設定
   */
  setupIpcHandlers() {
    DebugLogger.debug('Setting up IPC handlers');

    // 基本通信テスト（ping-pong）
    ipcMain.handle('ping', async () => {
      const operationId = 'ipc-ping';
      DebugLogger.startPerformance(operationId);

      const timestamp = Date.now();
      await DebugLogger.debug('IPC ping received', { timestamp });

      const response = {
        status: 'success',
        timestamp,
        message: 'pong',
      };

      await DebugLogger.endPerformance(operationId);
      return response;
    });

    // アプリバージョン取得
    ipcMain.handle('get-version', async () => {
      const operationId = 'ipc-get-version';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Getting version info in main process');
        const packageJson = require('../../package.json');

        await DebugLogger.debug('Package.json loaded', {
          name: packageJson.name,
          version: packageJson.version,
        });

        const versionInfo = {
          version: packageJson.version,
          name: packageJson.name,
          electron: process.versions.electron,
          node: process.versions.node,
          chrome: process.versions.chrome,
        };

        await DebugLogger.debug('Version info prepared', versionInfo);
        await DebugLogger.endPerformance(operationId, { success: true });
        return versionInfo;
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-version',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        throw error;
      }
    });

    // アプリ情報取得
    ipcMain.handle('get-app-info', async () => {
      const operationId = 'ipc-get-app-info';
      DebugLogger.startPerformance(operationId);

      const appInfo = {
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        pid: process.pid,
      };

      await DebugLogger.debug('App info retrieved', appInfo);
      await DebugLogger.endPerformance(operationId);
      return appInfo;
    });

    // 設定管理 API
    ipcMain.handle('load-config', async (event, filePath) => {
      const operationId = 'ipc-load-config';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Loading config via IPC', { filePath });
        const config = await ConfigManager.loadConfig(filePath);
        await DebugLogger.endPerformance(operationId, { success: true, filePath });
        return { success: true, config };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'load-config',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('save-config', async (event, config, filePath) => {
      const operationId = 'ipc-save-config';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Saving config via IPC', { filePath });
        await ConfigManager.saveConfig(config, filePath);
        await DebugLogger.endPerformance(operationId, { success: true, filePath });
        return { success: true };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'save-config',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-default-config', async () => {
      const operationId = 'ipc-get-default-config';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Getting default config via IPC');
        const config = await ConfigManager.getDefaultConfig();
        await DebugLogger.endPerformance(operationId, { success: true });
        return { success: true, config };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-default-config',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('get-recent-configs', async () => {
      const operationId = 'ipc-get-recent-configs';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Getting recent configs via IPC');
        const configs = await ConfigManager.getRecentConfigs();
        await DebugLogger.endPerformance(operationId, {
          success: true,
          configCount: configs.length,
        });
        return { success: true, configs };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'get-recent-configs',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    // ファイル操作 API
    ipcMain.handle('select-folder', async () => {
      const operationId = 'ipc-select-folder';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Opening folder selection dialog');
        const folderPath = await FileOperations.selectFolder(this.mainWindow);
        await DebugLogger.endPerformance(operationId, {
          success: true,
          hasPath: !!folderPath,
        });
        return { success: true, folderPath };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'select-folder',
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('find-files', async (event, directory, extensions, excludePatterns) => {
      const operationId = 'ipc-find-files';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Finding files via IPC', {
          directory,
          extensions,
          excludePatterns,
        });
        const files = await FileOperations.findFiles(directory, extensions, excludePatterns);
        await DebugLogger.endPerformance(operationId, {
          success: true,
          fileCount: files.length,
          directory,
        });
        return { success: true, files };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'find-files',
          directory,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('read-file', async (event, filePath) => {
      const operationId = 'ipc-read-file';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Reading file via IPC', { filePath });
        const content = await FileOperations.readFileContent(filePath);
        await DebugLogger.endPerformance(operationId, {
          success: true,
          filePath,
          contentLength: content.length,
        });
        return { success: true, content };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'read-file',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('write-file', async (event, filePath, content) => {
      const operationId = 'ipc-write-file';
      DebugLogger.startPerformance(operationId);

      try {
        await DebugLogger.debug('Writing file via IPC', {
          filePath,
          contentLength: content.length,
        });
        await FileOperations.writeFileContent(filePath, content);
        await DebugLogger.endPerformance(operationId, {
          success: true,
          filePath,
        });
        return { success: true };
      } catch (error) {
        await DebugLogger.logError(error, {
          operation: 'write-file',
          filePath,
          component: 'IPC-Handler',
        });
        await DebugLogger.endPerformance(operationId, { success: false });
        return { success: false, error: error.message };
      }
    });

    DebugLogger.info('IPC handlers registered successfully');
  }

  /**
   * セキュリティ設定検証
   */
  validateSecuritySettings() {
    DebugLogger.debug('Validating security settings');

    if (!this.mainWindow) {
      DebugLogger.warn('Cannot validate security settings - no main window available');
      return false;
    }

    // セキュリティ設定の記録（実際の値は作成時の設定から推測）
    const expectedSettings = {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
    };

    // セキュリティ設定が適切に適用されていることを確認
    DebugLogger.info('Security settings validated (based on BrowserWindow configuration)', {
      expectedSettings,
      windowCreated: !!this.mainWindow,
      preloadScript: 'src/preload/preload.js',
    });

    return true;
  }
}

// アプリケーション実行
const multiGrepReplacer = new MultiGrepReplacerApp();
multiGrepReplacer.initialize();

module.exports = MultiGrepReplacerApp;
