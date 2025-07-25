/**
 * Jest テストセットアップファイル
 * 全てのテストで共通的に使用される設定・モック・ヘルパー関数を定義
 */

// グローバル設定
global.console = {
  ...console,
  log: jest.fn(), // console.logをモック化（テスト出力クリーン化）
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// カスタムマッチャー追加
expect.extend({
  // ファイルパス検証用マッチャー
  toBeValidPath(received) {
    const pass = typeof received === 'string' && received.length > 0;
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid path`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid path`,
        pass: false,
      };
    }
  },

  // UI応答時間検証用マッチャー
  toBeWithinResponseTime(received, expected = 100) {
    const pass = received <= expected;
    if (pass) {
      return {
        message: () => `expected ${received}ms not to be within response time of ${expected}ms`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received}ms to be within response time of ${expected}ms`,
        pass: false,
      };
    }
  },

  // Electron IPC レスポンス検証用マッチャー
  toBeValidIPCResponse(received) {
    const isObject = received && typeof received === 'object';
    const hasSuccess = 'success' in received;
    const pass = isObject && hasSuccess;
    
    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid IPC response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid IPC response with success field`,
        pass: false,
      };
    }
  }
});

// テスト用ヘルパー関数
global.testHelpers = {
  // パフォーマンス測定ヘルパー
  measurePerformance: async (fn) => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return {
      result,
      duration: end - start
    };
  },

  // 遅延実行ヘルパー
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  // テスト用設定オブジェクト生成
  createTestConfig: (overrides = {}) => ({
    app_info: {
      name: 'Test Multi Grep Replacer',
      version: '1.0.0-test',
      created_at: '2025-07-25T10:00:00Z',
      description: 'Test configuration',
      author: 'Test User',
      tags: ['test']
    },
    replacements: [
      {
        id: 'test_rule_001',
        from: 'old-test',
        to: 'new-test',
        enabled: true,
        description: 'Test replacement rule',
        case_sensitive: true,
        whole_word: false
      }
    ],
    target_settings: {
      file_extensions: ['.txt', '.js'],
      exclude_patterns: ['node_modules/**'],
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
    },
    ui_settings: {
      theme: 'auto',
      window: {
        width: 800,
        height: 700,
        resizable: true,
        center: true
      },
      remember_last_folder: true,
      auto_save_config: false,
      show_file_count_preview: true,
      confirm_before_execution: true
    },
    advanced_settings: {
      max_concurrent_files: 10,
      progress_update_interval: 100,
      log_level: 'info',
      enable_crash_reporting: false
    },
    ...overrides
  }),

  // テスト用ファイル作成
  createTestFile: (path, content) => {
    const fs = require('fs');
    const pathLib = require('path');
    
    // ディレクトリが存在しない場合は作成
    const dir = pathLib.dirname(path);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(path, content);
    return path;
  },

  // テスト用ファイル削除
  cleanupTestFile: (path) => {
    const fs = require('fs');
    if (fs.existsSync(path)) {
      fs.unlinkSync(path);
    }
  }
};

// エラーハンドリング強化
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// テスト環境変数設定
process.env.NODE_ENV = 'test';
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';

console.log('🧪 Jest test setup completed');