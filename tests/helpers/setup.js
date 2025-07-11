/**
 * Jest Test Setup
 * Multi Grep Replacer テスト環境セットアップ
 */

// テスト環境のグローバル設定
global.console = {
  ...console,
  // テスト実行時のコンソール出力制御
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// モック用のElectron API
global.electronAPI = {
  // バージョン情報
  versions: {
    node: '18.0.0',
    chrome: '108.0.0',
    electron: '25.0.0'
  },
  
  // プラットフォーム情報
  platform: 'darwin',
  
  // 基本IPC通信
  ping: jest.fn().mockResolvedValue('pong'),
  
  // 設定管理API（モック）
  config: {
    load: jest.fn(),
    save: jest.fn(),
    validate: jest.fn(),
    getDefault: jest.fn(),
    merge: jest.fn()
  },
  
  // ファイル操作API（モック）
  file: {
    selectFolder: jest.fn(),
    selectFile: jest.fn(),
    saveDialog: jest.fn(),
    findFiles: jest.fn(),
    readContent: jest.fn(),
    writeContent: jest.fn(),
    checkPermissions: jest.fn(),
    getStats: jest.fn(),
    isTooLarge: jest.fn()
  }
};

// テスト用のヘルパー関数
global.testHelpers = {
  // 非同期処理のテスト用ヘルパー
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  
  // テスト用のサンプル設定
  getSampleConfig: () => ({
    app_info: {
      name: 'Test App',
      version: '1.0.0',
      created_at: '2025-01-01T00:00:00.000Z',
      description: 'Test Configuration'
    },
    replacements: [
      {
        id: 'test_rule_1',
        from: 'old',
        to: 'new',
        enabled: true,
        description: 'Test rule'
      }
    ],
    target_settings: {
      file_extensions: ['.js', '.html'],
      exclude_patterns: ['node_modules/**'],
      include_subdirectories: true,
      max_file_size: 1048576,
      encoding: 'utf-8'
    }
  }),
  
  // テスト用のサンプルファイル情報
  getSampleFiles: () => [
    '/test/path/file1.js',
    '/test/path/file2.html',
    '/test/path/subdirectory/file3.js'
  ],
  
  // エラーオブジェクト生成
  createError: (code, message) => {
    const error = new Error(message);
    error.code = code;
    return error;
  }
};

// テスト開始前の共通設定
beforeEach(() => {
  // モックのリセット
  jest.clearAllMocks();
  
  // 環境変数の設定
  process.env.NODE_ENV = 'test';
  
  // 時間のモック（一貫性のあるテスト実行のため）
  jest.useFakeTimers();
});

// テスト終了後のクリーンアップ
afterEach(() => {
  // タイマーのリストア
  jest.useRealTimers();
  
  // モックのクリア
  jest.restoreAllMocks();
});

// 特定のテストスイート用の設定
beforeAll(() => {
  // テスト全体の初期化
  console.log('🧪 Multi Grep Replacer テストスイート開始');
});

afterAll(() => {
  // テスト全体のクリーンアップ  
  console.log('✅ Multi Grep Replacer テストスイート完了');
});