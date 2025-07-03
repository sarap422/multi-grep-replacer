# Multi Grep Replacer テスト用マークダウン

## 概要

この文書は **Multi Grep Replacer** の置換機能をテストするためのサンプルMarkdownファイルです。様々な文字列パターンを含んでおり、置換処理の動作確認に使用されます。

## 置換テストパターン

### 1. 基本的なクラス名置換

以下のHTMLクラス名が置換対象です：

- `old-container` → 新しいコンテナークラス
- `old-header` → 新しいヘッダークラス  
- `old-navigation` → 新しいナビゲーションクラス
- `old-button` → 新しいボタンクラス

### 2. JavaScript変数名置換

```javascript
// 置換前
var oldVariable = "古い変数";
var anotherOldVar = 123;

// 置換後の期待値
const newVariable = "新しい変数";
const anotherNewVar = 123;
```

### 3. CSS セレクタ置換

```css
/* 置換前 */
.old-class {
    color: #old-color;
}

#old-id {
    background: url('/images/old-background.jpg');
}

/* 置換後の期待値 */
.new-class {
    color: #new-color;
}

#new-id {
    background: url('/images/new-background.jpg');
}
```

### 4. API エンドポイント置換

APIのバージョンアップに伴うエンドポイント変更：

- `GET /api/v1/old-endpoint` → `GET /api/v2/new-endpoint`
- `POST /api/v1/old-users` → `POST /api/v2/new-users`
- `PUT /api/v1/old-settings` → `PUT /api/v2/new-settings`

### 5. 設定ファイル内の置換

設定ファイルでよく使われるパターン：

```json
{
  "oldDatabaseUrl": "mongodb://old-server:27017/olddb",
  "oldApiKey": "old-api-key-12345",
  "oldTimeout": 5000,
  "features": {
    "oldFeatureFlag": true
  }
}
```

### 6. ドキュメント内のテキスト置換

- **旧サービス名**: Old Service Platform
- **旧会社名**: Old Company Inc.
- **旧プロダクト名**: Old Product Suite
- **旧ドメイン**: old-domain.com

## フレームワーク移行パターン

### Bootstrap v3 → v4/5

```html
<!-- 旧Bootstrap -->
<button class="btn btn-default">Default Button</button>
<div class="panel panel-default">
  <div class="panel-heading">Old Panel</div>
  <div class="panel-body">Content</div>
</div>

<!-- 新Bootstrap期待値 -->
<button class="btn btn-secondary">Default Button</button>
<div class="card">
  <div class="card-header">New Card</div>
  <div class="card-body">Content</div>
</div>
```

### jQuery → Vanilla JS

```javascript
// 旧jQuery記法
$('.old-selector').addClass('active');
$('#old-id').on('click', oldClickHandler);

// 新Vanilla JS期待値
document.querySelectorAll('.new-selector').forEach(el => el.classList.add('active'));
document.getElementById('new-id').addEventListener('click', newClickHandler);
```

## 複雑な置換パターン

### 1. 正規表現が必要なパターン

- 電話番号フォーマット: `old-format: 03-1234-5678` → `new-format: 03.1234.5678`
- 日付フォーマット: `old-date: 2024/01/01` → `new-date: 2024-01-01`

### 2. 大文字小文字の考慮

- `OldClassName` → `NewClassName`
- `oldMethodName` → `newMethodName`  
- `OLD_CONSTANT` → `NEW_CONSTANT`

### 3. 部分一致の考慮

- `old_prefix_something` → `new_prefix_something`
- `something_old_suffix` → `something_new_suffix`

## テスト用文章

この文章には **oldVariable** や `old-class` といった置換対象の文字列が含まれています。また、**Old Company** が提供する **Old Service** についても言及しており、これらも置換処理のテスト対象となります。

### コードブロック内の置換テスト

```bash
# 旧コマンド
old-command --old-option value
old-script.sh --config old-config.json

# 新コマンド期待値  
new-command --new-option value
new-script.sh --config new-config.json
```

```python
# Python内の置換例
old_function_name("old_parameter")
OLD_CONSTANT_VALUE = "old_value"

# 期待される置換後
new_function_name("new_parameter")  
NEW_CONSTANT_VALUE = "new_value"
```

## 注意事項

- `old-` で始まる文字列は基本的に置換対象
- ただし `old-stable` のような特定のケースは除外する場合がある
- 大文字小文字を区別する置換と区別しない置換の両方をテスト
- 単語境界を考慮した置換（部分一致を避ける）

## 置換結果の検証

置換処理後は以下の点を確認：

1. ✅ 意図した文字列が正しく置換されている
2. ✅ 意図しない文字列は置換されていない  
3. ✅ ファイルの構文が壊れていない
4. ✅ 文字エンコーディングが保持されている
5. ✅ 改行コードが保持されている

---

**注記**: このファイルは Multi Grep Replacer のテスト専用であり、実際のプロジェクトファイルではありません。

_最終更新: 2024年_