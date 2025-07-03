/**
 * Jest テスト設定ファイル
 * 全テスト実行前に実行される設定
 */

// テスト環境のグローバル変数設定
global.console = {
  ...console,
  // テスト実行時のログ制御
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Electronのモック設定
global.mockElectron = {
  app: {
    getName: jest.fn(() => 'Multi Grep Replacer'),
    getVersion: jest.fn(() => '1.0.0'),
    getPath: jest.fn((name) => `/mock/path/${name}`),
    quit: jest.fn(),
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve())
  },
  BrowserWindow: jest.fn(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn()
    }
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(() => Promise.resolve({ filePaths: ['/mock/folder'] })),
    showSaveDialog: jest.fn(() => Promise.resolve({ filePath: '/mock/save/path' }))
  }
};

// Node.js fs モジュールのモック
global.mockFs = {
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    access: jest.fn()
  },
  existsSync: jest.fn(),
  createReadStream: jest.fn(),
  createWriteStream: jest.fn()
};

// パステストのヘルパー関数
global.mockPath = {
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/')),
  dirname: jest.fn((p) => p.split('/').slice(0, -1).join('/')),
  basename: jest.fn((p) => p.split('/').pop()),
  extname: jest.fn((p) => {
    const parts = p.split('.');
    return parts.length > 1 ? '.' + parts.pop() : '';
  }),
  normalize: jest.fn((p) => p),
  isAbsolute: jest.fn((p) => p.startsWith('/'))
};

// テストユーティリティ関数
global.testUtils = {
  // 非同期関数のテスト用ヘルパー
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // モックファイル構造の作成
  createMockFileStructure: () => ({
    '/mock/project/file1.html': '<html><body class="old-class">test</body></html>',
    '/mock/project/file2.css': '.old-class { color: red; }',
    '/mock/project/file3.js': 'const oldVariable = "test";',
    '/mock/project/subdir/file4.md': '# Old Title'
  }),
  
  // モック設定オブジェクトの作成
  createMockConfig: () => ({
    app_info: {
      name: 'Test Config',
      version: '1.0.0',
      description: 'Test configuration'
    },
    replacements: [
      {
        id: 'rule_001',
        from: 'old-class',
        to: 'new-class',
        enabled: true,
        description: 'Test rule 1'
      },
      {
        id: 'rule_002',
        from: 'oldVariable',
        to: 'newVariable',
        enabled: true,
        description: 'Test rule 2'
      }
    ],
    target_settings: {
      file_extensions: ['.html', '.css', '.js'],
      exclude_patterns: ['node_modules/**', '.git/**'],
      include_subdirectories: true,
      max_file_size: 104857600,
      encoding: 'utf-8'
    },
    replacement_settings: {
      case_sensitive: true,
      use_regex: false,
      backup_enabled: false,
      preserve_file_permissions: true,
      dry_run: false
    }
  })
};

// テスト前の環境設定
beforeEach(() => {
  // モックをリセット
  jest.clearAllMocks();
  
  // 環境変数の設定
  process.env.NODE_ENV = 'test';
  process.env.DEBUG = 'false';
});

// テスト後のクリーンアップ
afterEach(() => {
  // タイマーのクリア
  jest.useRealTimers();
});

console.log('✅ Jest test setup completed');