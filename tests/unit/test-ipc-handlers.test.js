/**
 * ipc-handlers.js ユニットテスト
 * IPC通信ハンドラーの動作確認
 */

const { ipcMain } = require('electron');

// モジュールのパス
const IPCHandlers = require('../../src/main/ipc-handlers');
const FileOperations = require('../../src/main/file-operations');
const ConfigManager = require('../../src/main/config-manager');

// モジュールのモック
jest.mock('../../src/main/file-operations');
jest.mock('../../src/main/config-manager');
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
  }
}));

describe('IPCHandlers', () => {
  let ipcHandlers;
  let mockMainWindow;
  
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // モックウィンドウの作成
    mockMainWindow = {
      webContents: {
        send: jest.fn()
      }
    };
    
    // FileOperationsのモック設定
    FileOperations.selectFolder = jest.fn();
    FileOperations.findFiles = jest.fn();
    FileOperations.readFileContent = jest.fn();
    FileOperations.writeFileContent = jest.fn();
    FileOperations.checkFilePermissions = jest.fn();
    
    // ConfigManagerのモック設定
    ConfigManager.prototype.loadConfig = jest.fn();
    ConfigManager.prototype.saveConfig = jest.fn();
    ConfigManager.prototype.validateConfig = jest.fn();
    ConfigManager.prototype.getRecentConfigs = jest.fn();
    
    // IPCHandlersインスタンスを作成
    ipcHandlers = new IPCHandlers(mockMainWindow);
  });

  describe('Constructor', () => {
    it('適切に初期化される', () => {
      expect(ipcHandlers.mainWindow).toBe(mockMainWindow);
      expect(ipcHandlers.fileOperations).toBeInstanceOf(Object);
      expect(ipcHandlers.configManager).toBeInstanceOf(ConfigManager);
    });

    it('IPC ハンドラーが正しく登録される', () => {
      new IPCHandlers(mockMainWindow);
      
      // ipcMain.handle が適切な回数呼ばれることを確認
      expect(ipcMain.handle).toHaveBeenCalledWith('select-folder', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('find-files', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('read-file', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('write-file', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('load-config', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('save-config', expect.any(Function));
      expect(ipcMain.handle).toHaveBeenCalledWith('validate-config', expect.any(Function));
    });
  });

  describe('フォルダ選択ハンドラー', () => {
    it('フォルダ選択が正常に動作する', async () => {
      FileOperations.selectFolder.mockResolvedValue('/selected/folder');
      
      const result = await ipcHandlers.handleSelectFolder();
      
      expect(FileOperations.selectFolder).toHaveBeenCalledWith(mockMainWindow);
      expect(result).toBe('/selected/folder');
    });

    it('フォルダ選択キャンセル時にnullを返す', async () => {
      FileOperations.selectFolder.mockResolvedValue(null);
      
      const result = await ipcHandlers.handleSelectFolder();
      
      expect(result).toBeNull();
    });

    it('フォルダ選択エラーを適切に処理する', async () => {
      FileOperations.selectFolder.mockRejectedValue(new Error('Dialog error'));
      
      await expect(ipcHandlers.handleSelectFolder())
        .rejects.toThrow('フォルダ選択に失敗しました');
    });
  });

  describe('ファイル検索ハンドラー', () => {
    it('ファイル検索が正常に動作する', async () => {
      const mockFiles = ['/path/file1.js', '/path/file2.html'];
      FileOperations.findFiles.mockResolvedValue(mockFiles);
      
      const result = await ipcHandlers.handleFindFiles(
        '/search/path',
        ['.js', '.html'],
        ['node_modules/**']
      );
      
      expect(FileOperations.findFiles).toHaveBeenCalledWith(
        '/search/path',
        ['.js', '.html'],
        ['node_modules/**']
      );
      expect(result).toEqual(mockFiles);
    });

    it('無効なパラメータでエラーを投げる', async () => {
      await expect(ipcHandlers.handleFindFiles('', ['.js'], []))
        .rejects.toThrow('検索パスが指定されていません');
    });
  });

  describe('ファイル読み取りハンドラー', () => {
    it('ファイル読み取りが正常に動作する', async () => {
      FileOperations.readFileContent.mockResolvedValue('file content');
      
      const result = await ipcHandlers.handleReadFile('/path/to/file.txt');
      
      expect(FileOperations.readFileContent).toHaveBeenCalledWith('/path/to/file.txt');
      expect(result).toBe('file content');
    });

    it('無効なファイルパスでエラーを投げる', async () => {
      await expect(ipcHandlers.handleReadFile(''))
        .rejects.toThrow('ファイルパスが指定されていません');
    });
  });

  describe('ファイル書き込みハンドラー', () => {
    it('ファイル書き込みが正常に動作する', async () => {
      FileOperations.writeFileContent.mockResolvedValue();
      
      await ipcHandlers.handleWriteFile('/path/to/file.txt', 'new content');
      
      expect(FileOperations.writeFileContent).toHaveBeenCalledWith(
        '/path/to/file.txt',
        'new content'
      );
    });

    it('空のコンテンツでもエラーを投げない', async () => {
      FileOperations.writeFileContent.mockResolvedValue();
      
      await expect(ipcHandlers.handleWriteFile('/path/to/file.txt', ''))
        .resolves.not.toThrow();
    });
  });

  describe('設定読み込みハンドラー', () => {
    it('設定読み込みが正常に動作する', async () => {
      const mockConfig = global.testUtils.createMockConfig();
      ipcHandlers.configManager.loadConfig.mockResolvedValue(mockConfig);
      
      const result = await ipcHandlers.handleLoadConfig('/path/to/config.json');
      
      expect(ipcHandlers.configManager.loadConfig).toHaveBeenCalledWith('/path/to/config.json');
      expect(result).toEqual(mockConfig);
    });

    it('パス未指定時にデフォルト設定を読み込む', async () => {
      const mockConfig = global.testUtils.createMockConfig();
      ipcHandlers.configManager.loadConfig.mockResolvedValue(mockConfig);
      
      const result = await ipcHandlers.handleLoadConfig();
      
      expect(ipcHandlers.configManager.loadConfig).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockConfig);
    });
  });

  describe('設定保存ハンドラー', () => {
    it('設定保存が正常に動作する', async () => {
      const mockConfig = global.testUtils.createMockConfig();
      ipcHandlers.configManager.saveConfig.mockResolvedValue('/saved/path.json');
      
      const result = await ipcHandlers.handleSaveConfig(mockConfig, '/save/path.json');
      
      expect(ipcHandlers.configManager.saveConfig).toHaveBeenCalledWith('/save/path.json');
      expect(result).toBe('/saved/path.json');
    });

    it('設定が空の場合にエラーを投げる', async () => {
      await expect(ipcHandlers.handleSaveConfig(null, '/save/path.json'))
        .rejects.toThrow('保存する設定が指定されていません');
    });
  });

  describe('設定検証ハンドラー', () => {
    it('設定検証が正常に動作する', async () => {
      const mockConfig = global.testUtils.createMockConfig();
      const mockResult = { isValid: true, errors: [] };
      ipcHandlers.configManager.validateConfig.mockResolvedValue(mockResult);
      
      const result = await ipcHandlers.handleValidateConfig(mockConfig);
      
      expect(ipcHandlers.configManager.validateConfig).toHaveBeenCalledWith(mockConfig);
      expect(result).toEqual(mockResult);
    });

    it('無効な設定の検証結果を返す', async () => {
      const invalidConfig = { replacements: [] };
      const mockResult = { isValid: false, errors: ['app_info is required'] };
      ipcHandlers.configManager.validateConfig.mockResolvedValue(mockResult);
      
      const result = await ipcHandlers.handleValidateConfig(invalidConfig);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('app_info is required');
    });
  });

  describe('進捗通知', () => {
    it('進捗通知が正常に送信される', () => {
      const progressData = {
        current: 50,
        total: 100,
        currentFile: '/path/file.js',
        percentage: 50
      };
      
      ipcHandlers.sendProgress(progressData);
      
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'replacement-progress',
        progressData
      );
    });

    it('メインウィンドウが無い場合にエラーを投げない', () => {
      ipcHandlers.mainWindow = null;
      
      expect(() => {
        ipcHandlers.sendProgress({ current: 1, total: 10 });
      }).not.toThrow();
    });
  });

  describe('エラーハンドリング', () => {
    it('IPC ハンドラーエラーがログ出力される', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      FileOperations.selectFolder.mockRejectedValue(new Error('Test error'));
      
      await expect(ipcHandlers.handleSelectFolder())
        .rejects.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('予期しないエラーが適切に処理される', async () => {
      FileOperations.findFiles.mockRejectedValue(new Error('Unexpected error'));
      
      await expect(ipcHandlers.handleFindFiles('/path', ['.js'], []))
        .rejects.toThrow('ファイル検索に失敗しました');
    });
  });
});

console.log('✅ IPCHandlers unit tests loaded');