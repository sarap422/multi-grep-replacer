# Electron開発パターン・ベストプラクティス

## 🔒 セキュリティベストプラクティス

### 必須セキュリティ設定
```javascript
// main.js - セキュリティベストプラクティス
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,           // 必須：セキュリティ強化
    contextIsolation: true,           // 必須：Context Isolation有効
    enableRemoteModule: false,        // 必須：Remote Module無効化
    webSecurity: true,                // 必須：Web Security有効
    allowRunningInsecureContent: false, // 必須：不正コンテンツ禁止
    experimentalFeatures: false,      // 必須：実験的機能無効
    preload: path.join(__dirname, '../preload/preload.js') // 必須
  }
});
```

### セキュアなIPC通信パターン
```javascript
// preload.js - セキュアAPI公開
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 基本通信
  ping: () => ipcRenderer.invoke('ping'),
  
  // 非同期操作
  getAppInfo: async () => {
    try {
      return await ipcRenderer.invoke('get-app-info');
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
});
```

## 📋 プロジェクト構造パターン

### 推奨ディレクトリ構成
```
multi-grep-replacer/
├── src/
│   ├── main/          # メインプロセス（Node.js）
│   ├── renderer/      # レンダラープロセス（Browser）
│   └── preload/       # Preloadスクリプト
├── config/            # アプリ設定
├── tests/             # テストスイート
├── build/             # ビルド設定
└── dist/              # ビルド成果物
```

### package.json設定パターン
```json
{
  "main": "src/main/main.js",
  "dependencies": {
    "electron-store": "^8.1.0",
    "electron-log": "^4.4.8"
  },
  "devDependencies": {
    "electron": "^25.0.0",        // 重要：devDependenciesに配置
    "electron-builder": "^24.0.0"
  },
  "scripts": {
    "start": "electron .",
    "build:dev": "electron-builder --dir",
    "build:mac": "electron-builder --mac"
  }
}
```

## ⚡ パフォーマンス最適化パターン

### UI応答性監視
```javascript
// src/renderer/js/performance-monitor.js
class PerformanceMonitor {
  static UI_RESPONSE_TARGET = 100; // ms
  
  static monitorButtonResponse(element, actionName) {
    element.addEventListener('click', () => {
      const startTime = performance.now();
      
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        
        if (responseTime > this.UI_RESPONSE_TARGET) {
          console.warn(`⚠️ UI応答性低下: ${actionName} (${responseTime}ms)`);
        }
      });
    });
  }
}
```

### 非同期処理パターン
```javascript
// UIフリーズ防止の非同期処理
async function handleLongRunningTask() {
  // 即座にUI反応表示
  showLoadingState();
  
  // 重い処理は次のフレームで実行
  setTimeout(async () => {
    try {
      await heavyProcessing();
    } finally {
      hideLoadingState();
    }
  }, 0);
}
```

## 🧪 テスト・デバッグパターン

### 基本起動テスト
```bash
# 時間制限付きElectronテスト
npm start &
APP_PID=$!
sleep 5
kill $APP_PID 2>/dev/null
echo "App test completed"
```

### ESLint設定パターン
```javascript
// .eslintrc.js - プロセス別ルール設定
module.exports = {
  overrides: [
    {
      files: ['src/main/**/*.js'],
      rules: { 'no-restricted-globals': 'off' }  // Node.js API許可
    },
    {
      files: ['src/preload/**/*.js'],
      rules: { 'no-restricted-globals': 'off' }  // require/process許可
    },
    {
      files: ['src/renderer/**/*.js'],
      rules: { 
        'no-restricted-globals': ['error', 'require', '__dirname', '__filename']
      }
    }
  ]
};
```

## 🏗️ ビルド・配布パターン

### electron-builder設定
```json
{
  "build": {
    "appId": "com.multigrepreplacer.app",
    "directories": { "output": "dist" },
    "files": ["src/**/*", "config/**/*", "package.json"],
    "mac": {
      "category": "public.app-category.developer-tools",
      "target": "dmg"
    }
  }
}
```

### 段階的ビルド戦略
1. **開発ビルド**: `npm run build:dev` (.appファイルのみ)
2. **本番ビルド**: `npm run build:mac` (.dmgインストーラー)
3. **クロスプラットフォーム**: `npm run build:win` (Windows用)

## 🐛 よくある問題と解決方法

### 問題: IPC通信が動作しない
```javascript
// 原因: contextBridge設定ミス
// 解決: preload.jsでのAPI公開確認
if (typeof window.electronAPI === 'undefined') {
  console.error('ElectronAPI not available');
}
```

### 問題: electron-builderで "electron must be in devDependencies"
```json
// 解決: electronをdevDependenciesに移動
{
  "dependencies": {},
  "devDependencies": {
    "electron": "^25.0.0"
  }
}
```

### 問題: macOSでtimeoutコマンドなし
```bash
# 解決: sleep + kill の組み合わせ使用
command &
PID=$!
sleep 5
kill $PID
```

## 📊 成功指標パターン

### 起動時間測定
```javascript
// main.js
class App {
  constructor() {
    this.startTime = performance.now();
  }
  
  onReady() {
    const startupTime = performance.now() - this.startTime;
    console.log(`⚡ Startup time: ${startupTime.toFixed(2)}ms`);
  }
}
```

### 品質確認チェックリスト
- [ ] ESLint チェック通過（0エラー）
- [ ] 基本起動テスト成功
- [ ] IPC通信テスト成功  
- [ ] .appファイル作成・動作確認
- [ ] UI応答性100ms以内
- [ ] メモリ使用量200MB以下

## 🔄 継続的改善パターン

### ログ出力統一
```javascript
// 構造化ログパターン
const logEntry = {
  timestamp: new Date().toISOString(),
  level: 'INFO',
  message: 'Action completed',
  context: { duration: 120, memory: process.memoryUsage() }
};
console.log(JSON.stringify(logEntry));
```

このパターン集により、Electronアプリ開発での試行錯誤を削減し、品質の高いアプリケーションを効率的に開発できます。