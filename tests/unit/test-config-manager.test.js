/**
 * config-manager.js ユニットテスト
 * 設定管理機能の動作確認
 */

const path = require('path');
const fs = require('fs').promises;

// モジュールのパスを相対パスで指定
const ConfigManager = require('../../src/main/config-manager');

describe('ConfigManager (Main Process)', () => {
  let configManager;
  
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // ConfigManagerインスタンスを作成
    configManager = new ConfigManager();
    
    // fs.promises のモック設定
    jest.spyOn(fs, 'readFile').mockResolvedValue(JSON.stringify(global.testUtils.createMockConfig()));
    jest.spyOn(fs, 'writeFile').mockResolvedValue();
    jest.spyOn(fs, 'access').mockResolvedValue();
  });

  describe('Constructor', () => {
    it('デフォルト値で初期化される', () => {
      const manager = new ConfigManager();
      expect(manager.currentConfig).toBeNull();
      expect(manager.defaultConfigPath).toContain('config/default.json');
      expect(manager.isModified).toBe(false);
    });
  });

  describe('loadConfig', () => {
    it('設定ファイルを正常に読み込む', async () => {
      const config = await configManager.loadConfig('/mock/config.json');
      
      expect(fs.readFile).toHaveBeenCalledWith('/mock/config.json', 'utf8');
      expect(config).toHaveProperty('app_info');
      expect(config).toHaveProperty('replacements');
      expect(config).toHaveProperty('target_settings');
    });

    it('ファイルパス未指定時にデフォルト設定を読み込む', async () => {
      const config = await configManager.loadConfig();
      
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('config/default.json'),
        'utf8'
      );
    });

    it('不正なJSONファイルを拒否する', async () => {
      jest.spyOn(fs, 'readFile').mockResolvedValue('invalid json');
      
      await expect(configManager.loadConfig('/mock/invalid.json'))
        .rejects.toThrow('設定ファイルの形式が正しくありません');
    });

    it('存在しないファイルのエラーを適切に処理する', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      jest.spyOn(fs, 'readFile').mockRejectedValue(error);

      await expect(configManager.loadConfig('/mock/nonexistent.json'))
        .rejects.toThrow('設定ファイルが見つかりません');
    });
  });

  describe('saveConfig', () => {
    beforeEach(() => {
      configManager.currentConfig = global.testUtils.createMockConfig();
    });

    it('設定を正常に保存する', async () => {
      const savedPath = await configManager.saveConfig('/mock/save.json');
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        '/mock/save.json',
        expect.stringContaining('"app_info"'),
        'utf8'
      );
      expect(savedPath).toBe('/mock/save.json');
    });

    it('設定が空の場合にエラーを投げる', async () => {
      configManager.currentConfig = null;
      
      await expect(configManager.saveConfig('/mock/save.json'))
        .rejects.toThrow('保存する設定がありません');
    });

    it('保存時にタイムスタンプを更新する', async () => {
      await configManager.saveConfig('/mock/save.json');
      
      const savedData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(savedData.app_info.updated_at).toBeDefined();
    });
  });

  describe('validateConfig', () => {
    it('正常な設定を検証する', async () => {
      const validConfig = global.testUtils.createMockConfig();
      const result = await configManager.validateConfig(validConfig);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('必須フィールドの不足を検出する', async () => {
      const invalidConfig = {
        replacements: [] // app_info が不足
      };
      
      const result = await configManager.validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('app_info is required');
    });

    it('置換ルールの形式エラーを検出する', async () => {
      const invalidConfig = global.testUtils.createMockConfig();
      invalidConfig.replacements[0].from = ''; // 空の検索文字列
      
      const result = await configManager.validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('from'))).toBe(true);
    });

    it('ファイル拡張子の形式を検証する', async () => {
      const invalidConfig = global.testUtils.createMockConfig();
      invalidConfig.target_settings.file_extensions = ['html', '.css']; // .なしは無効
      
      const result = await configManager.validateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('extension'))).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    it('デフォルト設定を生成する', () => {
      const defaultConfig = configManager.getDefaultConfig();
      
      expect(defaultConfig).toHaveProperty('app_info');
      expect(defaultConfig).toHaveProperty('replacements');
      expect(defaultConfig).toHaveProperty('target_settings');
      expect(defaultConfig).toHaveProperty('replacement_settings');
      expect(defaultConfig).toHaveProperty('ui_settings');
      expect(defaultConfig).toHaveProperty('advanced_settings');
    });

    it('デフォルト設定が検証を通過する', async () => {
      const defaultConfig = configManager.getDefaultConfig();
      const result = await configManager.validateConfig(defaultConfig);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('addRecentConfig', () => {
    it('最近使用した設定を追加する', () => {
      configManager.addRecentConfig('/mock/config1.json');
      configManager.addRecentConfig('/mock/config2.json');
      
      const recent = configManager.getRecentConfigs();
      expect(recent).toContain('/mock/config1.json');
      expect(recent).toContain('/mock/config2.json');
    });

    it('最大履歴数を超えた場合に古いものを削除する', () => {
      // 10個以上追加して古いものが削除されることを確認
      for (let i = 0; i < 12; i++) {
        configManager.addRecentConfig(`/mock/config${i}.json`);
      }
      
      const recent = configManager.getRecentConfigs();
      expect(recent.length).toBeLessThanOrEqual(10);
      expect(recent).not.toContain('/mock/config0.json');
      expect(recent).toContain('/mock/config11.json');
    });

    it('重複する設定は最新位置に移動する', () => {
      configManager.addRecentConfig('/mock/config1.json');
      configManager.addRecentConfig('/mock/config2.json');
      configManager.addRecentConfig('/mock/config1.json'); // 重複
      
      const recent = configManager.getRecentConfigs();
      expect(recent[0]).toBe('/mock/config1.json'); // 最新に移動
      expect(recent.filter(path => path === '/mock/config1.json').length).toBe(1);
    });
  });

  describe('exportConfig', () => {
    it('設定をJSON形式でエクスポートする', async () => {
      configManager.currentConfig = global.testUtils.createMockConfig();
      
      const exported = await configManager.exportConfig('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveProperty('app_info');
      expect(parsed).toHaveProperty('replacements');
    });

    it('設定をCSV形式でエクスポートする', async () => {
      configManager.currentConfig = global.testUtils.createMockConfig();
      
      const exported = await configManager.exportConfig('csv');
      
      expect(exported).toContain('Rule ID,From,To,Enabled,Description');
      expect(exported).toContain('rule_001,old-class,new-class,true');
    });

    it('サポートされていない形式でエラーを投げる', async () => {
      configManager.currentConfig = global.testUtils.createMockConfig();
      
      await expect(configManager.exportConfig('xml'))
        .rejects.toThrow('サポートされていない形式です');
    });
  });
});

describe('ConfigManager エラーハンドリング', () => {
  let configManager;
  
  beforeEach(() => {
    configManager = new ConfigManager();
  });

  it('ファイル読み込みエラーを適切に処理する', async () => {
    jest.spyOn(fs, 'readFile').mockRejectedValue(new Error('Disk error'));
    
    await expect(configManager.loadConfig('/mock/config.json'))
      .rejects.toThrow('設定ファイルの読み込みに失敗しました');
  });

  it('ファイル保存エラーを適切に処理する', async () => {
    configManager.currentConfig = global.testUtils.createMockConfig();
    jest.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Disk full'));
    
    await expect(configManager.saveConfig('/mock/save.json'))
      .rejects.toThrow('設定ファイルの保存に失敗しました');
  });
});

console.log('✅ ConfigManager unit tests loaded');