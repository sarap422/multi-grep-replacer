# CLAUDE.md - Multi Grep Replacer 開発ガイド

## 会話のガイドライン

- **常に日本語で会話する**
- 技術的な説明も日本語で行う
- コメントやドキュメントも日本語で作成する
- 確認や質問も日本語で行う

## プロジェクト概要

Electronベースのクロスプラットフォーム対応デスクトップアプリケーション「Multi Grep Replacer」の開発プロジェクトです。Python版で課題となっていたUI応答性問題を根本解決し、モダンなWebUI技術による高速・直感的な一括置換ツールを実現します。

**重要な改善目標**：
- **UI応答性**: ボタンクリック100ms以内の即座反応（Python版の根本的課題解決）
- **モダンUI/UX**: CSS3によるフラットデザイン、アニメーション対応
- **クロスプラットフォーム**: Mac・Windows両方で同一操作感・見た目

## 設計書参照

プロジェクトの詳細設計は以下のドキュメントを参照してください：

- **要件定義**:     @docs/1_requirements.md
- **システム設計**: @docs/2_architecture.md 
- **開発タスク**:   @docs/3_tasks.md

すべての実装は上記設計書に従って進めてください。

## 技術スタック

- **言語**: JavaScript (ES6+)、Node.js
- **フレームワーク**: Electron（クロスプラットフォームデスクトップアプリ）
- **UI**: HTML5 + CSS3 + Vanilla JavaScript
- **設定ファイル**: JSON形式
- **パッケージング**: Electron Builder（.app/.exe作成用）
- **開発環境**: Claude Code + GitHub + npm

## プロジェクト構造

**重要**: Electronアプリケーションの標準構造に従い、セキュリティを最優先に設計します。

```
multi-grep-replacer/                       # GitHubリポジトリルート
├── docs/                                  # プロジェクトドキュメント
│   ├── 1_requirements.md                  # 要件定義書
│   ├── 2_architecture.md                  # システム設計書
│   ├── 3_tasks.md                         # 開発タスク一覧
│   └── user_guide.md                      # ユーザーガイド（開発後）
├── src/                                   # アプリケーションソースコード
│   ├── main/                              # Electronメインプロセス
│   │   ├── main.js                        # アプリケーションエントリーポイント
│   │   ├── menu.js                        # アプリケーションメニュー管理
│   │   ├── window-manager.js              # ウィンドウ管理
│   │   ├── file-operations.js             # ファイル操作API
│   │   ├── replacement-engine.js          # 置換処理エンジン
│   │   └── ipc-handlers.js                # IPC通信ハンドラー
│   ├── renderer/                          # レンダラープロセス（UI）
│   │   ├── index.html                     # メインUIレイアウト
│   │   ├── css/                           # スタイルシート
│   │   │   ├── main.css                   # メインスタイル
│   │   │   ├── components.css             # UIコンポーネントスタイル
│   │   │   ├── themes.css                 # テーマ（ライト/ダークモード）
│   │   │   └── animations.css             # アニメーション・トランジション
│   │   ├── js/                            # JavaScriptモジュール
│   │   │   ├── app.js                     # アプリケーション初期化
│   │   │   ├── ui-controller.js           # UI制御・イベントハンドリング
│   │   │   ├── config-manager.js          # 設定管理
│   │   │   ├── replacement-ui.js          # 置換ルール管理UI
│   │   │   ├── file-selector.js           # ファイル・フォルダ選択
│   │   │   ├── progress-display.js        # 進捗表示・結果表示
│   │   │   └── utils.js                   # 共通ユーティリティ
│   │   └── assets/                        # 静的アセット
│   │       ├── icons/                     # アプリケーションアイコン
│   │       └── fonts/                     # カスタムフォント
│   └── preload/                           # Preloadスクリプト
│       └── preload.js                     # セキュアなAPI公開
├── tests/                                 # テストスイート
│   ├── unit/                              # ユニットテスト
│   ├── integration/                       # 統合テスト
│   ├── test_files/                        # テスト用サンプルファイル
│   └── fixtures/                          # テスト用設定ファイル
├── config/                                # 設定ファイルディレクトリ
│   ├── default.json                       # デフォルト設定
│   └── samples/                           # サンプル設定ファイル
├── build/                                 # ビルド設定・リソース
│   ├── icons/                             # 各OS用アイコンファイル
│   ├── build-config.js                    # Electron Builderの設定
│   └── installer/                         # インストーラー設定
├── dist/                                  # ビルド成果物（.gitignoreで除外）
├── debug/                                 # デバッグ・ログディレクトリ
├── scripts/                               # ビルド・開発用スクリプト
├── package.json                           # npm設定・依存関係・スクリプト
├── electron-builder.json                  # Electron Builder設定
├── CLAUDE.md                              # Claude Code設定（このファイル）
├── .claude/                               # Claude Code設定（Git管理対象外）
├── .gitignore                             # Git設定
├── .eslintrc.js                           # ESLint設定
├── LICENSE                                # ライセンスファイル
└── README.md                              # プロジェクト概要
```

## ⚠️ Electron開発の絶対禁止事項（NEVER）

### 🚫 セキュリティ違反（絶対禁止）
- **nodeIntegration: true の使用**: セキュリティリスクのため禁止
- **contextIsolation: false の設定**: Context Isolationを無効化禁止
- **webSecurity無効化**: 本番環境でのwebSecurity無効化禁止
- **任意コード実行**: eval(), Function()を使った動的コード実行禁止
- **unsafe-eval CSP**: Content Security Policyでunsafe-eval許可禁止

### 🚫 ファイル操作の危険行為（絶対禁止）
- **システムファイル操作**: /etc/, /usr/, C:\Windows\ 等への書き込み禁止
- **ディスク全体検索**: ルートディレクトリからの再帰検索禁止
- **隠しファイル操作**: .git/, .env, システム隠しファイルの変更禁止
- **権限昇格**: sudo, 管理者権限での実行要求禁止
- **一時ファイル残存**: 処理後の一時ファイル削除漏れ禁止

### 🚫 UI/UX の品質低下（絶対禁止）
- **UI フリーズ**: 大容量ファイル処理でのメインスレッドブロック禁止
- **応答性劣化**: 100ms以上のボタンクリック反応遅延禁止
- **メモリリーク**: 長時間実行でのメモリ使用量増加禁止
- **エラー無視**: try-catch文でのエラー握りつぶし禁止
- **デバッグコード残存**: console.log()の本番環境残存禁止

## ✅ Electron開発の必須実装事項（MUST）

### ✅ セキュリティ対策（必須）
```javascript
// メインプロセス設定（必須）
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,           // 必須：無効化
    contextIsolation: true,           // 必須：有効化
    enableRemoteModule: false,        // 必須：無効化
    preload: path.join(__dirname, 'preload.js'), // 必須：preload使用
    webSecurity: true,                // 必須：有効化
    allowRunningInsecureContent: false, // 必須：無効化
    experimentalFeatures: false        // 必須：無効化
  }
});

// IPC通信セキュリティ（必須）
// MainからRendererへの一方向通信のみ
// 双方向通信はinvoke/handle使用
```

### ✅ パフォーマンス最適化（必須）
```javascript
// 非同期ファイル処理（必須）
const fs = require('fs').promises;
const { Worker } = require('worker_threads');

// Stream処理による大容量ファイル対応（必須）
const stream = require('stream');

// 並行処理制限（必須）
const MAX_CONCURRENT_FILES = 10;

// UI応答性確保（必須）
const UI_RESPONSE_TARGET = 100; // ms以内
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
const SUPPORTED_EXTENSIONS = ['.html', '.css', '.js'];

// ファイル名: kebab-case
file-operations.js
replacement-engine.js
ui-controller.js
```

### Node.js ベストプラクティス
```javascript
// 必須：async/await使用
async function processFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return content;
  } catch (error) {
    throw new Error(`ファイル処理エラー: ${error.message}`);
  }
}

// 必須：Promise併用での並行処理
const promises = files.map(file => processFile(file));
const results = await Promise.allSettled(promises);

// 必須：Stream処理での大容量ファイル対応
const readStream = fs.createReadStream(filePath);
const writeStream = fs.createWriteStream(outputPath);
```

## Claude Code 実行指示

### 🚀 基本実行ルール

**自動化設定**：
- mkdir、touch、write、cp、mv、git操作は自動承認してください
- npm install、npm run、npm build も自動承認してください
- 「Do you want to proceed?」が表示された場合は「2. Yes, and don't ask again...」を選択してください

**重要な指示：**：
- 各ステップで動作確認を実行してください
- エラーが発生した場合のみ中断報告してください
- デバッグ用コンソール出力を追加してください

**連続実行の徹底**：
- 中断せずに実装完了まで実行してください
- ファイル操作（mkdir、touch、write、cp、mv）は確認不要
- プログラム実行（node、npm、electron）は確認不要
- Git操作（add、commit、push）は確認不要

### 作業ディレクトリ
- **アプリケーション本体**: `src/` 内に実装
- **設計書参照**: `docs/` 内のMarkdownファイルを常に参照
- **設定管理**: `config/` 内でJSONファイル管理
- **Git管理**: ルートディレクトリで実行

## 開発ワークフロー

### 段階的実装（tasks.md準拠）

**Phase 1: プロジェクト基盤構築**
- Task 1.1: npm プロジェクト初期化とElectron環境構築
  - Task 1.1.1: Explore（探索・理解）
  - Task 1.1.2: Plan（計画・設計）
  - Task 1.1.3: Code & Test（実装・テスト）
  - Task 1.1.4: Commit（記録・次準備）

- Task 1.2: セキュリティ・設定基盤構築  
- Task 1.3: 開発環境・テスト環境構築

**Phase 2: コア機能実装**
- Task 2.1: ファイル操作エンジン実装
- Task 2.2: 置換エンジン実装
- Task 2.3: IPC通信・API設計

**Phase 3: UI/UX実装**
- Task 3.1: メインUI構築
- Task 3.2: 置換ルール管理UI
- Task 3.3: 実行・結果表示UI
- Task 3.4: Modern UI/UX機能

**Phase 4: 最適化・パッケージング**
- Task 4.1: パフォーマンス最適化
- Task 4.2: 品質保証・テスト
- Task 4.3: 配布用パッケージ作成

### Task完了確認
各Task完了後、手動でテスト動作確認します。
「Task X.X: 説明 → ✅完了」と報告してください。

### Git管理方針

**Task X.X.4: Commit（記録・次準備）**
実装内容をGitにコミットし、次タスクの準備をしてください：
- 適切なコミットメッセージ作成
- 変更内容サマリー作成
- 次Taskへの引き継ぎ事項整理

各Phase完了後「Phase X: 説明 → ✅完了」と報告してください。

## テスト駆動開発（TDD）

### 基本方針
- 実装前にテスト条件を確認
- 各Task完了時に動作確認を実行
- 期待される動作を明確にするため、まずテストケースを定義
- 想定される入出力を事前に定義

### 必須テストケース
1. **ファイル操作**: 読み取り・書き込み・権限チェックの正常系・異常系
2. **置換処理**: 単一・複数ルール、大文字小文字、エラー処理
3. **UI応答性**: 100ms以内のボタンクリック反応時間
4. **セキュリティ**: Context Isolation、IPC通信の安全性
5. **パフォーマンス**: 大容量ファイル処理、メモリ効率

## 配布準備チェックリスト

### Electron アプリ配布前必須確認
- [ ] `src/` にアプリケーション本体を適切に配置
- [ ] セキュリティベストプラクティス準拠確認
- [ ] Context Isolation、nodeIntegration設定確認
- [ ] 全機能の動作確認完了
- [ ] クロスプラットフォーム動作確認（Mac・Windows）

### ファイル構成最終確認
```
dist/
├── mac/
│   └── Multi Grep Replacer.app     # macOS アプリバンドル
├── win/
│   └── Multi Grep Replacer.exe     # Windows実行ファイル
└── linux/ (将来)
```

### 品質確認項目
- [ ] **UI応答性**: 100ms以内のボタンクリック反応
- [ ] **パフォーマンス**: 1000ファイル30秒以内処理
- [ ] **セキュリティ**: Electronセキュリティ監査完了
- [ ] **互換性**: macOS 10.14+、Windows 10+で動作
- [ ] **エラーハンドリング**: 適切なエラーメッセージ表示
- [ ] **メモリ効率**: 200MB以下のメモリ使用量