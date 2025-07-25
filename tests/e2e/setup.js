/**
 * E2E テストセットアップファイル
 * Electron アプリケーションのE2Eテスト用設定
 */

const { Application } = require('spectron');
const path = require('path');

// E2E テスト用グローバル設定
global.E2E_TIMEOUT = 30000;
global.APP_START_TIMEOUT = 10000;

// Electron アプリケーションパス設定
const getElectronPath = () => {
  // 開発環境での実行可能ファイルパス
  const electronPath = require('electron');
  return electronPath;
};

const getAppPath = () => {
  // アプリケーションのメインファイルパス
  return path.join(__dirname, '../../src/main/main.js');
};

// Spectron Application インスタンス作成ヘルパー
global.createElectronApp = (options = {}) => {
  const defaultOptions = {
    path: getElectronPath(),
    args: [getAppPath()],
    env: {
      NODE_ENV: 'test',
      ELECTRON_DISABLE_SECURITY_WARNINGS: 'true'
    },
    startTimeout: global.APP_START_TIMEOUT,
    waitTimeout: global.E2E_TIMEOUT,
    ...options
  };

  return new Application(defaultOptions);
};

// E2E テスト用ヘルパー関数
global.e2eHelpers = {
  // アプリケーション起動・終了管理
  async startApp(options = {}) {
    const app = global.createElectronApp(options);
    await app.start();
    
    // ウィンドウが表示されるまで待機
    await app.client.waitUntilWindowLoaded();
    
    return app;
  },

  async stopApp(app) {
    if (app && app.isRunning()) {
      await app.stop();
    }
  },

  // UI要素検証ヘルパー
  async waitForElement(client, selector, timeout = 5000) {
    await client.waitForExist(selector, timeout);
    return client.$(selector);
  },

  async clickElement(client, selector) {
    const element = await this.waitForElement(client, selector);
    await element.click();
    return element;
  },

  async typeText(client, selector, text) {
    const element = await this.waitForElement(client, selector);
    await element.setValue(text);
    return element;
  },

  // パフォーマンス測定
  async measureUIResponse(client, action) {
    const start = Date.now();
    await action();
    const end = Date.now();
    return end - start;
  },

  // スクリーンショット撮影
  async takeScreenshot(app, filename) {
    const screenshot = await app.browserWindow.capturePage();
    const fs = require('fs');
    const screenshotPath = path.join(__dirname, '../screenshots', filename);
    
    // スクリーンショットディレクトリが存在しない場合は作成
    const dir = path.dirname(screenshotPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(screenshotPath, screenshot);
    return screenshotPath;
  },

  // ログ収集
  async collectLogs(app) {
    const logs = await app.client.getRenderProcessLogs();
    return logs.map(log => ({
      level: log.level,
      message: log.message,
      source: log.source,
      timestamp: new Date().toISOString()
    }));
  },

  // ウィンドウ状態検証
  async verifyWindowState(app, expectedState = {}) {
    const bounds = await app.browserWindow.getBounds();
    const isVisible = await app.browserWindow.isVisible();
    const isMinimized = await app.browserWindow.isMinimized();
    
    const currentState = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      visible: isVisible,
      minimized: isMinimized
    };

    // 期待値と比較
    Object.keys(expectedState).forEach(key => {
      expect(currentState[key]).toBe(expectedState[key]);
    });

    return currentState;
  }
};

// E2E テスト前後処理
beforeEach(async () => {
  console.log('🚀 Starting E2E test...');
});

afterEach(async () => {
  console.log('🏁 E2E test completed');
});

console.log('🔧 E2E test setup completed');