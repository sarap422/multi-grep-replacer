const { ipcMain, dialog } = require('electron');
const ConfigManager = require('./config-manager');
const FileOperations = require('./file-operations');
const debugLogger = require('./debug-logger');

/**
 * Register all IPC handlers for Multi Grep Replacer
 */
class IPCHandlers {
  /**
     * Register all IPC handlers
     * @param {BrowserWindow} mainWindow - Main application window
     */
  static registerHandlers(mainWindow) {
    // Basic ping test
    ipcMain.handle('ping', async () => {
      return 'pong';
    });
        
    // Configuration management handlers
    this.registerConfigHandlers();
        
    // File operations handlers
    this.registerFileHandlers(mainWindow);
        
    // Debug and performance handlers
    this.registerDebugHandlers();
        
    console.log('All IPC handlers registered successfully');
  }
    
  /**
     * Register configuration management handlers
     * @private
     */
  static registerConfigHandlers() {
    // Load configuration
    ipcMain.handle('config-load', async (event, filePath) => {
      try {
        const config = await ConfigManager.loadConfig(filePath);
        return { success: true, config };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Save configuration
    ipcMain.handle('config-save', async (event, config, filePath) => {
      try {
        await ConfigManager.saveConfig(config, filePath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Validate configuration
    ipcMain.handle('config-validate', async (event, config) => {
      try {
        const validation = ConfigManager.validateConfig(config);
        return { success: true, validation };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Get default configuration
    ipcMain.handle('config-get-default', async () => {
      try {
        const config = ConfigManager.getDefaultConfig();
        return { success: true, config };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Merge configurations
    ipcMain.handle('config-merge', async (event, defaultConfig, userConfig) => {
      try {
        const merged = ConfigManager.mergeConfigs(defaultConfig, userConfig);
        return { success: true, config: merged };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }
    
  /**
     * Register file operations handlers
     * @private
     */
  static registerFileHandlers(mainWindow) {
    // Select folder dialog
    ipcMain.handle('file-select-folder', async () => {
      try {
        const result = await dialog.showOpenDialog(mainWindow, {
          properties: ['openDirectory'],
          title: 'フォルダを選択してください'
        });
                
        if (result.canceled) {
          return { success: false, canceled: true };
        }
                
        return { success: true, path: result.filePaths[0] };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Select file dialog
    ipcMain.handle('file-select-file', async (event, options = {}) => {
      try {
        const dialogOptions = {
          properties: ['openFile'],
          title: options.title || 'ファイルを選択してください',
          filters: options.filters || [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        };
                
        const result = await dialog.showOpenDialog(mainWindow, dialogOptions);
                
        if (result.canceled) {
          return { success: false, canceled: true };
        }
                
        return { success: true, path: result.filePaths[0] };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Save file dialog
    ipcMain.handle('file-save-dialog', async (event, options = {}) => {
      try {
        const dialogOptions = {
          title: options.title || 'ファイルを保存',
          defaultPath: options.defaultPath || 'config.json',
          filters: options.filters || [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        };
                
        const result = await dialog.showSaveDialog(mainWindow, dialogOptions);
                
        if (result.canceled) {
          return { success: false, canceled: true };
        }
                
        return { success: true, path: result.filePath };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Find files in directory
    ipcMain.handle('file-find-files', async (event, directory, extensions, excludePatterns) => {
      try {
        const files = await FileOperations.findFiles(directory, extensions, excludePatterns);
        return { success: true, files };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Read file content
    ipcMain.handle('file-read-content', async (event, filePath) => {
      try {
        // Validate path safety
        if (!FileOperations.isSafePath(filePath)) {
          throw new Error('Unsafe file path detected');
        }
                
        const content = await FileOperations.readFileContent(filePath);
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Write file content
    ipcMain.handle('file-write-content', async (event, filePath, content) => {
      try {
        // Validate path safety
        if (!FileOperations.isSafePath(filePath)) {
          throw new Error('Unsafe file path detected');
        }
                
        await FileOperations.writeFileContent(filePath, content);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Check file permissions
    ipcMain.handle('file-check-permissions', async (event, filePath, mode) => {
      try {
        await FileOperations.checkFilePermissions(filePath, mode);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Get file statistics
    ipcMain.handle('file-get-stats', async (event, filePath) => {
      try {
        const stats = await FileOperations.getFileStats(filePath);
        return { success: true, stats };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Check if file is too large
    ipcMain.handle('file-is-too-large', async (event, filePath, maxSize) => {
      try {
        const isTooLarge = await FileOperations.isFileTooLarge(filePath, maxSize);
        return { success: true, isTooLarge };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }
    
  /**
     * Register debug and performance handlers
     * @private
     */
  static registerDebugHandlers() {
    // Log performance issue
    ipcMain.handle('debug-log-performance-issue', async (event, operation, metrics) => {
      try {
        debugLogger.logPerformanceIssue(operation, metrics);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Log performance success
    ipcMain.handle('debug-log-performance-success', async (event, operation, metrics) => {
      try {
        debugLogger.logPerformanceSuccess(operation, metrics);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Log UI response
    ipcMain.handle('debug-log-ui-response', async (event, elementId, action, responseTime) => {
      try {
        debugLogger.logUIResponse(elementId, action, responseTime);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Log IPC communication
    ipcMain.handle('debug-log-ipc-communication', async (event, channel, direction, data, duration) => {
      try {
        debugLogger.logIPCCommunication(channel, direction, data, duration);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Log file operation
    ipcMain.handle('debug-log-file-operation', async (event, operation, filePath, duration, fileCount) => {
      try {
        debugLogger.logFileOperation(operation, filePath, duration, fileCount);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Generate analysis report
    ipcMain.handle('debug-generate-analysis', async () => {
      try {
        debugLogger.generateAnalysisReport();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Log Electron error
    ipcMain.handle('debug-log-electron-error', async (event, operation, error, context) => {
      try {
        debugLogger.logElectronError(operation, error, context);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
        
    // Log task completion
    ipcMain.handle('debug-log-task-completion', async (event, taskId, details) => {
      try {
        debugLogger.logTaskCompletion(taskId, details);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }
    
  /**
     * Remove all registered IPC handlers
     */
  static removeAllHandlers() {
    const handlers = [
      'ping',
      'config-load',
      'config-save',
      'config-validate',
      'config-get-default',
      'config-merge',
      'file-select-folder',
      'file-select-file',
      'file-save-dialog',
      'file-find-files',
      'file-read-content',
      'file-write-content',
      'file-check-permissions',
      'file-get-stats',
      'file-is-too-large',
      'debug-log-performance-issue',
      'debug-log-performance-success',
      'debug-log-ui-response',
      'debug-log-ipc-communication',
      'debug-log-file-operation',
      'debug-generate-analysis',
      'debug-log-electron-error',
      'debug-log-task-completion'
    ];
        
    handlers.forEach((handler) => {
      ipcMain.removeAllListeners(handler);
    });
        
    console.log('All IPC handlers removed');
  }
}

module.exports = IPCHandlers;