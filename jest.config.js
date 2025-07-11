module.exports = {
  // テスト環境設定
  testEnvironment: 'node',
  
  // テストファイルのパターン
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // カバレッジ設定
  collectCoverage: false, // デフォルトではOFF（test:coverageで有効化）
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/main/main.js', // エントリーポイントは除外
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
  
  // モジュール解決
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // テストタイムアウト
  testTimeout: 10000,
  
  // Electron特有の設定
  testEnvironmentOptions: {
    // Electronアプリケーションテスト用
    electron: {
      enableRemoteModule: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  },
  
  // レポーター設定
  reporters: [
    'default'
  ],
  
  // 詳細設定
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // グローバル変数
  globals: {
    'process.env.NODE_ENV': 'test'
  }
};