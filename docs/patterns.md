# patterns.md - Electron開発パターン・ベストプラクティス

## Electron基盤構築パターン

### セキュアな初期設定（必須）
```javascript
// main.js - セキュリティベストプラクティス
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,           // セキュリティ強化（必須）
    contextIsolation: true,           // Context Isolation有効（必須）
    enableRemoteModule: false,        // Remote Module無効（必須）
    webSecurity: true,                // Web Security有効
    allowRunningInsecureContent: false, // 安全でないコンテンツ禁止
    experimentalFeatures: false,      // 実験的機能無効
    preload: path.join(__dirname, '../preload/preload.js') // preload必須
  }
});
```

### IPC通信基本パターン（セキュア）
```javascript
// preload.js - セキュアAPI公開
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 基本通信
  ping: () => ipcRenderer.invoke('ping'),
  
  // 設定管理
  loadConfig: (filePath) => ipcRenderer.invoke('load-config', filePath),
  saveConfig: (config, filePath) => ipcRenderer.invoke('save-config', config, filePath),
  
  // ファイル操作
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  findFiles: (dir, ext, exclude) => ipcRenderer.invoke('find-files', dir, ext, exclude)
});

// main.js - IPCハンドラー登録
ipcMain.handle('ping', async () => {
  return { status: 'success', timestamp: Date.now() };
});

ipcMain.handle('load-config', async (event, filePath) => {
  try {
    const config = await ConfigManager.loadConfig(filePath);
    return { success: true, config };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
```

## 設定管理パターン

### JSON設定ファイル管理
```javascript
// config-manager.js - 設定管理クラス
class ConfigManager {
  static async loadConfig(filePath) {
    const startTime = performance.now();
    
    try {
      // ファイル存在確認
      await fs.access(filePath);
      
      // JSON読み込み・パース
      const configContent = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(configContent);
      
      // 設定検証
      const validationResult = this.validateConfig(config);
      
      // パフォーマンス・ログ記録
      const loadTime = performance.now() - startTime;
      this.logOperation('loadConfig', { filePath }, { 
        success: true, 
        loadTime: `${loadTime.toFixed(2)}ms` 
      });
      
      return config;
      
    } catch (error) {
      // エラーログ記録
      this.logOperation('loadConfig', { filePath }, { 
        success: false, 
        error: error.message 
      });
      throw error;
    }
  }
  
  // 設定検証パターン
  static validateConfig(config) {
    const required = ['app_info', 'replacements', 'target_settings'];
    const missing = required.filter(key => !config[key]);
    
    if (missing.length > 0) {
      throw new Error(`必須設定が不足: ${missing.join(', ')}`);
    }
    
    return true;
  }
}
```

### デフォルト設定パターン
```javascript
// config/default.json - 標準設定構造
{
  "app_info": {
    "name": "Multi Grep Replacer",
    "version": "1.0.0",
    "description": "Multi Grep Replacer Configuration"
  },
  "replacements": [
    {
      "id": "rule_001",
      "from": "検索文字列",
      "to": "置換文字列",
      "enabled": true,
      "description": "置換ルールの説明"
    }
  ],
  "target_settings": {
    "file_extensions": [".html", ".css", ".js"],
    "exclude_patterns": ["node_modules/**", ".git/**"],
    "include_subdirectories": true,
    "max_file_size": 104857600
  }
}
```

## ファイル操作パターン

### セキュアなファイル操作
```javascript
// file-operations.js - 安全なファイル処理
class FileOperations {
  static MAX_FILE_SIZE = 104857600; // 100MB制限
  
  static async readFileContent(filePath) {
    // 権限チェック
    await this.checkFilePermissions(filePath, 'read');
    
    // サイズチェック
    const stats = await fs.stat(filePath);
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error('ファイルサイズ上限超過');
    }
    
    // UTF-8読み込み
    return await fs.readFile(filePath, 'utf8');
  }
  
  static async checkFilePermissions(filePath, mode) {
    const accessMode = mode === 'write' ? fs.constants.W_OK : fs.constants.R_OK;
    
    try {
      await fs.access(filePath, accessMode);
      return true;
    } catch (error) {
      if (error.code === 'EACCES') {
        throw new Error(`${mode}権限がありません: ${filePath}`);
      }
      throw error;
    }
  }
}
```

### 再帰的ディレクトリ検索
```javascript
// 効率的なファイル検索パターン
static async findFiles(directory, extensions = [], excludePatterns = []) {
  const files = [];
  const allExcludePatterns = [...this.DEFAULT_EXCLUDE_PATTERNS, ...excludePatterns];
  
  await this.scanDirectory(directory, files, extensions, allExcludePatterns);
  return files;
}

static async scanDirectory(directory, fileList, extensions, excludePatterns) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      // 除外パターンチェック
      if (this.shouldExclude(fullPath, excludePatterns)) continue;
      
      if (entry.isDirectory()) {
        // 再帰的検索
        await this.scanDirectory(fullPath, fileList, extensions, excludePatterns);
      } else if (entry.isFile()) {
        // 拡張子・サイズチェック
        if (this.matchesExtension(entry.name, extensions)) {
          const stats = await fs.stat(fullPath);
          if (stats.size <= this.MAX_FILE_SIZE) {
            fileList.push({
              path: fullPath,
              name: entry.name,
              size: stats.size,
              modified: stats.mtime
            });
          }
        }
      }
    }
  } catch (error) {
    // アクセス権限エラーはスキップ（ログ出力）
    console.warn(`ディレクトリアクセス不可: ${directory}`);
  }
}
```

## UI応答性パターン

### パフォーマンス監視実装
```javascript
// performance-monitor.js - UI応答性監視
class PerformanceMonitor {
  static UI_RESPONSE_TARGET = 100; // ms
  
  static monitorButtonResponse(buttonElement, actionName) {
    buttonElement.addEventListener('click', (event) => {
      const startTime = performance.now();
      
      // 次のフレームで測定
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        
        if (responseTime > this.UI_RESPONSE_TARGET) {
          console.warn(`⚠️ UI応答性低下: ${actionName} (${responseTime.toFixed(2)}ms)`);
          this.showPerformanceWarning(actionName, responseTime);
        }
      });
    });
  }
  
  // 非同期処理での応答性確保
  static async handleAsyncOperation(operation, progressCallback) {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      
      const responseTime = performance.now() - startTime;
      this.reportPerformance(operation.name, responseTime);
      
      return result;
    } catch (error) {
      this.reportError(operation.name, error);
      throw error;
    }
  }
}
```

### 応答性確保の非同期パターン
```javascript
// 悪い例：UIフリーズ
function processFilesSync(files) {
  files.forEach(file => {
    processFileSync(file); // UIブロック
  });
}

// 良い例：非同期処理
async function processFilesAsync(files) {
  for (const file of files) {
    await processFileAsync(file);
    
    // UI更新の機会を与える
    await new Promise(resolve => setTimeout(resolve, 0));
  }
}
```

## ログ・デバッグパターン

### Vibe Logger統合パターン
```javascript
// 構造化ログ出力
static logOperation(operation, data, result) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    component: 'ConfigManager',
    operation,
    data,
    result,
    memory: process.memoryUsage(),
    performance: {
      startTime: this.startTime,
      duration: performance.now() - this.startTime
    }
  };
  
  console.log('📋 Config:', JSON.stringify(logEntry, null, 2));
}

// エラーログパターン
static logError(operation, error, context = {}) {
  const errorEntry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    component: this.constructor.name,
    operation,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code
    },
    context
  };
  
  console.error('❌ Error:', JSON.stringify(errorEntry, null, 2));
}
```

## electron-builder設定パターン

### package.json設定
```json
{
  "main": "src/main/main.js",
  "scripts": {
    "start": "electron .",
    "build:dev": "electron-builder --dir",
    "build:production": "electron-builder"
  },
  "build": {
    "appId": "com.example.multi-grep-replacer",
    "productName": "Multi Grep Replacer",
    "directories": {
      "output": "dist"
    },
    "files": [
      "src/**/*",
      "config/**/*",
      "package.json"
    ],
    "mac": {
      "category": "public.app-category.developer-tools"
    }
  }
}
```

### 依存関係管理パターン
```json
{
  "dependencies": {
    // 本番環境で必要なもののみ
  },
  "devDependencies": {
    "electron": "^25.0.0",           // 開発依存に配置
    "electron-builder": "^24.0.0"   // ビルドツール
  }
}
```

## エラーハンドリングパターン

### 包括的エラー処理
```javascript
// API レスポンス統一パターン
ipcMain.handle('operation-name', async (event, ...args) => {
  try {
    const result = await performOperation(...args);
    return { success: true, data: result };
  } catch (error) {
    console.error('Operation failed:', error);
    return { 
      success: false, 
      error: error.message,
      code: error.code 
    };
  }
});

// フレンドリーエラーメッセージ
static getErrorMessage(error) {
  const errorMap = {
    'ENOENT': 'ファイルが見つかりません',
    'EACCES': 'ファイルアクセス権限がありません',
    'EMFILE': 'ファイルを開きすぎています'
  };
  
  return errorMap[error.code] || error.message;
}
```

## ベストプラクティス要約

### セキュリティ
1. ✅ nodeIntegration: false（必須）
2. ✅ contextIsolation: true（必須）
3. ✅ preload.js経由でのAPI公開
4. ✅ 入力値検証・サニタイゼーション

### パフォーマンス
1. ✅ UI応答性100ms以内監視
2. ✅ 非同期処理でUIブロック防止
3. ✅ ファイルサイズ制限・Stream処理
4. ✅ メモリ使用量監視

### 開発効率
1. ✅ 構造化ログによる問題特定
2. ✅ エラーハンドリング統一化
3. ✅ 段階的テスト・即座確認
4. ✅ パターン記録・再利用

### 品質保証
1. ✅ 包括的エラーハンドリング
2. ✅ ユーザーフレンドリーメッセージ
3. ✅ .appファイル動作確認
4. ✅ 継続的ログ記録・改善

これらのパターンにより、セキュアで高性能なElectronアプリケーションを効率的に開発できます。