# CLAUDE.md - Multi Grep Replacer 開発ガイド

## 会話のガイドライン

- **常に日本語で会話する**
- 技術的な説明も日本語で行う
- コメントやドキュメントも日本語で作成する
- 確認や質問も日本語で行う

## プロジェクト概要

Electronベースのクロスプラットフォーム対応デスクトップアプリケーション「Multi Grep Replacer」の開発プロジェクトです。Python版で課題となっていたUI応答性問題を根本解決し、モダンなWebUI技術による高速・直感的な一括置換ツールを実現します。

**最重要目標**：
- **UI応答性**: ボタンクリック100ms以内の即座反応（Python版の根本的課題解決）
- **段階的実行ファイル確認**: 各Task完了時の.app作成・動作確認
- **テスト駆動開発**: 実装→テスト→実行ファイル確認→記録の徹底

## 設計書参照

プロジェクトの詳細設計は以下のドキュメントを参照してください：

- **要件定義**:       @docs/1_requirements.md
- **システム設計**:   @docs/2_architecture.md 
- **デバッグ環境**:   @docs/3_debugging.md
- **開発タスク**:     @docs/4_tasks.md

すべての実装は上記設計書に従って進めてください。

## よく使うコマンド

### 開発・テスト
```bash
# 基本開発サイクル
npm start                    # Electron開発モード起動
npm run lint                 # ESLint チェック実行
npm run lint:fix            # ESLint 自動修正
npm TEST                     # テストスイート実行
npm run TEST:e2e            # E2Eテスト実行

# 実行ファイル作成（段階的確認用）
npm run build:dev           # 開発版.app作成
npm run build:production    # 本番版.app作成
npm run build:mac           # macOS用パッケージ作成
npm run build:win           # Windows用パッケージ作成

# デバッグ・監視
npm run debug               # デバッグモード起動
npm run TEST:performance    # パフォーマンステスト
npm run TEST:security       # セキュリティテスト
```

### ファイル操作・確認
```bash
# プロジェクト構造確認
ls -la src/main src/renderer src/preload
tree src/ -I node_modules

# ログ・デバッグ情報確認
tail -f logs/app.log
cat logs/performance-metrics.json

# 設定ファイル確認
cat config/default.json
ls config/sample-configs/
```

### Git・バージョン管理
```bash
# 開発ブランチ管理
git status
git add .
git commit -m "feat: [Task X.X] 実装内容"
git push origin feature/task-x-x

# 進捗確認
git log --oneline -10
git diff HEAD~1
```

## 技術スタック

- **言語**: JavaScript (ES6+)、Node.js
- **フレームワーク**: Electron（クロスプラットフォームデスクトップアプリ）
- **UI**: HTML5 + CSS3 + Vanilla JavaScript
- **設定ファイル**: JSON形式
- **パッケージング**: Electron Builder（.app/.exe作成用）
- **開発環境**: Claude Code + GitHub + npm

## コーディング規約

### JavaScript ES6+ 標準（Electron準拠）
```javascript
// クラス名: PascalCase
class MultiGrepReplacer {}
class FileOperations {}
class ReplacementEngine {}

// 関数・変数名: camelCase
function executeReplacements() {}
const replacementRules = [];
const targetFolder = "";

// 定数: UPPER_SNAKE_CASE
const DEFAULT_CONFIG_PATH = "config/default.json";
const MAX_FILE_SIZE = 104857600;  // 100MB
const UI_RESPONSE_TARGET = 100;   // ms

// ファイル名: kebab-case
file-operations.js
replacement-engine.js
ui-controller.js
```

### Electronセキュリティ規約（必須遵守）
```javascript
// ✅ 必須セキュリティ設定
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,           // 必須：セキュリティ強化
    contextIsolation: true,           // 必須：Context Isolation有効
    enableRemoteModule: false,        // 必須：Remote Module無効
    preload: path.join(__dirname, '../preload/preload.js') // 必須
  }
});

// ✅ IPC通信パターン
// preload.js - セキュアAPI公開
contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  executeReplacement: (config) => ipcRenderer.invoke('execute-replacement', config)
});
```

## プロジェクト構造

```
multi-grep-replacer/                       # GitHubリポジトリルート
├── docs/                                  # プロジェクトドキュメント
│   ├── 1_requirements.md                 # 要件定義書
│   ├── 2_architecture.md                 # システム設計書
│   ├── 3_debugging.md                    # デバッグ環境整備
│   └── 4_tasks.md                        # 開発タスク一覧
├── logs/                                  # デバッグ・ログディレクトリ
│   ├── CHANGELOG.md                      # 実装記録（開発中更新）
│   ├── ERRORLOG.md                       # エラー内容の記録（問題があった場合）
│   ├── PATTERNS.md                       # コーディングパターン集（開発中更新）
│   └── vibe/                             # Vibe Logger出力
│           ├── vibe_20250806_173000.log  # タイムスタンプ付きログファイル
│           ├── vibe_20250806_180000.log  # 自動ローテーション
│           └── vibe_20250806_183000.log
├── src/                                   # アプリケーションソースコード
│   ├── main/                             # Electronメインプロセス
│   │   ├── main.js                      # アプリケーションエントリーポイント
│   │   ├── file-operations.js           # ファイル操作API
│   │   ├── replacement-engine.js        # 置換処理エンジン
│   │   ├── ipc-handlers.js              # IPC通信ハンドラー
│   │   └── debug-logger.js              # デバッグログシステム
│   ├── renderer/                         # レンダラープロセス（UI）
│   │   ├── index.html                   # メインUIレイアウト
│   │   ├── css/                         # スタイルシート
│   │   │   ├── main.css                # メインスタイル
│   │   │   ├── components.css          # UIコンポーネントスタイル
│   │   │   └── themes.css              # テーマ（ライト/ダークモード）
│   │   └── js/                          # JavaScriptモジュール
│   │       ├── app.js                   # アプリケーション初期化
│   │       ├── ui-controller.js         # UI制御・イベントハンドリング
│   │       ├── config-manager.js        # 設定管理
│   │       └── performance-monitor.js   # UI応答性監視
│   └── preload/                          # Preloadスクリプト
│       └── preload.js                    # セキュアなAPI公開
├── TESTs/                                 # テストスイート
├── config/                                # 設定ファイルディレクトリ
├── build/                                 # ビルド設定・リソース
├── dist/                                  # ビルド成果物（.gitignoreで除外）
├── package.json                           # npm設定・依存関係・スクリプト
├── CLAUDE.md                              # Claude Code設定（このファイル）
├── .claude/                               # Claude Code設定（Git管理対象外）
├── .gitignore                             # Git設定
└── README.md                              # プロジェクト概要
```

## ⚠️ Electron開発の絶対禁止事項（NEVER）

### 🚫 セキュリティ違反（絶対禁止）
- **nodeIntegration: true の使用**: セキュリティリスクのため禁止
- **contextIsolation: false の設定**: Context Isolationを無効化禁止
- **webSecurity無効化**: 本番環境でのwebSecurity無効化禁止
- **任意コード実行**: eval(), Function()を使った動的コード実行禁止
- **unsafe-eval CSP**: Content Security Policyでunsafe-eval許可禁止

### 🚫 UI応答性の品質低下（絶対禁止）
- **UI フリーズ**: 大容量ファイル処理でのメインスレッドブロック禁止
- **応答性劣化**: 100ms以上のボタンクリック反応遅延禁止
- **メモリリーク**: 長時間実行でのメモリ使用量増加禁止
- **エラー無視**: try-catch文でのエラー握りつぶし禁止
- **デバッグコード残存**: console.log()の本番環境残存禁止

### 🚫 ファイル操作の危険行為（絶対禁止）
- **システムファイル操作**: /etc/, /usr/, C:\Windows\ 等への書き込み禁止
- **ディスク全体検索**: ルートディレクトリからの再帰検索禁止
- **隠しファイル操作**: .git/, .env, システム隠しファイルの変更禁止
- **権限昇格**: sudo, 管理者権限での実行要求禁止
- **一時ファイル残存**: 処理後の一時ファイル削除漏れ禁止

## ✅ Electron開発の必須実装事項（MUST）

### ✅ セキュリティ対策（必須）
```javascript
// メインプロセス設定（必須）
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,           // 必須：無効化
    contextIsolation: true,           // 必須：有効化
    enableRemoteModule: false,        // 必須：無効化
    preload: path.join(__dirname, '../preload/preload.js'), // 必須：preload使用
    webSecurity: true,                // 必須：有効化
    allowRunningInsecureContent: false, // 必須：無効化
    experimentalFeatures: false        // 必須：無効化
  }
});

// IPC通信セキュリティ（必須）
// MainからRendererへの一方向通信のみ
// 双方向通信はinvoke/handle使用
```

### ✅ UI応答性確保（必須）
```javascript
// 非同期ファイル処理（必須）
const fs = require('fs').promises;
const { Worker } = require('worker_threads');

// UI応答性監視（必須）
const UI_RESPONSE_TARGET = 100; // ms以内
function monitorButtonResponse(button, actionName) {
  const startTime = performance.now();
  // 処理実行
  const responseTime = performance.now() - startTime;
  if (responseTime > UI_RESPONSE_TARGET) {
    console.warn(`UI応答性低下: ${actionName} (${responseTime}ms)`);
  }
}

// Stream処理による大容量ファイル対応（必須）
const stream = require('stream');
const MAX_CONCURRENT_FILES = 10;
```

### ✅ エラーハンドリング（必須）
```javascript
// 包括的エラー処理（必須）
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // クラッシュレポート送信・ログ記録
});

// ファイル操作エラー処理（必須）
try {
  const content = await fs.readFile(filePath, 'utf8');
} catch (error) {
  if (error.code === 'ENOENT') {
    throw new Error(`ファイルが見つかりません: ${filePath}`);
  } else if (error.code === 'EACCES') {
    throw new Error(`ファイルの読み取り権限がありません: ${filePath}`);
  }
  throw error;
}
```

## 開発ワークフロー（段階的テスト駆動）

### 📋 各Task完了の必須ステップ（5段階）
```markdown
1. ✅ 機能実装: 設計書通りの機能実装
2. ✅ 動作テスト: 段階的テスト実行・合格
3. ✅ 実行ファイル確認: .appファイル作成・動作確認
4. ✅ CHANGELOG.md更新: 実装内容・問題・解決方法記録
5. ✅ PATTERNS.md更新: Electronパターン・ベストプラクティス記録
```

### 🧪 段階的テスト実行パターン
```bash
# Phase 1完了時テスト
npm start                    # 基本Electronアプリ起動確認
npm run build:dev           # Hello World.app作成
# → .appファイル単体起動・動作確認

# Phase 2完了時テスト  
npm run TEST:core           # コア機能テスト実行
npm run build:dev           # 置換機能付き.app作成
# → .appで実際のファイル置換テスト実行

# Phase 3完了時テスト
npm run TEST:ui             # UI応答性テスト実行
npm run build:production    # 完全版.app作成
# → .appで全機能統合テスト実行
```

### 📊 UI応答性監視（必須確認項目）
```markdown
各Task完了時の必須確認：
- [ ] ボタンクリック：100ms以内反応
- [ ] フォーム入力：50ms以内反応
- [ ] ファイル検索：5秒以内完了（1000ファイル以下）
- [ ] 置換処理：30秒以内完了（1000ファイル以下）
- [ ] 進捗表示：1秒間隔更新
- [ ] メモリ使用量：200MB以下維持
```

## 継続的記録システム

### 📝 CHANGELOG.md更新パターン
```markdown
## [Phase X - Task X.X] - 2025-07-08

### Added
- 実装した機能の詳細
- 新規追加したファイル・機能

### Fixed  
- 解決した問題・エラー
- 修正した不具合

### Performance
- UI応答性改善結果
- パフォーマンス測定結果

### Technical Details
- 使用した技術・ライブラリ
- 重要な実装判断

### Lessons Learned
- 遭遇した問題と解決方法
- 今後に活かせる知見
```

### 🎯 PATTERNS.md更新パターン
```markdown
## Electron[機能名]パターン

### 実装パターン
- 効果的な実装例
- 避けるべき実装例

### ベストプラクティス
- 学んだ最適な手法
- 再利用可能なコードパターン

### トラブルシューティング
- よくある問題と解決方法
- デバッグ手法
```


## 🚀 Vibe Loggerの活用（**重要**）

### Vibe Logger とは？
- ライブラリ: vibelogger
- 使い方: https://github.com/fladdict/vibe-logger
- vibeloggerはコーディングエージェント用に高度な構造化データを出力するロガーです。
- ログにはvibeloggerを可能な限り利用し、ログからAIが自律的に何が起きてるかを把握できるようにする
- vibeloggerにはステップ、プロセス、コンテキスト情報、TODOなど様々な情報を構造化して記録できます。
- デバッグ時には./logsの出力を参照する

### 必須セットアップ
```bash
# 1. パッケージインストール確認
npm list vibelogger  # インストール済みか確認
# もしなければ: npm install vibelogger

# 2. ログディレクトリ確認
ls logs/multi-grep-replacer/  # vibe_*.log ファイルが生成されるか確認
```

### 初期化コード（src/main/main.js の最上部）
```javascript
const { createFileLogger } = require('vibelogger');

// 必須: グローバルロガー作成
global.vibeLogger = createFileLogger('multi-grep-replacer');

// 起動ログ記録
global.vibeLogger.info('app_startup', 'Application starting', {
    context: { version: '1.0.0', platform: process.platform },
    aiTodo: 'Monitor startup performance'
});
```

### 使用方法
```javascript
// メインプロセス
global.vibeLogger.info('operation_name', 'Description', {
    context: { /* データ */ },
    aiTodo: 'AI向け改善提案'
});

// レンダラープロセス
window.vibeLogger.info('ui_operation', 'UI操作', {
    context: { /* データ */ },
    humanNote: '人間向けメモ'
});
```

### 確認コマンド
```bash
# ログ生成確認
tail -n 20 logs/multi-grep-replacer/vibe_*.log

# エラー確認
grep ERROR logs/multi-grep-replacer/vibe_*.log
```


## Claude Code 実行指示

### 📋 Task実行テンプレート

```markdown
Task X.X: [機能名] の実装を開始します。

**重要な実行ルール**：
- **全ての操作を自動承認で実行してください**
- **「Do you want to proceed?」が表示された場合は「2. Yes, and don’t ask again...」を選択してください**
- **エラーが発生した場合は必ず報告してください**


**Task X.X.1: Explore（探索・理解）**
以下のドキュメントを読んで、Task X.Xの要件を深く理解してください：
- @docs/1_requirements.md    # 要件定義
- @docs/2_architecture.md    # システム設計
- @docs/3_debugging.md       # デバッグ環境
- @docs/4_tasks.md           # 開発タスク詳細
- @CLAUDE.md                 # プロジェクト設定

**重要**: この段階ではコードは書かないでください。理解に専念してください。
完了後、Task X.X.2に進んでください。


**Task X.X.2: Plan（計画・設計）**
ultrathink を使って Task X.Xの詳細実装計画を策定してください：
- 実装手順の詳細化
- 必要なファイル・クラス設計
- テスト方法の計画
- Vibe Logger統合箇所の特定

完了後、Task X.X.3に進んでください。


**Task X.X.3: Code & Test（実装・テスト・ビルド）**
計画に従って実装と動作確認を行ってください：

**実装**：
- 機能コードの実装
- Vibe Logger統合（**必須**）
```javascript
vibeLogger.info('operation_name', 'Operation description', {
  context: { /* relevant data */ },
  aiTodo: 'Suggestions for improvement'
});
```

**テスト（ビルド前）**：
```bash
npm start  # 開発モードで動作確認
ls logs/multi-grep-replacer/  # Vibe Loggerのログ出力確認
```

**ビルド&テスト（ビルド後）**：
```bash
npm run build:dev  # .appファイル作成
# .appファイルを起動して機能動作確認
ls logs/multi-grep-replacer/  # パッケージ版でもログ出力確認
```

完了後、Task X.X.4に進んでください。


**Task X.X.4: Record & Commit（記録・コミット）**

**ログ確認**：
```bash
# Vibe Loggerの出力確認
tail -n 50 logs/multi-grep-replacer/vibe_*.log
# 構造化ログが正しく記録されているか確認
```

**ドキュメント更新**：
- @logs/CHANGELOG.md更新（実装内容）
- @logs/ERRORLOG.md更新（問題があった場合）
- @logs/PATTERNS.md更新（新しい知見）

**Git commit実行**：
```bash
git add .
git commit -m "feat: Task X.X: [実装内容の要約]"
git push origin main
```

「Task X.X: [機能名] → ✅完了」と報告してください。

開始してください。
```

### 作業ディレクトリ
- **アプリケーション本体**: `src/` 内に実装
- **設計書参照**: `docs/` 内のMarkdownファイルを常に参照
- **設定管理**: `config/` 内でJSONファイル管理
- **Git管理**: ルートディレクトリで実行

## 品質確認項目

### 最終確認チェックリスト
```markdown
各Task完了時の必須確認項目：

### 基本動作確認
- [ ] npm start でアプリケーション正常起動
- [ ] ESLint チェック通過（警告0件）
- [ ] 基本テストスイート全項目PASS
- [ ] メモリ使用量が200MB以下

### UI応答性確認（Phase 3以降）
- [ ] ボタンクリック100ms以内反応
- [ ] フォーム入力遅延なし
- [ ] ページ読み込み2秒以内

### 機能動作確認
- [ ] 実装した機能の基本操作確認
- [ ] エラーケース動作確認
- [ ] 境界値テスト実行

### 実行ファイル確認（必須）
- [ ] npm run build:dev で.appファイル作成成功
- [ ] .appファイル単体起動確認
- [ ] パッケージ版での機能動作確認

### 記録確認
- [ ] CHANGELOG.md更新完了
- [ ] PATTERNS.md更新完了
- [ ] Git commit実行完了
```

## 成功指標（KPI）

### 技術的成功指標
- **UI応答性**: 100ms以内達成率100%
- **処理性能**: 1000ファイル30秒以内達成
- **品質**: Critical問題0件、テスト成功率95%以上
- **実行ファイル**: 各Task完了時の.app作成・動作確認100%成功

### プロセス成功指標
- **段階的テスト**: 各Task完了時テスト100%実行
- **記録管理**: CHANGELOG.md、PATTERNS.md継続更新100%
- **知識蓄積**: Electronベストプラクティス記録・再利用実現

このCLAUDE.mdに従って開発することで、アプリケーションを確実に開発し、再利用可能な知識・パターンを蓄積できます。