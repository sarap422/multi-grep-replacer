module.exports = {
  env: {
    browser: true,
    commonjs: true,
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
    // Code Style Rules
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'arrow-parens': ['error', 'always'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'max-len': ['warn', { 'code': 120 }],
    
    // Development Rules
    'no-unused-vars': ['warn', { 'argsIgnorePattern': '^_' }],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    
    // Security Rules (Electron specific)
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Performance Rules
    'no-loop-func': 'warn',
    'no-inner-declarations': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    
    // Best Practice Rules
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-throw-literal': 'error',
    'prefer-promise-reject-errors': 'error',
    'no-return-await': 'error',
    
    // Electron Security Rules
    'no-restricted-globals': [
      'error',
      {
        'name': 'require',
        'message': 'Use import/export or secure IPC instead of require in renderer process'
      }
    ]
  },
  overrides: [
    {
      // Main process specific rules
      files: ['src/main/**/*.js'],
      rules: {
        'no-restricted-globals': 'off' // Allow require in main process
      }
    },
    {
      // Preload script specific rules
      files: ['src/preload/**/*.js'],
      rules: {
        'no-restricted-globals': 'off' // Allow require in preload scripts
      }
    },
    {
      // Test files specific rules
      files: ['tests/**/*.js', '**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off',
        'max-len': 'off'
      }
    }
  ],
  globals: {
    'electronAPI': 'readonly'
  }
};