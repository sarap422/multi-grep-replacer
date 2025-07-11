module.exports = {
  // ESLintとの競合を避けるための基本設定
  semi: true,
  trailingComma: 'none',
  singleQuote: true,
  printWidth: 120,
  tabWidth: 2,
  useTabs: false,
  
  // Electron プロジェクト特有の設定
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'always',
  endOfLine: 'lf',
  
  // ファイルタイプ別設定
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 80,
        trailingComma: 'none'
      }
    },
    {
      files: '*.md',
      options: {
        printWidth: 80,
        proseWrap: 'always'
      }
    }
  ]
};