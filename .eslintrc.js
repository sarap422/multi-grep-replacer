module.exports = {
    env: {
        browser: true,
        node: true,
        es2021: true,
        jest: true
    },
    extends: [
        'eslint:recommended',
        'prettier'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        // Electronセキュリティルール
        'no-eval': 'error',
        'no-new-func': 'error',
        'no-implied-eval': 'error',
        
        // 基本的なコード品質ルール
        'no-unused-vars': ['warn', { 
            'argsIgnorePattern': '^_',
            'varsIgnorePattern': '^_'
        }],
        'no-console': ['warn', { 
            allow: ['warn', 'error', 'info'] 
        }],
        'prefer-const': 'warn',
        'no-var': 'error',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        
        // スタイルルール（Prettierと競合しないもの）
        'camelcase': ['warn', { 
            properties: 'never',
            ignoreDestructuring: true 
        }],
        'no-multiple-empty-lines': ['warn', { 
            max: 1, 
            maxEOF: 0 
        }],
        
        // ES6+ルール
        'arrow-body-style': ['warn', 'as-needed'],
        'arrow-parens': ['warn', 'always'],
        'no-duplicate-imports': 'error',
        'prefer-arrow-callback': 'warn',
        'prefer-template': 'warn',
        
        // エラー防止
        'no-throw-literal': 'error',
        'no-return-await': 'error',
        'no-await-in-loop': 'warn',
        'no-promise-executor-return': 'error',
        
        // Electronアプリ特有の設定
        'no-restricted-properties': [
            'error',
            {
                object: 'electron',
                property: 'remote',
                message: 'electron.remote is deprecated. Use IPC instead.'
            }
        ]
    },
    overrides: [
        {
            // メインプロセス用の設定
            files: ['src/main/**/*.js'],
            rules: {
                'no-console': 'off' // メインプロセスではconsole使用OK
            }
        },
        {
            // レンダラープロセス用の設定
            files: ['src/renderer/**/*.js'],
            env: {
                browser: true,
                node: false
            },
            globals: {
                electronAPI: 'readonly'
            }
        },
        {
            // Preloadスクリプト用の設定
            files: ['src/preload/**/*.js'],
            rules: {
                'no-console': 'off'
            }
        }
    ]
};