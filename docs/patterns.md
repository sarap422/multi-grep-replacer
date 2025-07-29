# PATTERNS.md - Electronベストプラクティス集

このファイルには、Multi Grep Replacer開発で発見・確立したElectronパターンとベストプラクティスを記録します。

## ファイル検索エンジンパターン

### EventEmitterベースの非同期検索
```javascript
// 効果的な実装例
const { EventEmitter } = require('events');

class FileSearchEngine extends EventEmitter {
  async searchFiles(directory, extensions, options) {
    const searchId = `search-${Date.now()}`;
    
    // 進捗通知
    this.emit('progress', {
      searchId,
      filesFound: results.length,
      directoriesScanned: this.stats.totalDirectories,
    });
    
    // バッチ処理で効率化
    const batchSize = 10;
    for (let i = 0; i < entries.length; i += batchSize) {
      const batch = entries.slice(i, i + batchSize);
      await Promise.all(batch.map(async entry => {
        // 並列処理
      }));
    }
  }
}
```

### IPC通信での進捗通知パターン
```javascript
// Main Process
ipcMain.handle('search-files', async (event, directory, extensions) => {
  fileSearchEngine.removeAllListeners('progress');
  fileSearchEngine.on('progress', progressData => {
    event.sender.send('search-progress', progressData);
  });
  
  const result = await fileSearchEngine.searchFiles(directory, extensions);
  return { success: true, result };
});

// Renderer Process
window.electronAPI.onSearchProgress(progressData => {
  updateUI(progressData);
});
```

### ベストプラクティス
- EventEmitterで非同期処理の進捗を通知
- AbortControllerでキャンセル機能を実装
- バッチ処理で大量ファイルを効率的に処理
- IPC通信では軽量なデータのみ送信

### トラブルシューティング
- **問題**: DebugLoggerメソッドが見つからない
- **解決**: 使用前にメソッドの存在を確認、必要に応じて実装追加
- **学習**: 外部依存関係は事前に検証が必要

## Electron基盤構築パターン

### セキュアな初期設定
```javascript
// main.js - セキュリティベストプラクティス
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,           // セキュリティ強化
    contextIsolation: true,           // 必須設定
    preload: path.join(__dirname, '../preload/preload.js')
  }
});
```

### IPC通信基本パターン
```javascript
// preload.js - セキュアAPI公開
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping')
});
```

## テストパターン

### Jestテストファイル命名
```
✅ 正しい: file-search-engine.test.js
❌ 間違い: test-file-search-engine.js
```

### 高速処理のキャンセルテスト
```javascript
// キャンセルが効かない可能性を考慮
test('should be able to cancel search', async () => {
  const result = await searchPromise;
  // エラーまたは正常完了のいずれも許容
  expect(result).toBeDefined();
});
```