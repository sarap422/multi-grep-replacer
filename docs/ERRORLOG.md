# ERRORLOG.md - エラー記録と解決方法

このファイルには、Multi Grep Replacer開発中に発生したエラーと解決方法を記録します。

## [Task 2.2] - 2025-07-29: Async/Await構文エラー

### ❌ 問題: SyntaxError: await is only valid in async functions

**エラー詳細**:
```
/Volumes/CT1000P3/pCloud(CT1000P3)/(github)/multi-grep-replacer/src/main/main.js:105
await DebugLogger.error('HTML file loading failed', { error: error.message });
^^^^^

SyntaxError: await is only valid in async functions and the top level bodies of modules
```

**原因**:
- `createMainWindow()` メソッドが通常の関数として定義されているのに `await` を使用
- HTMLファイル存在確認エラー時のログ出力で発生

**解決方法**:
1. `createMainWindow()` を `async` 関数に変更
2. メソッド内のすべての `DebugLogger` 呼び出しに `await` を追加
3. メソッド呼び出し箇所でも `await` を使用

**修正コード**:
```javascript
// Before
createMainWindow() {
  await DebugLogger.error('HTML file loading failed', { error: error.message });
}

// After  
async createMainWindow() {
  await DebugLogger.error('HTML file loading failed', { error: error.message });
}
```

---

## [Task 2.2] - 2025-07-29: Process is not defined エラー

### ❌ 問題: ReferenceError: process is not defined

**エラー詳細**:
```
app.js:1246 ❌ New file search failed: ReferenceError: process is not defined
    at MultiGrepReplacerUI.handleNewFileSearch
```

**原因**:
- レンダラープロセスで `process` オブジェクトにアクセス試行
- Electronのセキュリティ設定により、Context Isolation有効時は利用不可

**解決方法**:
1. preload.jsでのセキュリティ検証強化
2. レンダラープロセスでの詳細エラーハンドリング追加
3. セキュリティ警告の誤検知修正

**修正コード**:
```javascript
// preload.js - セキュリティ検証強化
const validateSecurity = () => {
  // process オブジェクトの漏れを検証
  if (typeof window !== 'undefined' && typeof window.process !== 'undefined') {
    console.warn('⚠️ process object leak detected in renderer process');
  }
};

// app.js - エラーハンドリング強化
try {
  // ファイル検索処理
} catch (error) {
  if (error.message.includes('process is not defined')) {
    errorMessage += '\n\n解決方法: Electronのセキュリティ設定により、レンダラープロセスでは process オブジェクトを使用できません。';
  }
}
```

---

## [Task 2.2] - パッケージ版起動問題

### ❌ 問題: パッケージ版アプリが起動しない・2回目起動失敗

**エラー詳細**:
```
Not allowed to load local resource: file:///Volumes/.../MultiGrepReplacer.app/.../index.html
```

**原因**:
1. HTMLファイルパス解決の問題
2. ウィンドウクローズ時のクリーンアップ不足
3. メインウィンドウ参照の管理不適切

**解決方法**:
1. HTMLファイル読み込みパス解決改善
2. ウィンドウクローズイベントハンドラー追加
3. メインウィンドウ参照の適切なクリア

**修正コード**:
```javascript
// HTMLファイル読み込み改善
const htmlPath = path.join(__dirname, '../renderer/index.html');
const absoluteHtmlPath = path.resolve(htmlPath);

// ファイル存在確認
if (!require('fs').existsSync(absoluteHtmlPath)) {
  const error = new Error(`HTML file not found: ${absoluteHtmlPath}`);
  await DebugLogger.error('HTML file loading failed', { error: error.message });
  throw error;
}

// ウィンドウクローズイベント
this.mainWindow.on('closed', async () => {
  await DebugLogger.info('Main window closed');
  this.mainWindow = null;
});
```

---

## 学習事項

### ✅ Electronベストプラクティス

1. **非同期処理統一**: async/await の一貫した使用
2. **エラーハンドリング**: レンダラー・メインプロセス両方での包括的対応
3. **セキュリティ**: Context Isolationの適切な活用
4. **ライフサイクル管理**: ウィンドウ作成・破棄の適切な処理

### 🔧 デバッグ手法

1. **段階的テスト**: npm start → パッケージ版の順次確認
2. **詳細ログ**: DebugLoggerによる詳細な状態追跡
3. **エラー分類**: 構文エラー・実行時エラー・パッケージ固有問題の分離
4. **修正検証**: 修正後の両環境での動作確認

これらの記録により、同様の問題の再発防止と迅速な解決が可能になります。