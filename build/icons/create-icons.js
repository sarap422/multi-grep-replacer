/**
 * アプリアイコン生成スクリプト
 * Multi Grep Replacer用のアイコンファイルを生成
 */

const fs = require('fs');
const path = require('path');

// アイコン用SVGテンプレート（Multi Grep Replacerロゴ風）
const iconSVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <!-- 背景グラデーション -->
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#007acc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0056b3;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e6f3ff;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- 背景円 -->
  <circle cx="512" cy="512" r="480" fill="url(#bgGradient)" stroke="#003d6b" stroke-width="8"/>
  
  <!-- メインアイコン：検索＋置換シンボル -->
  <!-- 検索アイコン（左側） -->
  <circle cx="350" cy="400" r="120" fill="none" stroke="url(#iconGradient)" stroke-width="24"/>
  <line x1="440" y1="490" x2="500" y2="550" stroke="url(#iconGradient)" stroke-width="24" stroke-linecap="round"/>
  
  <!-- 矢印（中央） -->
  <path d="M 520 350 L 620 400 L 520 450" fill="none" stroke="url(#iconGradient)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- 置換アイコン（右側） -->
  <rect x="620" y="320" width="140" height="160" rx="20" fill="none" stroke="url(#iconGradient)" stroke-width="24"/>
  <line x1="650" y1="360" x2="730" y2="360" stroke="url(#iconGradient)" stroke-width="12" stroke-linecap="round"/>
  <line x1="650" y1="400" x2="730" y2="400" stroke="url(#iconGradient)" stroke-width="12" stroke-linecap="round"/>
  <line x1="650" y1="440" x2="730" y2="440" stroke="url(#iconGradient)" stroke-width="12" stroke-linecap="round"/>
  
  <!-- 複数ファイルアイコン（下部） -->
  <rect x="250" y="550" width="200" height="140" rx="15" fill="none" stroke="url(#iconGradient)" stroke-width="16"/>
  <rect x="300" y="600" width="200" height="140" rx="15" fill="none" stroke="url(#iconGradient)" stroke-width="16"/>
  <rect x="350" y="650" width="200" height="140" rx="15" fill="none" stroke="url(#iconGradient)" stroke-width="16"/>
  
  <!-- アプリ名（下部） -->
  <text x="512" y="880" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="url(#iconGradient)" text-anchor="middle">MGR</text>
  <text x="512" y="920" font-family="Arial, sans-serif" font-size="32" fill="url(#iconGradient)" text-anchor="middle" opacity="0.8">Multi Grep Replacer</text>
</svg>
`;

// プレースホルダーアイコン情報
const iconInfo = `
Multi Grep Replacer アプリアイコン
=================================

生成されるアイコンファイル：
- icon.png (1024x1024) - 基本アイコン
- icon@2x.png (512x512) - Retina対応
- icon.icns (macOS用) - 要変換
- icon.ico (Windows用) - 要変換

デザインコンセプト：
- ブルーグラデーション背景
- 検索→置換の視覚的フロー
- 複数ファイル処理を示すレイヤー
- MGRブランディング

注意：
プロダクション環境では、プロのグラフィックデザイナーによる
高品質なアイコンデザインが推奨されます。
`;

console.log('🎨 Multi Grep Replacer アプリアイコン生成スクリプト開始');
console.log(iconInfo);

// SVGファイル出力
const svgPath = path.join(__dirname, 'icon.svg');
fs.writeFileSync(svgPath, iconSVG.trim());
console.log(`✅ SVGアイコン生成完了: ${svgPath}`);

// アイコン変換用の案内メッセージ
const conversionInstructions = `
🔧 アイコン変換手順：

1. SVG→PNG変換:
   - オンラインツール: https://convertio.co/svg-png/
   - または ImageMagick: convert icon.svg -resize 1024x1024 icon.png

2. PNG→ICNS変換 (macOS用):
   - macOS: iconutil (Xcodeツール)
   - オンライン: https://convertio.co/png-icns/

3. PNG→ICO変換 (Windows用):
   - オンライン: https://convertio.co/png-ico/
   - または ImageMagick: convert icon.png icon.ico

手動変換完了後、以下のファイルが必要：
- build/icons/icon.png (1024x1024)
- build/icons/icon@2x.png (512x512)
- build/icons/icon.icns
- build/icons/icon.ico
`;

console.log(conversionInstructions);

// 簡易テスト用のプレースホルダーPNGデータ（1x1ピクセル）を作成
// 実際のビルドテスト用
const createPlaceholderIcon = (filename, size) => {
    // Base64エンコードされた1x1透明PNGピクセル
    const transparentPng = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
        'base64'
    );
    
    const filePath = path.join(__dirname, filename);
    fs.writeFileSync(filePath, transparentPng);
    console.log(`📱 プレースホルダー作成: ${filename} (${size})`);
};

// ビルド用プレースホルダーアイコン作成
createPlaceholderIcon('icon.png', '1024x1024');
createPlaceholderIcon('icon@2x.png', '512x512');
createPlaceholderIcon('icon.icns', 'macOS');
createPlaceholderIcon('icon.ico', 'Windows');

console.log('✅ アプリアイコン生成スクリプト完了');
console.log('⚠️  プレースホルダーアイコンが作成されました。プロダクション環境では適切なアイコンに置き換えてください。');