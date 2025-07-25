module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // コード品質
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-console': 'off', // 開発時はconsole.logを許可
    'no-debugger': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    
    // スタイル
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    
    // セキュリティ
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // ベストプラクティス
    'eqeqeq': 'error',
    'no-magic-numbers': ['warn', { 
      'ignore': [-1, 0, 1, 2, 100, 1000, 1024], 
      'ignoreArrayIndexes': true 
    }],
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    
    // Electron特有
    'no-restricted-globals': ['error', 'require', 'process', '__dirname', '__filename']
  },
  overrides: [
    {
      // メインプロセスではNode.js APIを許可
      files: ['src/main/**/*.js'],
      rules: {
        'no-restricted-globals': 'off'
      }
    },
    {
      // PreloadスクリプトではrequireとprocessAPIを許可
      files: ['src/preload/**/*.js'],
      rules: {
        'no-restricted-globals': 'off'
      }
    },
    {
      // レンダラープロセスではprocessのバージョン情報アクセスを許可
      files: ['src/renderer/**/*.js'],
      rules: {
        'no-restricted-globals': ['error', 'require', '__dirname', '__filename']
      }
    },
    {
      // テストファイルでは一部ルールを緩和
      files: ['tests/**/*.js', '**/*.test.js'],
      rules: {
        'no-magic-numbers': 'off'
      }
    }
  ],
  globals: {
    // Electronプロセス別のグローバル変数
    electronAPI: 'readonly'
  }
};