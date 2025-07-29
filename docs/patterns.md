# PATTERNS.md - Electronベストプラクティス集

このファイルには、Multi Grep Replacer開発で発見・確立したElectronパターンとベストプラクティスを記録します。

## Async/Await統一パターン

### メインプロセスでの非同期関数統一
```javascript
// ✅ 良い例：すべてのDebugLogger呼び出しをawaitで統一
class MultiGrepReplacerApp {
  async createMainWindow() {
    await DebugLogger.info('Creating main window...');
    
    try {
      // ウィンドウ作成処理
      await DebugLogger.debug('Loading HTML file', { htmlPath });
      
      // ファイル存在確認
      if (!require('fs').existsSync(absoluteHtmlPath)) {
        await DebugLogger.error('HTML file loading failed', { error: error.message });
        throw error;
      }
      
      await DebugLogger.info('Main window created successfully');
    } catch (error) {
      await DebugLogger.logError(error, { phase: 'window-creation' });
      throw error;
    }
  }
}

// ❌ 避けるべき例：同期・非同期の混在
function createMainWindow() {
  DebugLogger.info('Creating window...'); // 同期
  await DebugLogger.error('Error occurred'); // SyntaxError!
}
```

### 非同期メソッド呼び出しの統一
```javascript
// ✅ 良い例：呼び出し側もawaitで統一
app.whenReady().then(async () => {
  await DebugLogger.info('App ready, creating main window');
  await this.createMainWindow(); // awaitを忘れずに
  
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await this.createMainWindow(); // ここもawait
    }
  });
});

// ❌ 避けるべき例：awaitなしの呼び出し
this.createMainWindow(); // Promiseが放置される
```

## セキュリティパターン

### Context Isolationでのセキュリティ検証
```javascript
// preload.js - 適切なセキュリティ検証
const validateSecurity = () => {
  // preloadスクリプト内では require は利用可能 (正常)
  // レンダラープロセスでの require 利用をチェック
  if (typeof window !== 'undefined' && typeof window.require !== 'undefined') {
    console.warn('⚠️ Potential context isolation bypass detected');
  }

  // process オブジェクトの漏れを検証
  if (typeof window !== 'undefined' && typeof window.process !== 'undefined') {
    console.warn('⚠️ process object leak detected in renderer process');
  }

  console.log('🔒 Security validation completed - preload context is secure');
};

// ❌ 避けるべき例：preload内での誤検知
if (typeof require !== 'undefined') {
  console.warn('⚠️ Node.js integration detected'); // preloadでは正常なので誤検知
}
```

### レンダラープロセスでのエラーハンドリング
```javascript
// app.js - 詳細なエラー情報とガイダンス
async handleNewFileSearch() {
  try {
    // セキュリティチェック
    if (typeof process !== 'undefined') {
      console.warn('⚠️ process object detected in renderer - this should not happen');
    }
    
    const result = await window.electronAPI.searchFiles(directory, extensions, options);
  } catch (error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // 詳細なエラー情報を表示
    let errorMessage = error.message;
    if (error.message.includes('process is not defined')) {
      errorMessage += '\n\n解決方法: Electronのセキュリティ設定により、レンダラープロセスでは process オブジェクトを使用できません。';
    }
    
    this.displayResult('searchResult', `❌ エラー: ${errorMessage}`);
  }
}
```

## ウィンドウライフサイクル管理パターン

### 適切なウィンドウクリーンアップ
```javascript
// ✅ 良い例：適切なウィンドウライフサイクル管理
class MultiGrepReplacerApp {
  async createMainWindow() {
    this.mainWindow = new BrowserWindow({ /* options */ });
    
    // HTMLファイル読み込み (パッケージ版対応)
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    const absoluteHtmlPath = path.resolve(htmlPath);
    
    // ファイル存在確認
    if (!require('fs').existsSync(absoluteHtmlPath)) {
      const error = new Error(`HTML file not found: ${absoluteHtmlPath}`);
      await DebugLogger.error('HTML file loading failed', { error: error.message });
      throw error;
    }
    
    this.mainWindow.loadFile(absoluteHtmlPath);

    // ウィンドウクローズイベント - 適切なクリーンアップ
    this.mainWindow.on('closed', async () => {
      await DebugLogger.info('Main window closed');
      this.mainWindow = null; // 参照をクリア
    });
  }
  
  // アプリイベントリスナー
  setupAppEventListeners() {
    // 全ウィンドウクローズ時
    app.on('window-all-closed', async () => {
      await DebugLogger.info('All windows closed');
      
      // メインウィンドウ参照をクリア
      this.mainWindow = null;
      
      // macOS以外では完全終了
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });
    
    // macOS: Dock アイコンクリック時のウィンドウ再作成
    app.on('activate', async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await this.createMainWindow();
      }
    });
  }
}

// ❌ 避けるべき例：参照の適切な管理なし
this.mainWindow.on('closed', () => {
  // this.mainWindow = null; // これを忘れると参照が残る
});
```

### パッケージ版対応のファイルパス解決
```javascript
// ✅ 良い例：開発・パッケージ両対応のパス解決
const htmlPath = path.join(__dirname, '../renderer/index.html');
const absoluteHtmlPath = path.resolve(htmlPath);

await DebugLogger.debug('Loading HTML file', { 
  htmlPath, 
  absoluteHtmlPath,
  exists: require('fs').existsSync(absoluteHtmlPath) 
});

// ファイル存在確認
if (!require('fs').existsSync(absoluteHtmlPath)) {
  const error = new Error(`HTML file not found: ${absoluteHtmlPath}`);
  await DebugLogger.error('HTML file loading failed', { error: error.message });
  throw error;
}

this.mainWindow.loadFile(absoluteHtmlPath);

// ❌ 避けるべき例：相対パスの直接使用
this.mainWindow.loadFile('../renderer/index.html'); // パッケージ版で失敗する可能性
```

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