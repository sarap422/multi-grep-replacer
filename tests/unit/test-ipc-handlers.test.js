/**
 * IPCHandlers Unit Tests
 * IPC通信ハンドラーのテスト
 */

const { ipcMain } = require('electron');
const IPCHandlers = require('../../src/main/ipc-handlers');
const ConfigManager = require('../../src/main/config-manager');
const FileOperations = require('../../src/main/file-operations');

// Electronモジュールのモック
jest.mock('electron', () => ({
  ipcMain: {
    handle: jest.fn(),
    removeAllListeners: jest.fn()
  },
  dialog: {
    showOpenDialog: jest.fn(),
    showSaveDialog: jest.fn()
  }
}));

// 依存モジュールのモック
jest.mock('../../src/main/config-manager');
jest.mock('../../src/main/file-operations');

describe('IPCHandlers', () => {
  let mockMainWindow;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock BrowserWindow
    mockMainWindow = {
      webContents: {
        send: jest.fn()
      }
    };
    
    // IPC ハンドラーの登録をクリア
    ipcMain.handle.mockClear();
  });

  describe('registerHandlers', () => {
    it('全てのIPCハンドラーを正常に登録すること', () => {
      IPCHandlers.registerHandlers(mockMainWindow);

      // 基本ハンドラー + 設定管理 + ファイル操作 = 16個のハンドラー
      expect(ipcMain.handle).toHaveBeenCalledTimes(16);
      
      // 主要なハンドラーが登録されていることを確認
      const handlerCalls = ipcMain.handle.mock.calls.map(call => call[0]);
      
      expect(handlerCalls).toContain('ping');
      expect(handlerCalls).toContain('config-load');
      expect(handlerCalls).toContain('config-save');
      expect(handlerCalls).toContain('config-validate');
      expect(handlerCalls).toContain('config-get-default');
      expect(handlerCalls).toContain('config-merge');
      expect(handlerCalls).toContain('file-select-folder');
      expect(handlerCalls).toContain('file-select-file');
      expect(handlerCalls).toContain('file-save-dialog');
      expect(handlerCalls).toContain('file-find-files');
      expect(handlerCalls).toContain('file-read-content');
      expect(handlerCalls).toContain('file-write-content');
      expect(handlerCalls).toContain('file-check-permissions');
      expect(handlerCalls).toContain('file-get-stats');
      expect(handlerCalls).toContain('file-is-too-large');
    });
  });

  describe('ping handler', () => {
    it('ping リクエストに pong で応答すること', async () => {
      IPCHandlers.registerHandlers(mockMainWindow);
      
      // ping ハンドラーを取得
      const pingHandler = ipcMain.handle.mock.calls.find(call => call[0] === 'ping')[1];
      
      const result = await pingHandler();
      expect(result).toBe('pong');
    });
  });

  describe('config handlers', () => {
    beforeEach(() => {
      IPCHandlers.registerHandlers(mockMainWindow);
    });

    describe('config-load', () => {
      it('設定読み込みが成功すること', async () => {
        const testConfig = testHelpers.getSampleConfig();
        ConfigManager.loadConfig.mockResolvedValue(testConfig);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'config-load')[1];
        const result = await handler(null, '/test/config.json');
        
        expect(ConfigManager.loadConfig).toHaveBeenCalledWith('/test/config.json');
        expect(result).toEqual({ success: true, config: testConfig });
      });

      it('設定読み込みが失敗した場合にエラーを返すこと', async () => {
        const errorMessage = 'Config file not found';
        ConfigManager.loadConfig.mockRejectedValue(new Error(errorMessage));
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'config-load')[1];
        const result = await handler(null, '/test/nonexistent.json');
        
        expect(result).toEqual({ success: false, error: errorMessage });
      });
    });

    describe('config-save', () => {
      it('設定保存が成功すること', async () => {
        const testConfig = testHelpers.getSampleConfig();
        ConfigManager.saveConfig.mockResolvedValue();
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'config-save')[1];
        const result = await handler(null, testConfig, '/test/config.json');
        
        expect(ConfigManager.saveConfig).toHaveBeenCalledWith(testConfig, '/test/config.json');
        expect(result).toEqual({ success: true });
      });

      it('設定保存が失敗した場合にエラーを返すこと', async () => {
        const errorMessage = 'Permission denied';
        ConfigManager.saveConfig.mockRejectedValue(new Error(errorMessage));
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'config-save')[1];
        const result = await handler(null, {}, '/test/config.json');
        
        expect(result).toEqual({ success: false, error: errorMessage });
      });
    });

    describe('config-validate', () => {
      it('設定検証が成功すること', async () => {
        const validation = { valid: true, errors: [] };
        ConfigManager.validateConfig.mockReturnValue(validation);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'config-validate')[1];
        const result = await handler(null, testHelpers.getSampleConfig());
        
        expect(result).toEqual({ success: true, validation });
      });

      it('設定検証が失敗した場合にエラーを返すこと', async () => {
        const errorMessage = 'Validation error';
        ConfigManager.validateConfig.mockImplementation(() => {
          throw new Error(errorMessage);
        });
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'config-validate')[1];
        const result = await handler(null, {});
        
        expect(result).toEqual({ success: false, error: errorMessage });
      });
    });

    describe('config-get-default', () => {
      it('デフォルト設定を正常に取得できること', async () => {
        const defaultConfig = testHelpers.getSampleConfig();
        ConfigManager.getDefaultConfig.mockReturnValue(defaultConfig);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'config-get-default')[1];
        const result = await handler();
        
        expect(result).toEqual({ success: true, config: defaultConfig });
      });
    });

    describe('config-merge', () => {
      it('設定マージが成功すること', async () => {
        const mergedConfig = testHelpers.getSampleConfig();
        ConfigManager.mergeConfigs.mockReturnValue(mergedConfig);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'config-merge')[1];
        const result = await handler(null, {}, {});
        
        expect(result).toEqual({ success: true, config: mergedConfig });
      });
    });
  });

  describe('file handlers', () => {
    const { dialog } = require('electron');

    beforeEach(() => {
      IPCHandlers.registerHandlers(mockMainWindow);
    });

    describe('file-select-folder', () => {
      it('フォルダ選択が成功すること', async () => {
        dialog.showOpenDialog.mockResolvedValue({
          canceled: false,
          filePaths: ['/test/selected/folder']
        });
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-select-folder')[1];
        const result = await handler();
        
        expect(dialog.showOpenDialog).toHaveBeenCalledWith(mockMainWindow, {
          properties: ['openDirectory'],
          title: 'フォルダを選択してください'
        });
        expect(result).toEqual({ success: true, path: '/test/selected/folder' });
      });

      it('フォルダ選択がキャンセルされた場合', async () => {
        dialog.showOpenDialog.mockResolvedValue({
          canceled: true,
          filePaths: []
        });
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-select-folder')[1];
        const result = await handler();
        
        expect(result).toEqual({ success: false, canceled: true });
      });

      it('ダイアログエラーを適切に処理すること', async () => {
        const errorMessage = 'Dialog error';
        dialog.showOpenDialog.mockRejectedValue(new Error(errorMessage));
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-select-folder')[1];
        const result = await handler();
        
        expect(result).toEqual({ success: false, error: errorMessage });
      });
    });

    describe('file-find-files', () => {
      it('ファイル検索が成功すること', async () => {
        const foundFiles = testHelpers.getSampleFiles();
        FileOperations.findFiles.mockResolvedValue(foundFiles);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-find-files')[1];
        const result = await handler(null, '/test/dir', ['.js'], ['node_modules/**']);
        
        expect(FileOperations.findFiles).toHaveBeenCalledWith('/test/dir', ['.js'], ['node_modules/**']);
        expect(result).toEqual({ success: true, files: foundFiles });
      });

      it('ファイル検索が失敗した場合にエラーを返すこと', async () => {
        const errorMessage = 'Search failed';
        FileOperations.findFiles.mockRejectedValue(new Error(errorMessage));
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-find-files')[1];
        const result = await handler(null, '/test/dir', [], []);
        
        expect(result).toEqual({ success: false, error: errorMessage });
      });
    });

    describe('file-read-content', () => {
      it('ファイル読み込みが成功すること', async () => {
        const content = 'test file content';
        FileOperations.isSafePath.mockReturnValue(true);
        FileOperations.readFileContent.mockResolvedValue(content);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-read-content')[1];
        const result = await handler(null, '/test/file.txt');
        
        expect(FileOperations.isSafePath).toHaveBeenCalledWith('/test/file.txt');
        expect(FileOperations.readFileContent).toHaveBeenCalledWith('/test/file.txt');
        expect(result).toEqual({ success: true, content });
      });

      it('安全でないパスを拒否すること', async () => {
        FileOperations.isSafePath.mockReturnValue(false);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-read-content')[1];
        const result = await handler(null, '../../../etc/passwd');
        
        expect(result).toEqual({ success: false, error: 'Unsafe file path detected' });
        expect(FileOperations.readFileContent).not.toHaveBeenCalled();
      });
    });

    describe('file-write-content', () => {
      it('ファイル書き込みが成功すること', async () => {
        FileOperations.isSafePath.mockReturnValue(true);
        FileOperations.writeFileContent.mockResolvedValue();
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-write-content')[1];
        const result = await handler(null, '/test/file.txt', 'test content');
        
        expect(FileOperations.isSafePath).toHaveBeenCalledWith('/test/file.txt');
        expect(FileOperations.writeFileContent).toHaveBeenCalledWith('/test/file.txt', 'test content');
        expect(result).toEqual({ success: true });
      });

      it('安全でないパスを拒否すること', async () => {
        FileOperations.isSafePath.mockReturnValue(false);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-write-content')[1];
        const result = await handler(null, '../../../etc/passwd', 'malicious content');
        
        expect(result).toEqual({ success: false, error: 'Unsafe file path detected' });
        expect(FileOperations.writeFileContent).not.toHaveBeenCalled();
      });
    });

    describe('file-get-stats', () => {
      it('ファイル統計情報を正常に取得できること', async () => {
        const stats = {
          size: 1024,
          sizeHuman: '1 KB',
          modified: new Date(),
          isFile: true,
          isDirectory: false
        };
        FileOperations.getFileStats.mockResolvedValue(stats);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-get-stats')[1];
        const result = await handler(null, '/test/file.txt');
        
        expect(result).toEqual({ success: true, stats });
      });
    });

    describe('file-is-too-large', () => {
      it('ファイルサイズチェックが正常に動作すること', async () => {
        FileOperations.isFileTooLarge.mockResolvedValue(false);
        
        const handler = ipcMain.handle.mock.calls.find(call => call[0] === 'file-is-too-large')[1];
        const result = await handler(null, '/test/file.txt', 1048576);
        
        expect(FileOperations.isFileTooLarge).toHaveBeenCalledWith('/test/file.txt', 1048576);
        expect(result).toEqual({ success: true, isTooLarge: false });
      });
    });
  });

  describe('removeAllHandlers', () => {
    it('全てのIPCハンドラーを正常に削除すること', () => {
      IPCHandlers.removeAllHandlers();
      
      // 16個のハンドラーが削除されることを確認
      expect(ipcMain.removeAllListeners).toHaveBeenCalledTimes(15); // ping + config(5) + file(9)
      
      // 主要なハンドラーが削除されていることを確認
      const removedHandlers = ipcMain.removeAllListeners.mock.calls.map(call => call[0]);
      
      expect(removedHandlers).toContain('ping');
      expect(removedHandlers).toContain('config-load');
      expect(removedHandlers).toContain('file-select-folder');
    });
  });
});