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
  getAppInfo: () => ipcRenderer.invoke('get-app-info')
});

// preloadスクリプトのロード確認
console.log('Preload script loaded');
console.log('Context isolation enabled');
console.log('Node integration disabled');