const { contextBridge, ipcRenderer } = require('electron');

// レンダラープロセスに公開するセキュアなAPI
contextBridge.exposeInMainWorld('electronAPI', {
    // アプリケーション情報
    versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron
    },
    
    // ファイル操作API
    fileOperations: {
        selectFolder: () => ipcRenderer.invoke('select-folder'),
        readFile: (path) => ipcRenderer.invoke('read-file', path),
        writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
        findFiles: (directory, extensions) => ipcRenderer.invoke('find-files', directory, extensions),
        getFileStats: (files) => ipcRenderer.invoke('get-file-stats', files)
    },
    
    // 置換処理API
    replacementOperations: {
        executeReplacement: (config) => ipcRenderer.invoke('execute-replacement', config),
        cancelReplacement: () => ipcRenderer.invoke('cancel-replacement'),
        generatePreview: (config) => ipcRenderer.invoke('generate-preview', config),
        validateConfig: (config) => ipcRenderer.invoke('validate-config', config)
    },
    
    // 設定管理API
    configOperations: {
        loadConfig: (path) => ipcRenderer.invoke('load-config', path),
        saveConfig: (config, path) => ipcRenderer.invoke('save-config', config, path),
        getDefaultConfig: () => ipcRenderer.invoke('get-default-config'),
        getRecentConfigs: () => ipcRenderer.invoke('get-recent-configs')
    },

    // システム情報API
    systemOperations: {
        getAppInfo: () => ipcRenderer.invoke('get-app-info'),
        getProcessingStatus: () => ipcRenderer.invoke('get-processing-status')
    },
    
    // 進捗通知の受信
    onProgress: (callback) => {
        // 既存のリスナーを削除してから新しいリスナーを追加
        ipcRenderer.removeAllListeners('replacement-progress');
        ipcRenderer.on('replacement-progress', (event, progress) => callback(progress));
    },
    
    // エラー通知の受信
    onError: (callback) => {
        ipcRenderer.removeAllListeners('replacement-error');
        ipcRenderer.on('replacement-error', (event, error) => callback(error));
    },
    
    // 完了通知の受信
    onComplete: (callback) => {
        ipcRenderer.removeAllListeners('replacement-complete');
        ipcRenderer.on('replacement-complete', (event, results) => callback(results));
    }
});

// Preloadスクリプトのエラーハンドリング
window.addEventListener('error', (event) => {
    console.error('Preload script error:', event.error);
});

console.log('Preload script loaded successfully');