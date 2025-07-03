/**
 * Jest設定ファイル
 * Electronアプリケーション用のテスト設定
 */

module.exports = {
  // テスト実行環境の設定
  testEnvironment: 'node',
  
  // テストファイルの検索パターン
  testMatch: [
    '**/tests/unit/**/*.test.js',
    '**/tests/integration/**/*.test.js'
  ],
  
  // テスト対象ファイルのパス（カバレッジ計算用）
  collectCoverageFrom: [
    'src/main/**/*.js',
    'src/renderer/js/**/*.js',
    '!src/main/main.js', // エントリーポイントは除外
    '!src/renderer/js/app.js', // UIメインは除外
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  
  // カバレッジレポートの出力先
  coverageDirectory: 'debug/coverage',
  
  // カバレッジレポートの形式
  coverageReporters: [
    'text',
    'html',
    'lcov',
    'json'
  ],
  
  // カバレッジの閾値（80%以上を目標）
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },
  
  // テスト前のセットアップファイル
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js'
  ],
  
  // モジュール名のマッピング
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@main/(.*)$': '<rootDir>/src/main/$1',
    '^@renderer/(.*)$': '<rootDir>/src/renderer/$1'
  },
  
  // テスト実行タイムアウト（30秒）
  testTimeout: 30000,
  
  // 詳細なテスト結果出力
  verbose: true,
  
  // テストファイルごとに新しいVM コンテキストを作成
  resetMocks: true,
  clearMocks: true,
  restoreMocks: true,
  
  // テスト実行時のモック設定
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // テスト除外パターン
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // グローバル変数の設定（Electronテスト用）
  globals: {
    'process.env.NODE_ENV': 'test'
  }
};