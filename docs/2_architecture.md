# 2_architecture.md（システム設計書）

## ⚙️ 2.1 技術スタックの決定

### 開発言語・フレームワーク
- **言語**: JavaScript (ES6+)、Node.js
- **フレームワーク**: Electron（クロスプラットフォームデスクトップアプリ）
- **UI**: HTML5 + CSS3 + Vanilla JavaScript
- **設定ファイル**: JSON形式
- **パッケージング**: Electron Builder（.app/.exe作成用）

### 選定理由とPython版からの改善
- **Electron + Node.js**: 
  - **UI応答性の大幅改善**: Python Tkinterの課題を根本解決
  - Web技術ベースでモダンなUI/UX実現
  - ホットリロード対応で開発効率向上
  - ファイル操作はNode.js標準ライブラリで高速化

- **HTML5 + CSS3**: 
  - フレキシブルなレスポンシブデザイン
  - CSSアニメーション、トランジション対応
  - ダークモード等のテーマ切り替えが容易
  - アクセシビリティ対応が容易

- **Vanilla JavaScript**: 
  - フレームワーク依存を避けて軽量化
  - メンテナンス性向上
  - Electronとの相性が良い

- **JSON設定**: 
  - 人間が読みやすい
  - JavaScript標準で簡単に扱える
  - 設定の保存・読み込みが容易
  - 外部エディタでも編集可能

## 🏗️ 2.2 アーキテクチャ設計

### システム全体構成（Electronアーキテクチャ）
```
┌─────────────────────────────────────────────────────────────────────┐
│                    Multi Grep Replacer (Electron)                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐  │
│  │   Main Process      │    │         Renderer Process            │  │
│  │   (Node.js)         │    │           (Web Browser)             │  │
│  │                     │    │                                     │  │
│  │ main.js             │◄──►│ index.html                          │  │
│  │ - Window Management │    │ - User Interface                    │  │
│  │ - Menu Management   │    │ - Event Handling                    │  │
│  │ - App Lifecycle     │    │ - Real-time Preview                 │  │
│  │                     │    │                                     │  │
│  │ file-operations.js  │    │ app.js                              │  │
│  │ - File System API   │    │ - Application Logic                 │  │
│  │ - Replacement Logic │    │ - UI Controller                     │  │
│  │ - Progress Tracking │    │ - Config Management                 │  │
│  └─────────────────────┘    └─────────────────────────────────────┘  │
│           │                                     │                    │
│           │              IPC Communication      │                    │
│           │◄────────────────────────────────────┤                    │
│           │                                     │                    │
│  ┌─────────────────────┐    ┌─────────────────────────────────────┐  │
│  │ File System Layer   │    │        Configuration Layer          │  │
│  │                     │    │                                     │  │
│  │ - Directory Search  │    │ config-manager.js                   │  │
│  │ - File Processing   │    │ - JSON Config Handler               │  │
│  │ - Permission Check  │    │ - Settings Validation               │  │
│  │ - Error Handling    │    │ - Default Values                    │  │
│  └─────────────────────┘    └─────────────────────────────────────┘  │
│                                       │                              │
│                          ┌─────────────────────────────────────────┐ │
│                          │         Persistent Storage              │ │
│                          │                                         │ │
│                          │ - config/default.json                   │ │
│                          │ - config/samples/                       │ │
│                          │ - debug/logs/                           │ │
│                          │ - user preferences                      │ │
│                          └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

### プロジェクト構造詳細
```
multi-grep-replacer/
├── docs/                               # プロジェクトドキュメント
│   ├── 1_requirements.md               # 要件定義書
│   ├── 2_architecture.md               # システム設計書（このファイル）
│   ├── 3_tasks.md                      # 開発タスク一覧
│   ├── user_guide.md                   # ユーザーガイド
│   └── api_reference.md                # API リファレンス
├── src/                                # アプリケーションソースコード
│   ├── main/                           # Electronメインプロセス
│   │   ├── main.js                     # アプリケーションエントリーポイント
│   │   ├── menu.js                     # アプリケーションメニュー管理
│   │   ├── window-manager.js           # ウィンドウ管理
│   │   ├── file-operations.js          # ファイル操作API
│   │   ├── replacement-engine.js       # 置換処理エンジン
│   │   └── ipc-handlers.js             # IPC通信ハンドラー
│   ├── renderer/                       # レンダラープロセス（UI）
│   │   ├── index.html                  # メインUIレイアウト
│   │   ├── css/                        # スタイルシート
│   │   │   ├── main.css                # メインスタイル
│   │   │   ├── components.css          # UIコンポーネントスタイル
│   │   │   ├── themes.css              # テーマ（ライト/ダークモード）
│   │   │   └── animations.css          # アニメーション・トランジション
│   │   ├── js/                         # JavaScriptモジュール
│   │   │   ├── app.js                  # アプリケーション初期化
│   │   │   ├── ui-controller.js        # UI制御・イベントハンドリング
│   │   │   ├── config-manager.js       # 設定管理
│   │   │   ├── replacement-ui.js       # 置換ルール管理UI
│   │   │   ├── file-selector.js        # ファイル・フォルダ選択
│   │   │   ├── progress-display.js     # 進捗表示・結果表示
│   │   │   └── utils.js                # 共通ユーティリティ
│   │   └── assets/                     # 静的アセット
│   │       ├── icons/                  # アプリケーションアイコン
│   │       │   ├── icon.icns           # macOS用アイコン
│   │       │   ├── icon.ico            # Windows用アイコン
│   │       │   └── icon.png            # 共通アイコン
│   │       ├── sounds/                 # 効果音
│   │       └── fonts/                  # カスタムフォント
│   └── preload/                        # Preloadスクリプト
│       └── preload.js                  # セキュアなAPI公開
├── tests/                              # テストスイート
│   ├── unit/                           # ユニットテスト
│   │   ├── test-file-operations.js     # ファイル操作テスト
│   │   ├── test-replacement-engine.js  # 置換エンジンテスト
│   │   └── test-config-manager.js      # 設定管理テスト
│   ├── integration/                    # 統合テスト
│   │   └── test-e2e.js                 # End-to-Endテスト
│   ├── test_files/                     # テスト用サンプルファイル
│   │   ├── sample.html                 # HTMLテストファイル
│   │   ├── sample.css                  # CSSテストファイル
│   │   ├── sample.js                   # JavaScriptテストファイル
│   │   └── sample.md                   # Markdownテストファイル
│   └── fixtures/                       # テスト用設定ファイル
├── config/                             # 設定ファイルディレクトリ
│   ├── default.json                    # デフォルト設定
│   └── samples/                        # サンプル設定ファイル
│       ├── web-development.json        # Web開発用設定
│       ├── css-modernization.json      # CSS モダン化用設定
│       ├── variable-rename.json        # 変数名変更用設定
│       └── framework-migration.json    # フレームワーク移行用設定
├── build/                              # ビルド設定・リソース
│   ├── icons/                          # 各OS用アイコンファイル
│   ├── build-config.js                 # Electron Builderの設定
│   ├── notarize.js                     # macOS公証設定（将来用）
│   └── installer/                      # インストーラー設定
├── dist/                               # ビルド成果物（.gitignoreで除外）
│   ├── mac/                            # macOS用アプリケーション
│   │   └── Multi Grep Replacer.app     # macOS アプリバンドル
│   ├── win/                            # Windows用アプリケーション
│   │   └── Multi Grep Replacer.exe     # Windows実行ファイル
│   └── linux/                          # Linux用アプリケーション（将来）
├── debug/                              # デバッグ・ログディレクトリ
│   ├── logs/                           # アプリケーションログ
│   └── crash-reports/                  # クラッシュレポート
├── scripts/                            # ビルド・開発用スクリプト
│   ├── dev.js                          # 開発サーバー起動
│   ├── build-mac.js                    # macOS用ビルドスクリプト
│   ├── build-win.js                    # Windows用ビルドスクリプト
│   └── test.js                         # テスト実行スクリプト
├── package.json                        # npm設定・依存関係・スクリプト
├── package-lock.json                   # 依存関係バージョンロック
├── electron-builder.json               # Electron Builder設定
├── .gitignore                          # Git除外設定
├── .eslintrc.js                        # ESLint設定
├── LICENSE                             # ライセンスファイル
└── README.md                           # プロジェクト概要
```

## 📝 2.3 コンポーネント設計

### メインプロセス（Node.js）

#### main.js - アプリケーションエントリーポイント
```javascript
class MultiGrepReplacerApp {
    constructor() {
        this.mainWindow = null;
        this.config = null;
    }
    
    // アプリケーション初期化
    initialize() {}
    
    // メインウィンドウ作成
    createMainWindow() {}
    
    // アプリケーション終了処理
    cleanup() {}
}
```

#### file-operations.js - ファイル操作API
```javascript
class FileOperations {
    // ディレクトリ再帰検索
    static async findFiles(directory, extensions, excludePatterns) {}
    
    // ファイル内容読み込み
    static async readFileContent(filePath) {}
    
    // ファイル内容書き込み
    static async writeFileContent(filePath, content) {}
    
    // ファイル権限チェック
    static async checkFilePermissions(filePath) {}
}
```

#### replacement-engine.js - 置換処理エンジン
```javascript
class ReplacementEngine {
    constructor(rules, options) {
        this.rules = rules;
        this.options = options;
    }
    
    // 単一ファイル処理
    async processFile(filePath) {}
    
    // 複数ファイル一括処理
    async processBatch(filePaths, progressCallback) {}
    
    // 置換プレビュー生成
    async generatePreview(filePaths) {}
}
```

### レンダラープロセス（ブラウザ）

#### ui-controller.js - UI制御
```javascript
class UIController {
    constructor() {
        this.currentConfig = {};
        this.isProcessing = false;
    }
    
    // UI初期化
    initialize() {}
    
    // 置換ルール管理
    addReplacementRule() {}
    removeReplacementRule(ruleId) {}
    updateReplacementRule(ruleId, data) {}
    
    // フォルダ選択処理
    handleFolderSelection() {}
    
    // 実行処理
    executeReplacement() {}
}
```

#### config-manager.js - 設定管理
```javascript
class ConfigManager {
    // 設定読み込み
    static async loadConfig(filePath) {}
    
    // 設定保存
    static async saveConfig(config, filePath) {}
    
    // 設定検証
    static validateConfig(config) {}
    
    // デフォルト設定取得
    static getDefaultConfig() {}
}
```

#### progress-display.js - 進捗表示
```javascript
class ProgressDisplay {
    constructor(container) {
        this.container = container;
        this.progressBar = null;
        this.statusText = null;
    }
    
    // 進捗表示開始
    startProgress(totalFiles) {}
    
    // 進捗更新
    updateProgress(current, total, currentFile) {}
    
    // 完了表示
    showComplete(results) {}
    
    // エラー表示
    showError(error) {}
}
```

## 📝 3. プロダクト名・命名規則の決定

### 3.1 プロダクト名
```markdown
# 正式名称
Multi Grep Replacer (Electron Edition)

# 略称・コマンド名
mgr-electron

# ファイル名での表記
multi-grep-replacer（ハイフン区切り、リポジトリ名等）
MultiGrepReplacer（キャメルケース、クラス名等）
multiGrepReplacer（キャメルケース、関数名・変数名等）
```

### 3.2 用語統一

#### UI表示用語（英語）
- **Replacement Rules**: 置換ルール
- **Target Folder**: 対象フォルダ
- **File Extensions**: ファイル拡張子
- **Execute Replacement**: 置換を実行
- **Load Config**: 設定を読み込み
- **Save Config**: 設定を保存
- **Browse**: 参照
- **Templates**: テンプレート
- **Preview**: プレビュー

#### 内部用語（コード内）
- **config**: 設定ファイル・設定情報
- **rule/replacement**: 個別の置換ルール
- **pattern**: 検索パターン
- **target**: 置換対象文字列
- **replacement**: 置換後文字列
- **extension**: ファイル拡張子
- **exclude**: 除外パターン
- **progress**: 進捗情報
- **result**: 実行結果

#### JavaScript命名規則
```javascript
// クラス名: PascalCase
class MultiGrepReplacer {}
class FileOperations {}
class ConfigManager {}

// 関数・変数名: camelCase
function findFiles() {}
function executeReplacements() {}
const replacementRules = [];
const targetFolder = "";

// 定数: UPPER_SNAKE_CASE
const DEFAULT_CONFIG_PATH = "config/default.json";
const MAX_FILE_SIZE = 104857600;  // 100MB
const SUPPORTED_EXTENSIONS = ['.html', '.css', '.js'];

// ファイル名: kebab-case
file-operations.js
config-manager.js
ui-controller.js
```

## 🗂️ 4. 設定ファイル設計

### 4.1 設定ファイル構造（JSON Schema準拠）
```json
{
  "$schema": "https://json-schema.org/draft/2019-09/schema",
  "app_info": {
    "name": "Multi Grep Replacer",
    "version": "1.0.0",
    "created_at": "2025-06-10T19:00:00Z",
    "description": "Multi Grep Replacer Configuration",
    "author": "User",
    "tags": ["web-development", "css-refactoring"]
  },
  "replacements": [
    {
      "id": "rule_001",
      "from": "is-plain",
      "to": "is-solid",
      "enabled": true,
      "description": "CSSクラス名の更新",
      "case_sensitive": true,
      "whole_word": false
    },
    {
      "id": "rule_002",
      "from": "is-ghost", 
      "to": "is-ghosted",
      "enabled": true,
      "description": "CSSクラス名の語尾修正",
      "case_sensitive": true,
      "whole_word": false
    }
  ],
  "target_settings": {
    "file_extensions": [".css", ".html", ".js", ".php"],
    "exclude_patterns": [
      "node_modules/**",
      ".git/**", 
      "dist/**", 
      "build/**",
      "*.min.js",
      "*.min.css"
    ],
    "include_subdirectories": true,
    "max_file_size": 104857600,
    "encoding": "utf-8"
  },
  "replacement_settings": {
    "case_sensitive": true,
    "use_regex": false,
    "backup_enabled": false,
    "preserve_file_permissions": true,
    "dry_run": false
  },
  "ui_settings": {
    "theme": "auto",  // "light", "dark", "auto"
    "window": {
      "width": 800,
      "height": 700,
      "resizable": true,
      "center": true
    },
    "remember_last_folder": true,
    "auto_save_config": false,
    "show_file_count_preview": true,
    "confirm_before_execution": true
  },
  "advanced_settings": {
    "max_concurrent_files": 10,
    "progress_update_interval": 100,
    "log_level": "info",  // "debug", "info", "warn", "error"
    "enable_crash_reporting": false
  }
}
```

### 4.2 設定テンプレート例

#### Web開発用設定（web-development.json）
```json
{
  "app_info": {
    "name": "Web Development Template",
    "description": "Common web development replacements"
  },
  "replacements": [
    {
      "from": "className=\"old-btn\"",
      "to": "className=\"btn btn-primary\"",
      "description": "Bootstrap button class update"
    },
    {
      "from": "var ",
      "to": "const ",
      "description": "Modernize JavaScript variables"
    },
    {
      "from": "http://",
      "to": "https://",
      "description": "Force HTTPS URLs"
    }
  ],
  "target_settings": {
    "file_extensions": [".html", ".jsx", ".tsx", ".css", ".scss", ".js", ".ts"]
  }
}
```

#### CSS モダン化用設定（css-modernization.json）
```json
{
  "app_info": {
    "name": "CSS Modernization Template",
    "description": "Modernize CSS properties and values"
  },
  "replacements": [
    {
      "from": "display: -webkit-box;",
      "to": "display: flex;",
      "description": "Replace old flexbox syntax"
    },
    {
      "from": "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);",
      "to": "position: absolute; inset: 0; margin: auto;",
      "description": "Modern centering technique"
    }
  ],
  "target_settings": {
    "file_extensions": [".css", ".scss", ".sass", ".less"]
  }
}
```

## 🔧 5. 技術仕様詳細

### 5.1 依存関係
```json
{
  "dependencies": {
    "electron": "^25.0.0",
    "electron-store": "^8.1.0",
    "electron-log": "^4.4.8"
  },
  "devDependencies": {
    "electron-builder": "^24.0.0",
    "jest": "^29.0.0",
    "spectron": "^19.0.0",
    "eslint": "^8.0.0",
    "prettier": "^2.8.0"
  }
}
```

### 5.2 パフォーマンス設計

#### 非同期処理アーキテクチャ
```javascript
// Worker Threadsによる非同期ファイル処理
class AsyncFileProcessor {
    constructor(maxConcurrency = 10) {
        this.maxConcurrency = maxConcurrency;
        this.queue = [];
        this.activeJobs = 0;
    }
    
    async processFiles(files, progressCallback) {
        return new Promise((resolve, reject) => {
            const results = [];
            let completed = 0;
            
            const processNext = () => {
                if (this.queue.length === 0 && this.activeJobs === 0) {
                    resolve(results);
                    return;
                }
                
                if (this.queue.length > 0 && this.activeJobs < this.maxConcurrency) {
                    const file = this.queue.shift();
                    this.activeJobs++;
                    
                    this.processFile(file)
                        .then(result => {
                            results.push(result);
                            completed++;
                            this.activeJobs--;
                            progressCallback(completed, files.length, file);
                            processNext();
                        })
                        .catch(reject);
                }
            };
            
            this.queue = [...files];
            processNext();
        });
    }
}
```

#### メモリ効率化
```javascript
// Stream処理による大容量ファイル対応
const fs = require('fs');
const { pipeline } = require('stream');

class StreamingReplacer {
    static async replaceInLargeFile(filePath, replacements) {
        return new Promise((resolve, reject) => {
            const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
            const writeStream = fs.createWriteStream(`${filePath}.tmp`);
            
            let buffer = '';
            const chunkSize = 1024 * 1024; // 1MB chunks
            
            readStream.on('data', (chunk) => {
                buffer += chunk;
                
                // Process complete lines to avoid splitting words
                const lines = buffer.split('\n');
                buffer = lines.pop(); // Keep incomplete line
                
                const processedLines = lines.map(line => {
                    return this.applyReplacements(line, replacements);
                });
                
                writeStream.write(processedLines.join('\n') + '\n');
            });
            
            readStream.on('end', () => {
                if (buffer) {
                    const processedBuffer = this.applyReplacements(buffer, replacements);
                    writeStream.write(processedBuffer);
                }
                writeStream.end();
                resolve();
            });
        });
    }
}
```

### 5.3 セキュリティ設計

#### Context Isolation & Preload Script
```javascript
// preload.js - セキュアなAPI公開
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // ファイル操作
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    readFile: (path) => ipcRenderer.invoke('read-file', path),
    writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
    
    // 置換処理
    executeReplacement: (config) => ipcRenderer.invoke('execute-replacement', config),
    
    // 進捗通知
    onProgress: (callback) => ipcRenderer.on('replacement-progress', callback),
    
    // 設定管理
    loadConfig: (path) => ipcRenderer.invoke('load-config', path),
    saveConfig: