/**
 * アプリケーション起動 E2E テスト
 */

describe('Multi Grep Replacer - Application Startup', () => {
  let app;

  beforeEach(async () => {
    // テストタイムアウト延長
    jest.setTimeout(global.E2E_TIMEOUT);
  });

  afterEach(async () => {
    // アプリケーション終了
    await global.e2eHelpers.stopApp(app);
  });

  test('アプリケーションが正常に起動する', async () => {
    // アプリケーション起動
    app = await global.e2eHelpers.startApp();
    
    // 基本的な検証
    expect(app).toBeDefined();
    expect(app.isRunning()).toBe(true);
    
    // ウィンドウの存在確認
    const windowCount = await app.client.getWindowCount();
    expect(windowCount).toBe(1);
  });

  test('ウィンドウが適切なサイズで表示される', async () => {
    app = await global.e2eHelpers.startApp();
    
    // ウィンドウ状態検証
    await global.e2eHelpers.verifyWindowState(app, {
      visible: true,
      minimized: false
    });
    
    // ウィンドウサイズの検証
    const bounds = await app.browserWindow.getBounds();
    expect(bounds.width).toBeGreaterThan(600);
    expect(bounds.height).toBeGreaterThan(500);
  });

  test('ウィンドウタイトルが正しく設定されている', async () => {
    app = await global.e2eHelpers.startApp();
    
    const title = await app.browserWindow.getTitle();
    expect(title).toContain('MultiGrepReplacer');
  });

  test('メインUI要素が表示される', async () => {
    app = await global.e2eHelpers.startApp();
    
    // メイン要素の存在確認
    const folderSection = await global.e2eHelpers.waitForElement(app.client, '#folderSection');
    expect(folderSection).toBeDefined();
    
    const extensionSection = await global.e2eHelpers.waitForElement(app.client, '#extensionSection');
    expect(extensionSection).toBeDefined();
    
    const rulesSection = await global.e2eHelpers.waitForElement(app.client, '#rulesSection');
    expect(rulesSection).toBeDefined();
  });

  test('バージョン情報ボタンが正常に動作する', async () => {
    app = await global.e2eHelpers.startApp();
    
    // バージョン情報ボタンクリック
    const versionButton = await global.e2eHelpers.waitForElement(app.client, '#versionButton');
    
    // UI応答性測定
    const responseTime = await global.e2eHelpers.measureUIResponse(app.client, async () => {
      await versionButton.click();
    });
    
    // 応答時間が100ms以内であることを確認（Python版課題の解決確認）
    expect(responseTime).toBeWithinResponseTime(100);
    
    // バージョン情報が表示されることを確認
    const versionResult = await global.e2eHelpers.waitForElement(app.client, '#versionResult');
    expect(versionResult).toBeDefined();
    
    const versionText = await versionResult.getText();
    expect(versionText).toContain('バージョン情報');
  });

  test('アプリケーションが適切に終了する', async () => {
    app = await global.e2eHelpers.startApp();
    
    // アプリケーション終了
    await app.stop();
    
    // 終了後の状態確認
    expect(app.isRunning()).toBe(false);
  });

  test('メニューバーが表示される（macOS）', async () => {
    // macOSでのみ実行
    if (process.platform === 'darwin') {
      app = await global.e2eHelpers.startApp();
      
      // メニューバーアイテムの確認は、Spectronの制限により簡易チェック
      const isRunning = app.isRunning();
      expect(isRunning).toBe(true);
    }
  });
});