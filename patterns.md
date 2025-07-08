# Electronパターン・ベストプラクティス集

## Electron基盤構築パターン

### セキュアな初期設定パターン

```javascript
// main.js - セキュリティベストプラクティス
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const SecurityValidator = require('./security-validator');

function createWindow() {
  // セキュアなwebPreferences設定を取得
  const securePreferences = SecurityValidator.getSecureWebPreferences();
  const webPreferences = {
    ...securePreferences,
    preload: path.join(__dirname, '../preload/preload.js')
  };
  
  // セキュリティ検証を実行
  const issues = SecurityValidator.validateWebPreferences(webPreferences);
  SecurityValidator.logValidationResults(issues);
  
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 700,
    webPreferences
  });
}
```

**学習ポイント**:
- セキュリティ設定は別モジュールで管理
- 設定の検証を自動化
- 開発時にセキュリティ問題を早期発見

### IPC通信基本パターン

```javascript
// preload.js - セキュアAPI公開
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 基本的な通信テスト
  ping: () => ipcRenderer.invoke('ping'),
  
  // アプリケーション情報取得
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // バージョン情報
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});
```

```javascript
// main.js - IPCハンドラー登録
function registerIPCHandlers() {
  // Pingテスト用ハンドラー
  ipcMain.handle('ping', async () => {
    return {
      message: 'pong',
      timestamp: Date.now(),
      processInfo: {
        pid: process.pid,
        platform: process.platform,
        version: app.getVersion()
      }
    };
  });
  
  // アプリ情報取得
  ipcMain.handle('get-app-info', async () => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      electronVersion: process.versions.electron
    };
  });
}
```

**学習ポイント**:
- `ipcRenderer.invoke()` + `ipcMain.handle()` パターンを使用
- 非同期処理で応答性を確保
- レスポンスにコンテキスト情報を含める

### UI応答性監視パターン

```javascript
// app.js - UI応答性監視
class PerformanceMonitor {
  static UI_RESPONSE_TARGET = 100; // ms
  
  static async performPingTest() {
    const startTime = performance.now();
    const response = await window.electronAPI.ping();
    const responseTime = performance.now() - startTime;
    
    if (responseTime <= this.UI_RESPONSE_TARGET) {
      console.log(`✅ UI応答性: ${responseTime.toFixed(2)}ms (目標達成)`);
    } else {
      console.warn(`⚠️ UI応答性: ${responseTime.toFixed(2)}ms (目標: ${this.UI_RESPONSE_TARGET}ms以内)`);
    }
    
    return { response, responseTime };
  }
}
```

**学習ポイント**:
- `performance.now()` で正確な時間測定
- 目標値（100ms）と比較して警告表示
- 応答性の継続的監視

### セキュリティ検証パターン

```javascript
// security-validator.js - セキュリティ設定検証
class SecurityValidator {
  static validateWebPreferences(webPreferences) {
    const issues = [];
    
    if (webPreferences.nodeIntegration === true) {
      issues.push({
        level: 'critical',
        message: 'nodeIntegration must be false for security',
        setting: 'nodeIntegration'
      });
    }
    
    if (webPreferences.contextIsolation === false) {
      issues.push({
        level: 'critical', 
        message: 'contextIsolation must be true for security',
        setting: 'contextIsolation'
      });
    }
    
    return issues;
  }
  
  static getSecureWebPreferences() {
    return {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false
    };
  }
}
```

**学習ポイント**:
- セキュリティ設定の自動検証
- 推奨設定の一元管理
- 開発時のセキュリティリスク早期発見

## ビルド・パッケージングパターン

### 開発版ビルド設定パターン

```json
// electron-builder.dev.json
{
  "appId": "com.multigrepreplacer.dev",
  "productName": "Multi Grep Replacer (Dev)",
  "directories": {
    "output": "dist/dev"
  },
  "mac": {
    "target": [
      {
        "target": "dir",
        "arch": ["x64", "arm64"]
      }
    ]
  },
  "compression": "store",
  "nodeGypRebuild": false
}
```

**学習ポイント**:
- 開発版は`dir`ターゲットで高速ビルド
- Intel + Apple Silicon両対応
- 圧縮なしで高速化

### package.json スクリプトパターン

```json
{
  "scripts": {
    "start": "electron .",
    "build:dev": "electron-builder --mac --config electron-builder.dev.json",
    "build:production": "electron-builder --mac --config electron-builder.prod.json",
    "lint": "eslint src/**/*.js",
    "lint:fix": "eslint src/**/*.js --fix"
  }
}
```

**学習ポイント**:
- 開発版と本番版のビルド設定を分離
- Lintチェックの自動化
- クロスプラットフォーム対応

## トラブルシューティングパターン

### よくある問題と解決方法

#### 1. アイコンが見つからないエラー
```
⨯ icon directory doesn't contain icons
```

**解決方法**:
```javascript
// build/iconsディレクトリを削除または
// electron-builder設定からicon指定を削除
{
  "mac": {
    // "icon": "build/icons/icon.icns", // この行を削除
    "target": [{"target": "dir"}]
  }
}
```

#### 2. セキュリティ警告の対処
```
contextIsolation must be true for security
```

**解決方法**:
```javascript
// main.js でセキュリティ設定を強制
const webPreferences = {
  nodeIntegration: false,      // 必須
  contextIsolation: true,      // 必須
  enableRemoteModule: false,   // 必須
  webSecurity: true           // 推奨
};
```

#### 3. IPC通信エラーの対処
```
Cannot read property 'invoke' of undefined
```

**解決方法**:
```javascript
// preload.js で適切にAPI公開
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping')
});

// renderer側で存在確認
if (window.electronAPI) {
  const response = await window.electronAPI.ping();
}
```

## 成功指標・KPI

### Phase 1完了時の達成指標
- ✅ **UI応答性**: 100ms以内達成
- ✅ **セキュリティ**: 警告0件
- ✅ **ビルド成功**: .app作成100%成功
- ✅ **クロスプラットフォーム**: Intel + ARM64対応

### 継続監視項目
- アプリ起動時間: 2秒以内
- メモリ使用量: 200MB以下
- IPC通信遅延: 50ms以下
- セキュリティ検証: 100%合格

---

このパターン集により、後続のTaskでも一貫したElectronベストプラクティスを適用し、Python版の課題を根本的に解決できます。