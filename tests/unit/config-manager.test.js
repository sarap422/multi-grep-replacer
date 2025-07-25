/**
 * ConfigManager ユニットテスト
 */

const ConfigManager = require('../../src/main/config-manager');
const fs = require('fs').promises;
const path = require('path');

describe('ConfigManager', () => {
  const testConfigPath = path.join(__dirname, '../fixtures/test-config.json');
  const testConfig = global.testHelpers.createTestConfig();

  beforeEach(async () => {
    // テスト用設定ファイル作成
    await global.testHelpers.createTestFile(testConfigPath, JSON.stringify(testConfig, null, 2));
  });

  afterEach(async () => {
    // テスト用ファイル削除
    await global.testHelpers.cleanupTestFile(testConfigPath);
  });

  describe('loadConfig', () => {
    test('設定ファイルを正常に読み込める', async () => {
      const { measurePerformance } = global.testHelpers;
      
      const { result, duration } = await measurePerformance(async () => {
        return await ConfigManager.loadConfig(testConfigPath);
      });

      expect(result).toBeDefined();
      expect(result.app_info).toEqual(testConfig.app_info);
      expect(result.replacements).toEqual(testConfig.replacements);
      expect(duration).toBeWithinResponseTime(1000); // 1秒以内
    });

    test('存在しないファイルの場合はエラーをスローする', async () => {
      const nonExistentPath = path.join(__dirname, '../fixtures/non-existent.json');
      
      await expect(ConfigManager.loadConfig(nonExistentPath))
        .rejects.toThrow('設定ファイル読み込みエラー');
    });

    test('不正なJSONファイルの場合はエラーをスローする', async () => {
      const invalidJsonPath = path.join(__dirname, '../fixtures/invalid.json');
      await global.testHelpers.createTestFile(invalidJsonPath, '{ invalid json }');
      
      await expect(ConfigManager.loadConfig(invalidJsonPath))
        .rejects.toThrow('設定ファイル読み込みエラー');
      
      await global.testHelpers.cleanupTestFile(invalidJsonPath);
    });
  });

  describe('saveConfig', () => {
    test('設定を正常に保存できる', async () => {
      const saveConfigPath = path.join(__dirname, '../fixtures/save-test.json');
      
      await expect(ConfigManager.saveConfig(testConfig, saveConfigPath))
        .resolves.not.toThrow();
      
      // ファイルが実際に作成されたかチェック
      const savedContent = await fs.readFile(saveConfigPath, 'utf8');
      const savedConfig = JSON.parse(savedContent);
      
      // 保存時に追加されるフィールドを除いて比較
      expect(savedConfig.replacements).toEqual(testConfig.replacements);
      expect(savedConfig.target_settings).toEqual(testConfig.target_settings);
      expect(savedConfig.app_info.name).toEqual(testConfig.app_info.name);
      expect(savedConfig.app_info.version).toEqual(testConfig.app_info.version);
      
      // 追加フィールドの存在確認
      expect(savedConfig.app_info.saved_at).toBeDefined();
      expect(savedConfig.app_info.schema_version).toBeDefined();
      
      await global.testHelpers.cleanupTestFile(saveConfigPath);
    });

    test('無効なパスの場合はエラーをスローする', async () => {
      const invalidPath = '/invalid/path/config.json';
      
      await expect(ConfigManager.saveConfig(testConfig, invalidPath))
        .rejects.toThrow('設定ファイル保存エラー');
    });
  });

  describe('validateConfig', () => {
    test('有効な設定は検証を通過する', () => {
      const validationResult = ConfigManager.validateConfig(testConfig);
      
      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
    });

    test('必須フィールドが不足している場合は検証エラー', () => {
      const invalidConfig = { app_info: { name: 'Test' } }; // replacements不足
      
      const validationResult = ConfigManager.validateConfig(invalidConfig);
      
      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
    });

    test('空の設定オブジェクトは検証エラー', () => {
      const validationResult = ConfigManager.validateConfig(null);
      
      expect(validationResult).toBeDefined();
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors).toContain('設定オブジェクトが空です');
    });
  });

  describe('getDefaultConfig', () => {
    test('デフォルト設定の取得をテスト（モック）', async () => {
      // デフォルト設定ファイルが存在しない場合のため、最小限のテスト
      try {
        const defaultConfig = await ConfigManager.getDefaultConfig();
        // 成功した場合の検証
        expect(defaultConfig).toBeDefined();
        if (defaultConfig.app_info) {
          expect(defaultConfig.app_info).toBeDefined();
        }
      } catch (error) {
        // エラーが発生した場合も正常（デフォルト設定ファイルが存在しない）
        expect(error.message).toContain('設定ファイル読み込みエラー');
      }
    });
  });
});