# macOS DMG背景画像設定

## 概要
Multi Grep Replacer用のDMGインストーラー背景画像の仕様とガイドライン

## 画像仕様
- **ファイル名**: background.png
- **サイズ**: 540×380 ピクセル
- **形式**: PNG（24bit、アルファチャンネル対応）
- **解像度**: 72 DPI

## デザインガイドライン

### 配色
- 背景色: #1e293b (ダークグレー)
- アクセント: #38bdf8 (ブルー)
- テキスト: #f1f5f9 (ライトグレー)

### レイアウト
```
┌─────────────────────────────────────────┐
│  Multi Grep Replacer                    │
│                                         │
│     📱              📁                  │
│    [App]         [Applications]         │
│                                         │
│  Drag app to Applications folder        │
│  アプリをApplicationsフォルダにドラッグ   │
└─────────────────────────────────────────┘
```

### 要素配置
1. **アプリアイコン位置**: (130, 220)
2. **Applicationsリンク位置**: (410, 220)
3. **説明テキスト**: 中央下部
4. **ブランドロゴ**: 上部中央

## 作成方法

### オプション1: デザインツール
- Adobe Illustrator/Photoshop
- Figma
- Sketch

### オプション2: プログラム生成
- Canvas API (Node.js)
- ImageMagick
- SVG→PNG変換

### オプション3: 簡易版
現在は背景色のみ設定済み (electron-builder.json)
```json
"backgroundColor": "#1e293b"
```

## 実装状況
- [ ] 背景画像デザイン
- [ ] background.png作成
- [x] electron-builder.json設定
- [x] DMGウィンドウサイズ設定

## 注意事項
- 高DPI（Retina）対応のため、2倍サイズ版も推奨
- macOS Dark Mode対応を考慮
- 視覚的な魅力とブランディングの両立
EOF < /dev/null