/**
 * ConfigManager Unit Tests
 * 設定管理システムのテスト
 */

const fs = require('fs').promises;
const path = require('path');
const ConfigManager = require('../../src/main/config-manager');

// ファイルシステムのモック
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

describe('ConfigManager', () => {
  const testConfigPath = '/test/config.json';
  
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
  });

  describe('loadConfig', () => {
    it('正常な設定ファイルを読み込めること', async () => {
      const testConfig = testHelpers.getSampleConfig();
      fs.readFile.mockResolvedValue(JSON.stringify(testConfig));
      
      const result = await ConfigManager.loadConfig(testConfigPath);
      
      expect(fs.readFile).toHaveBeenCalledWith(testConfigPath, 'utf8');
      expect(result).toEqual(testConfig);
    });

    it('ファイルが存在しない場合にエラーを投げること', async () => {
      const error = testHelpers.createError('ENOENT', 'File not found');
      fs.readFile.mockRejectedValue(error);
      
      await expect(ConfigManager.loadConfig(testConfigPath))
        .rejects.toThrow('Configuration file not found');
    });

    it('無効なJSONファイルの場合にエラーを投げること', async () => {
      fs.readFile.mockResolvedValue('{ invalid json');
      
      await expect(ConfigManager.loadConfig(testConfigPath))
        .rejects.toThrow('Invalid JSON in configuration file');
    });

    it('設定検証に失敗した場合にエラーを投げること', async () => {
      const invalidConfig = { invalid: 'config' };
      fs.readFile.mockResolvedValue(JSON.stringify(invalidConfig));
      
      await expect(ConfigManager.loadConfig(testConfigPath))
        .rejects.toThrow('Invalid configuration');
    });
  });

  describe('saveConfig', () => {
    it('正常な設定を保存できること', async () => {
      const testConfig = testHelpers.getSampleConfig();
      fs.mkdir.mockResolvedValue();
      fs.writeFile.mockResolvedValue();
      
      await ConfigManager.saveConfig(testConfig, testConfigPath);
      
      expect(fs.mkdir).toHaveBeenCalledWith(path.dirname(testConfigPath), { recursive: true });
      expect(fs.writeFile).toHaveBeenCalledWith(
        testConfigPath,
        JSON.stringify(testConfig, null, 2),
        'utf8'
      );
    });

    it('無効な設定の場合にエラーを投げること', async () => {
      const invalidConfig = { invalid: 'config' };
      
      await expect(ConfigManager.saveConfig(invalidConfig, testConfigPath))
        .rejects.toThrow('Invalid configuration');
    });
  });

  describe('validateConfig', () => {
    it('正常な設定の検証が成功すること', () => {
      const testConfig = testHelpers.getSampleConfig();
      
      const result = ConfigManager.validateConfig(testConfig);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('app_infoが欠けている場合にエラーを返すこと', () => {
      const invalidConfig = { replacements: [], target_settings: {} };
      
      const result = ConfigManager.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required property: app_info');
    });

    it('replacementsが配列でない場合にエラーを返すこと', () => {
      const invalidConfig = {
        app_info: { name: 'test', version: '1.0.0' },
        replacements: 'not an array',
        target_settings: { file_extensions: [], exclude_patterns: [] }
      };
      
      const result = ConfigManager.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('replacements must be an array');
    });

    it('置換ルールに必須フィールドが欠けている場合にエラーを返すこと', () => {
      const invalidConfig = {
        app_info: { name: 'test', version: '1.0.0' },
        replacements: [
          { id: 'test', from: 'old' } // 'to' が欠けている
        ],
        target_settings: { file_extensions: [], exclude_patterns: [] }
      };
      
      const result = ConfigManager.validateConfig(invalidConfig);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Replacement rule 0 missing to');
    });
  });

  describe('getDefaultConfig', () => {
    it('デフォルト設定を正常に取得できること', () => {
      const defaultConfig = ConfigManager.getDefaultConfig();
      
      expect(defaultConfig).toHaveProperty('app_info');
      expect(defaultConfig).toHaveProperty('replacements');
      expect(defaultConfig).toHaveProperty('target_settings');
      expect(defaultConfig).toHaveProperty('replacement_settings');
      expect(defaultConfig).toHaveProperty('ui_settings');
      expect(defaultConfig).toHaveProperty('advanced_settings');
      
      // デフォルト設定の妥当性確認
      const validation = ConfigManager.validateConfig(defaultConfig);
      expect(validation.valid).toBe(true);
    });

    it('デフォルト設定にタイムスタンプが含まれること', () => {
      const defaultConfig = ConfigManager.getDefaultConfig();
      
      expect(defaultConfig.app_info.created_at).toBeDefined();
      expect(new Date(defaultConfig.app_info.created_at)).toBeInstanceOf(Date);
    });
  });

  describe('mergeConfigs', () => {
    it('ユーザー設定がデフォルト設定を上書きすること', () => {
      const defaultConfig = ConfigManager.getDefaultConfig();
      const userConfig = {
        app_info: { name: 'Custom App' },
        ui_settings: { theme: 'dark' }
      };
      
      const merged = ConfigManager.mergeConfigs(defaultConfig, userConfig);
      
      expect(merged.app_info.name).toBe('Custom App');
      expect(merged.ui_settings.theme).toBe('dark');
      expect(merged.app_info.version).toBe(defaultConfig.app_info.version); // デフォルト値保持
    });

    it('ネストしたオブジェクトが正しくマージされること', () => {
      const defaultConfig = {
        ui_settings: {
          theme: 'light',
          window: { width: 800, height: 600 }
        }
      };
      const userConfig = {
        ui_settings: {
          theme: 'dark',
          window: { width: 1024 }
        }
      };
      
      const merged = ConfigManager.mergeConfigs(defaultConfig, userConfig);
      
      expect(merged.ui_settings.theme).toBe('dark');
      expect(merged.ui_settings.window.width).toBe(1024);
      expect(merged.ui_settings.window.height).toBe(600); // デフォルト値保持
    });

    it('元の設定オブジェクトが変更されないこと', () => {
      const defaultConfig = { app_info: { name: 'Original' } };
      const userConfig = { app_info: { name: 'Modified' } };
      
      const merged = ConfigManager.mergeConfigs(defaultConfig, userConfig);
      
      expect(defaultConfig.app_info.name).toBe('Original'); // 元のオブジェクトは変更されない
      expect(merged.app_info.name).toBe('Modified');
    });
  });
});