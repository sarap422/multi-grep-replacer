const { contextBridge, ipcRenderer } = require('electron');

// セキュアなAPIをレンダラープロセスに公開
contextBridge.exposeInMainWorld('electronAPI', {
  // バージョン情報
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  
  // 基本的なIPC通信テスト用
  ping: () => ipcRenderer.invoke('ping'),
  
  // プラットフォーム情報
  platform: process.platform,
  
  // アプリケーション情報
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // 設定管理API
  config: {
    load: (filePath) => ipcRenderer.invoke('config-load', filePath),
    save: (config, filePath) => ipcRenderer.invoke('config-save', config, filePath),
    validate: (config) => ipcRenderer.invoke('config-validate', config),
    getDefault: () => ipcRenderer.invoke('config-get-default'),
    merge: (defaultConfig, userConfig) => ipcRenderer.invoke('config-merge', defaultConfig, userConfig)
  },
  
  // ファイル操作API
  file: {
    selectFolder: () => ipcRenderer.invoke('file-select-folder'),
    selectFile: (options) => ipcRenderer.invoke('file-select-file', options),
    saveDialog: (options) => ipcRenderer.invoke('file-save-dialog', options),
    findFiles: (directory, extensions, excludePatterns) => 
      ipcRenderer.invoke('file-find-files', directory, extensions, excludePatterns),
    readContent: (filePath) => ipcRenderer.invoke('file-read-content', filePath),
    writeContent: (filePath, content) => ipcRenderer.invoke('file-write-content', filePath, content),
    checkPermissions: (filePath, mode) => ipcRenderer.invoke('file-check-permissions', filePath, mode),
    getStats: (filePath) => ipcRenderer.invoke('file-get-stats', filePath),
    isTooLarge: (filePath, maxSize) => ipcRenderer.invoke('file-is-too-large', filePath, maxSize)
  },
  
  // デバッグ・パフォーマンス監視API
  debug: {
    logPerformanceIssue: (operation, metrics) => 
      ipcRenderer.invoke('debug-log-performance-issue', operation, metrics),
    logPerformanceSuccess: (operation, metrics) => 
      ipcRenderer.invoke('debug-log-performance-success', operation, metrics),
    logUIResponse: (elementId, action, responseTime) => 
      ipcRenderer.invoke('debug-log-ui-response', elementId, action, responseTime),
    logIPCCommunication: (channel, direction, data, duration) => 
      ipcRenderer.invoke('debug-log-ipc-communication', channel, direction, data, duration),
    logFileOperation: (operation, filePath, duration, fileCount) => 
      ipcRenderer.invoke('debug-log-file-operation', operation, filePath, duration, fileCount),
    generateAnalysis: () => 
      ipcRenderer.invoke('debug-generate-analysis'),
    logElectronError: (operation, error, context) => 
      ipcRenderer.invoke('debug-log-electron-error', operation, error, context),
    logTaskCompletion: (taskId, details) => 
      ipcRenderer.invoke('debug-log-task-completion', taskId, details)
  }
});

// preloadスクリプトのロード確認
console.log('Preload script loaded');
console.log('Context isolation enabled');
console.log('Node integration disabled');