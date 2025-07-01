# Multi Grep Replacer (Electron Edition)

クロスプラットフォーム対応の高速一括置換ツール。Python版のUI応答性問題を根本解決し、モダンなWeb技術で実装されたデスクトップアプリケーション。

## 特徴

- ✅ **高速UI応答性**: ボタンクリック100ms以内の即座反応
- ✅ **複数置換ルール**: 複数の検索・置換パターンを一括実行
- ✅ **クロスプラットフォーム**: Mac・Windows両対応
- ✅ **モダンUI/UX**: ダークモード、ドラッグ&ドロップ対応
- ✅ **設定管理**: JSON形式での設定保存・読み込み
- ✅ **進捗表示**: リアルタイム進捗バーと詳細な結果表示

## 開発環境セットアップ

```bash
# リポジトリのクローン
git clone https://github.com/your-username/multi-grep-replacer.git
cd multi-grep-replacer

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm start

# 開発モード（自動リロード）
npm run dev
```

## プロジェクト構造

```
multi-grep-replacer/
├── src/
│   ├── main/           # Electronメインプロセス
│   ├── renderer/       # レンダラープロセス（UI）
│   └── preload/        # Preloadスクリプト
├── config/             # 設定ファイル
├── docs/               # プロジェクトドキュメント
└── tests/              # テストファイル
```

## 技術スタック

- **Electron**: クロスプラットフォームデスクトップアプリ
- **Node.js**: バックエンド処理
- **HTML5/CSS3**: モダンUI実装
- **Vanilla JavaScript**: 軽量フロントエンド

## セキュリティ

Electronセキュリティベストプラクティスに準拠：
- Context Isolation: 有効
- nodeIntegration: 無効
- Remote Module: 無効

## ライセンス

ISC License

## 開発状況

現在Phase 1（プロジェクト基盤構築）が完了。詳細は[開発タスク](docs/3_tasks.md)を参照。