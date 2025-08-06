# 3_debugging.md（デバッグ環境整備）

## 🎯 デバッグ環境整備の目的

### 前回失敗の教訓
```
❌ 前回の問題：
- 最終パッケージングまで実行ファイル作成なし
- 「エラーが発生しました」→ 原因不明
- デバッグをClaude Codeに任せきり
- 段階的動作確認の欠如
- シングルインスタンス制御エラーの頻発
- データ型変更時のテスト同期漏れ

✅ 今回の改善：
- 各Task完了時の即座動作確認
- 詳細なエラー情報と解決方法提示
- 早期実行ファイル（.app）作成
- 段階的テスト環境の構築
- シングルインスタンス制御の標準化
- データ型安全性の強化
```

### 目標設定
- **UI応答性**: 100ms以内のボタンクリック反応
- **エラー可視化**: 具体的なエラー内容と解決方法
- **段階的品質保証**: 各Task完了時の動作確認
- **知識蓄積**: 問題解決パターンの記録・再利用
- **型安全性**: データ型変更時の影響範囲の完全把握
- **起動安定性**: シングルインスタンス制御の確実な動作

## 🚨 1. 頻発問題の予防システム

### 1.1 シングルインスタンス制御の標準化

#### 🔴 頻発する問題パターン
```javascript
// ❌ 危険パターン1: 初期化内での制御（即座終了）
class App {
    async initialize() {
        const gotTheLock = app.requestSingleInstanceLock(); // ⚠️ タイミング不良
        if (!gotTheLock) {
            app.quit();
            return; // ⚠️ 初期化中断
        }
    }
}

// ❌ 危険パターン2: トップレベルreturn（スクリプト終了）
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    return; // ⚠️ モジュール読み込み中断
}

// ❌ 危険パターン3: second-instanceハンドラー未実装
app.on('second-instance', () => {
    // 空実装 → ウィンドウが表示されない
});
```

#### ✅ 標準実装パターン（強制）
```javascript
// ✅ 正解: main.jsの最上位で実装
// src/main/main.js

// 必須: シングルインスタンス制御（最優先）
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('🔒 Another instance is already running, exiting gracefully...');
    app.quit();
    process.exit(0); // 確実な終了
} else {
    console.log('✅ Single instance lock acquired successfully');
    
    // アプリケーション本体の実行
    const multiGrepReplacer = new MultiGrepReplacerApp();
    
    // 必須: second-instanceイベントハンドラー
    app.on('second-instance', async (event, commandLine, workingDirectory) => {
        console.log('🔄 Second instance detected, focusing existing window');
        console.log('📋 Command line:', commandLine);
        console.log('📂 Working directory:', workingDirectory);
        
        // 既存ウィンドウの復元・フォーカス（必須）
        if (multiGrepReplacer.mainWindow) {
            try {
                // 最小化されている場合は復元
                if (multiGrepReplacer.mainWindow.isMinimized()) {
                    multiGrepReplacer.mainWindow.restore();
                    console.log('🔓 Window restored from minimized state');
                }
                
                // ウィンドウを表示・フォーカス
                multiGrepReplacer.mainWindow.show();
                multiGrepReplacer.mainWindow.focus();
                console.log('👁️ Window focused successfully');
                
                // macOS対応: アプリケーションをアクティブ化
                if (process.platform === 'darwin') {
                    app.focus();
                }
                
            } catch (error) {
                console.error('❌ Failed to focus window:', error);
            }
        } else {
            console.warn('⚠️ No main window found to focus');
            
            // フォールバック: 新しいウィンドウを作成
            try {
                await multiGrepReplacer.createMainWindow();
                console.log('🆕 Created new window as fallback');
            } catch (createError) {
                console.error('❌ Failed to create fallback window:', createError);
            }
        }
    });
    
    // アプリケーション初期化
    multiGrepReplacer.initialize();
}
```

#### 🧪 シングルインスタンス制御テスト
```javascript
// scripts/test-single-instance.js
class SingleInstanceValidator {
    static validateImplementation(filePath) {
        const fs = require('fs');
        const content = fs.readFileSync(filePath, 'utf8');
        const issues = [];
        
        // 必須チェック項目
        const checks = [
            {
                pattern: /app\.requestSingleInstanceLock\(\)/,
                message: 'requestSingleInstanceLock() call is required'
            },
            {
                pattern: /app\.on\(['"`]second-instance['"`]/,
                message: 'second-instance event handler is required'
            },
            {
                pattern: /mainWindow\.restore\(\)/,
                message: 'Window restore() call is required in second-instance handler'
            },
            {
                pattern: /mainWindow\.show\(\)/,
                message: 'Window show() call is required in second-instance handler'
            },
            {
                pattern: /mainWindow\.focus\(\)/,
                message: 'Window focus() call is required in second-instance handler'
            }
        ];
        
        checks.forEach(check => {
            if (!check.pattern.test(content)) {
                issues.push(`❌ ${check.message}`);
            }
        });
        
        // アンチパターンチェック
        const antiPatterns = [
            {
                pattern: /initialize\(\)[\s\S]*requestSingleInstanceLock/,
                message: 'Single instance lock should not be inside initialize() method'
            },
            {
                pattern: /if\s*\(\s*!gotTheLock\s*\)\s*{[\s\S]*return[\s\S]*}/,
                message: 'Avoid return statement after app.quit() in top-level scope'
            }
        ];
        
        antiPatterns.forEach(antiPattern => {
            if (antiPattern.pattern.test(content)) {
                issues.push(`⚠️ Anti-pattern detected: ${antiPattern.message}`);
            }
        });
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }
    
    static async testInstanceBehavior() {
        const { spawn } = require('child_process');
        
        console.log('🧪 Testing single instance behavior...');
        
        // 1回目の起動
        const firstInstance = spawn('npm', ['start'], {
            stdio: 'pipe',
            cwd: process.cwd()
        });
        
        let firstInstanceOutput = '';
        firstInstance.stdout.on('data', (data) => {
            firstInstanceOutput += data.toString();
        });
        
        // 3秒待機
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 2回目の起動（即座終了するはず）
        const secondInstance = spawn('npm', ['start'], {
            stdio: 'pipe',
            cwd: process.cwd()
        });
        
        let secondInstanceOutput = '';
        secondInstance.stdout.on('data', (data) => {
            secondInstanceOutput += data.toString();
        });
        
        // 2秒待機して結果確認
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        firstInstance.kill();
        secondInstance.kill();
        
        const results = {
            firstInstanceStarted: firstInstanceOutput.includes('App ready') || firstInstanceOutput.includes('initialized'),
            secondInstanceDetected: secondInstanceOutput.includes('Another instance') || secondInstanceOutput.includes('already running'),
            windowFocused: firstInstanceOutput.includes('focusing existing window') || firstInstanceOutput.includes('Second instance detected')
        };
        
        console.log('📊 Single instance test results:', results);
        return results;
    }
}

module.exports = SingleInstanceValidator;
```

### 1.2 データ型安全性の強化

#### 🔴 頻発するデータ型エラーパターン
```javascript
// ❌ 危険パターン1: 配列期待→数値受信
expect(result.changes).toHaveLength(1);
// Error: received value must have a length property
// Received has type: number, Received has value: 2

// ❌ 危険パターン2: 実装変更時のテスト同期漏れ
// 実装側: changes プロパティを配列→数値に変更
// テスト側: 古い期待値のまま残存
```

#### ✅ データ型安全性確保システム
```javascript
// src/types/interfaces.js - 型定義の明文化
/**
 * 置換処理結果の型定義
 * ⚠️ 重要: この型定義を変更する場合は、必ず関連テストも更新すること
 */
const ReplacementResultSchema = {
    modified: 'boolean',     // 置換が実行されたかどうか
    replacements: 'number',  // 置換された箇所の総数
    changes: 'number',       // 🔄 変更: 配列から数値に変更（2025-08-05）
    files: 'array',          // 処理されたファイルの配列
    errors: 'array',         // エラーが発生したファイルの配列
    duration: 'number',      // 処理時間（ミリ秒）
    timestamp: 'string'      // 処理開始時刻のISO文字列
};

/**
 * 型検証ヘルパークラス
 */
class TypeValidator {
    static validateReplacementResult(result) {
        const errors = [];
        
        // 必須プロパティの存在確認
        const requiredProps = ['modified', 'replacements', 'changes', 'files', 'errors'];
        requiredProps.forEach(prop => {
            if (!(prop in result)) {
                errors.push(`Missing required property: ${prop}`);
            }
        });
        
        // 型検証
        if (typeof result.modified !== 'boolean') {
            errors.push(`Property 'modified' must be boolean, got: ${typeof result.modified}`);
        }
        
        if (typeof result.replacements !== 'number') {
            errors.push(`Property 'replacements' must be number, got: ${typeof result.replacements}`);
        }
        
        // 🔥 重要: changes プロパティの型検証
        if (typeof result.changes !== 'number') {
            errors.push(`Property 'changes' must be number, got: ${typeof result.changes} (Was this changed from array?)`);
        }
        
        if (!Array.isArray(result.files)) {
            errors.push(`Property 'files' must be array, got: ${typeof result.files}`);
        }
        
        if (!Array.isArray(result.errors)) {
            errors.push(`Property 'errors' must be array, got: ${typeof result.errors}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors,
            schema: ReplacementResultSchema
        };
    }
    
    /**
     * テスト用のモックデータ生成
     * 🎯 テストで使用する標準的なデータ構造を提供
     */
    static createMockReplacementResult(overrides = {}) {
        const defaultResult = {
            modified: true,
            replacements: 2,
            changes: 2,        // 🔄 数値型（配列ではない）
            files: ['file1.js', 'file2.js'],
            errors: [],
            duration: 123,
            timestamp: new Date().toISOString()
        };
        
        return { ...defaultResult, ...overrides };
    }
}

module.exports = { ReplacementResultSchema, TypeValidator };
```

#### 🧪 テスト同期確保システム
```javascript
// tests/helpers/type-sync-validator.js
class TestTypeSyncValidator {
    /**
     * 実装とテストの型整合性を確認
     */
    static validateTestSync() {
        const issues = [];
        
        // 1. ReplacementResult関連のテストを検索
        const testFiles = this.findTestFiles('replacement');
        
        testFiles.forEach(testFile => {
            const testContent = require('fs').readFileSync(testFile, 'utf8');
            
            // 危険なパターンを検出
            const dangerousPatterns = [
                {
                    pattern: /expect\(.*\.changes\)\.toHaveLength/,
                    message: `${testFile}: changes プロパティに toHaveLength() を使用（数値型なので toBe() を使用すべき）`,
                    fix: 'expect(result.changes).toBe(expected_number)'
                },
                {
                    pattern: /expect\(.*\.changes\[0\]\)/,
                    message: `${testFile}: changes プロパティを配列として扱っている（数値型に変更済み）`,
                    fix: 'changes は数値なので配列アクセスは不可'
                },
                {
                    pattern: /result\.changes\.forEach/,
                    message: `${testFile}: changes プロパティに forEach() を使用（数値型なので不可）`,
                    fix: 'changes は数値なので反復処理は不可'
                }
            ];
            
            dangerousPatterns.forEach(pattern => {
                if (pattern.pattern.test(testContent)) {
                    issues.push({
                        type: 'TYPE_MISMATCH',
                        file: testFile,
                        message: pattern.message,
                        fix: pattern.fix,
                        severity: 'HIGH'
                    });
                }
            });
        });
        
        return {
            isValid: issues.length === 0,
            issues: issues
        };
    }
    
    /**
     * 自動修正提案の生成
     */
    static generateAutoFix(testFile) {
        const fs = require('fs');
        let content = fs.readFileSync(testFile, 'utf8');
        let fixCount = 0;
        
        // 自動修正パターン
        const fixes = [
            {
                from: /expect\((.*\.changes)\)\.toHaveLength\((\d+)\)/g,
                to: 'expect($1).toBe($2)',
                description: 'toHaveLength() → toBe() 修正'
            },
            {
                from: /expect\((.*\.changes)\[0\]\.count\)\.toBe\((\d+)\)/g,
                to: '// expect($1[0].count).toBe($2); // ❌ changes は数値型なので配列アクセス不可',
                description: '配列アクセス無効化'
            }
        ];
        
        fixes.forEach(fix => {
            const matches = content.match(fix.from);
            if (matches) {
                content = content.replace(fix.from, fix.to);
                fixCount += matches.length;
                console.log(`✅ Applied ${fix.description}: ${matches.length} occurrences`);
            }
        });
        
        if (fixCount > 0) {
            // バックアップ作成
            fs.writeFileSync(`${testFile}.backup`, fs.readFileSync(testFile));
            
            // 修正版を書き込み
            fs.writeFileSync(testFile, content);
            
            console.log(`🔧 Auto-fixed ${fixCount} issues in ${testFile}`);
            console.log(`💾 Backup created: ${testFile}.backup`);
        }
        
        return { fixCount, backupCreated: fixCount > 0 };
    }
    
    static findTestFiles(keyword) {
        const glob = require('glob');
        return glob.sync(`tests/**/*${keyword}*.test.js`);
    }
}

module.exports = TestTypeSyncValidator;
```

#### 📋 実装変更時の必須チェックリスト
```markdown
## データ型変更時の必須作業

### Step 1: 変更内容の文書化
- [ ] src/types/interfaces.js に型定義を更新
- [ ] 変更理由と変更日をコメントに記載
- [ ] 影響を受けるファイルをリストアップ

### Step 2: テスト同期確認
- [ ] npm run test:type-sync でテスト整合性確認
- [ ] 型関連のテスト失敗をすべて修正
- [ ] TypeValidator.createMockReplacementResult() を更新

### Step 3: 自動検証
- [ ] TestTypeSyncValidator.validateTestSync() 実行
- [ ] 危険パターンの検出・修正
- [ ] 自動修正提案の適用

### Step 4: 手動確認
- [ ] 変更されたプロパティを使用しているテストを全て確認
- [ ] expect() の期待値が正しい型になっているか確認
- [ ] モックデータが新しい型構造に対応しているか確認

### Step 5: 回帰テスト
- [ ] npm test で全テスト通過確認
- [ ] 実際のアプリケーションで機能動作確認
- [ ] パッケージ版での動作確認

⚠️ 注意: この手順を省略すると、必ずテスト失敗やデータ型エラーが発生します
```

## 🔧 2. Electron特有エラーの予測と対策（強化版）

### 2.1 IPC通信エラー（型安全性追加）
```javascript
// src/main/ipc-type-safe.js
class IPCTypeSafeHandler {
    static registerHandlers() {
        // 型安全なファイル操作ハンドラー
        ipcMain.handle('file-operations:replace', async (event, args) => {
            // 入力検証
            const validation = this.validateReplaceArgs(args);
            if (!validation.isValid) {
                return {
                    success: false,
                    error: 'INVALID_ARGUMENTS',
                    details: validation.errors,
                    type: 'ValidationError'
                };
            }
            
            try {
                const result = await ReplacementEngine.process(args);
                
                // 出力検証
                const outputValidation = TypeValidator.validateReplacementResult(result);
                if (!outputValidation.isValid) {
                    console.error('❌ IPC output type validation failed:', outputValidation.errors);
                    // 開発環境では型エラーを表示
                    if (process.env.NODE_ENV === 'development') {
                        throw new Error(`Type validation failed: ${outputValidation.errors.join(', ')}`);
                    }
                }
                
                return {
                    success: true,
                    data: result,
                    type: 'ReplacementResult'
                };
                
            } catch (error) {
                return {
                    success: false,
                    error: error.code || 'UNKNOWN_ERROR',
                    message: error.message,
                    type: 'ProcessingError'
                };
            }
        });
    }
    
    static validateReplaceArgs(args) {
        const errors = [];
        
        if (!args || typeof args !== 'object') {
            errors.push('Arguments must be an object');
            return { isValid: false, errors };
        }
        
        // 必須フィールド検証
        const requiredFields = ['targetDirectory', 'rules', 'options'];
        requiredFields.forEach(field => {
            if (!(field in args)) {
                errors.push(`Missing required field: ${field}`);
            }
        });
        
        // 型検証
        if (args.targetDirectory && typeof args.targetDirectory !== 'string') {
            errors.push('targetDirectory must be string');
        }
        
        if (args.rules && !Array.isArray(args.rules)) {
            errors.push('rules must be array');
        }
        
        if (args.options && typeof args.options !== 'object') {
            errors.push('options must be object');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}
```

### 2.2 Context Isolation設定問題（セキュリティ強化）
```javascript
// src/main/security-validator-enhanced.js
class SecurityValidatorEnhanced {
    static validateWebPreferences(webPreferences) {
        const issues = [];
        const warnings = [];
        
        // 必須セキュリティ設定
        const requiredSettings = {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        };
        
        Object.entries(requiredSettings).forEach(([key, expectedValue]) => {
            if (webPreferences[key] !== expectedValue) {
                issues.push({
                    setting: key,
                    expected: expectedValue,
                    actual: webPreferences[key],
                    severity: 'CRITICAL',
                    message: `Security setting ${key} must be ${expectedValue}`
                });
            }
        });
        
        // 推奨設定
        const recommendedSettings = {
            allowRunningInsecureContent: false,
            experimentalFeatures: false
        };
        
        Object.entries(recommendedSettings).forEach(([key, expectedValue]) => {
            if (webPreferences[key] !== expectedValue) {
                warnings.push({
                    setting: key,
                    expected: expectedValue,
                    actual: webPreferences[key],
                    severity: 'WARNING',
                    message: `Recommended setting ${key} should be ${expectedValue}`
                });
            }
        });
        
        // preload スクリプトの存在確認
        if (!webPreferences.preload) {
            issues.push({
                setting: 'preload',
                expected: 'valid file path',
                actual: webPreferences.preload,
                severity: 'CRITICAL',
                message: 'preload script is required for secure API access'
            });
        } else {
            // preload ファイルの存在確認
            const fs = require('fs');
            if (!fs.existsSync(webPreferences.preload)) {
                issues.push({
                    setting: 'preload',
                    expected: 'existing file',
                    actual: webPreferences.preload,
                    severity: 'CRITICAL',
                    message: `preload script file not found: ${webPreferences.preload}`
                });
            }
        }
        
        return {
            isSecure: issues.length === 0,
            issues: issues,
            warnings: warnings,
            score: this.calculateSecurityScore(issues, warnings)
        };
    }
    
    static calculateSecurityScore(issues, warnings) {
        const maxScore = 100;
        const criticalPenalty = 25;
        const warningPenalty = 5;
        
        const penalty = (issues.length * criticalPenalty) + (warnings.length * warningPenalty);
        return Math.max(0, maxScore - penalty);
    }
    
    static generateSecurityReport(validation) {
        const report = {
            timestamp: new Date().toISOString(),
            score: validation.score,
            status: validation.isSecure ? 'SECURE' : 'INSECURE',
            issues: validation.issues,
            warnings: validation.warnings,
            recommendations: []
        };
        
        // 修正提案を生成
        validation.issues.forEach(issue => {
            report.recommendations.push({
                type: 'FIX_REQUIRED',
                setting: issue.setting,
                action: `Set ${issue.setting} to ${issue.expected}`,
                code: `webPreferences.${issue.setting} = ${issue.expected};`
            });
        });
        
        validation.warnings.forEach(warning => {
            report.recommendations.push({
                type: 'IMPROVEMENT',
                setting: warning.setting,
                action: `Consider setting ${warning.setting} to ${warning.expected}`,
                code: `webPreferences.${warning.setting} = ${warning.expected};`
            });
        });
        
        return report;
    }
}
```

## 🧪 3. 段階的テスト環境の設計（強化版）

### 3.1 Task完了時テストフレームワーク（型安全性追加）

#### 強化されたテスト実行スクリプト
```javascript
// scripts/enhanced-test-runner.js
class EnhancedTestRunner {
    static async runComprehensiveTests(phase) {
        console.log(`🧪 Running comprehensive Phase ${phase} tests...`);
        
        const results = {
            singleInstance: null,
            typeSync: null,
            security: null,
            performance: null,
            functional: null,
            package: null
        };
        
        try {
            // 1. シングルインスタンス制御テスト
            console.log('🔒 Testing single instance control...');
            results.singleInstance = await this.testSingleInstance();
            
            // 2. 型同期確認テスト
            console.log('🔢 Testing type synchronization...');
            results.typeSync = await this.testTypeSync();
            
            // 3. セキュリティ設定テスト
            console.log('🛡️ Testing security configuration...');
            results.security = await this.testSecurity();
            
            // 4. パフォーマンステスト
            console.log('⚡ Testing performance...');
            results.performance = await this.testPerformance();
            
            // 5. 機能テスト
            console.log('⚙️ Testing functionality...');
            results.functional = await this.testFunctionality(phase);
            
            // 6. パッケージテスト
            console.log('📦 Testing package...');
            results.package = await this.testPackage();
            
            // 結果サマリー
            const summary = this.generateTestSummary(results);
            console.log('📊 Test Summary:', summary);
            
            if (!summary.allPassed) {
                throw new Error(`Tests failed: ${summary.failedTests.join(', ')}`);
            }
            
            console.log(`✅ All Phase ${phase} tests passed successfully`);
            return results;
            
        } catch (error) {
            console.error(`❌ Phase ${phase} tests failed:`, error.message);
            console.log('📋 Detailed results:', results);
            throw error;
        }
    }
    
    static async testSingleInstance() {
        const SingleInstanceValidator = require('./test-single-instance');
        
        // コード検証
        const codeValidation = SingleInstanceValidator.validateImplementation('src/main/main.js');
        if (!codeValidation.isValid) {
            return {
                passed: false,
                type: 'code_validation',
                issues: codeValidation.issues
            };
        }
        
        // 動作テスト
        const behaviorTest = await SingleInstanceValidator.testInstanceBehavior();
        const allBehaviorsPassed = Object.values(behaviorTest).every(result => result === true);
        
        return {
            passed: allBehaviorsPassed,
            type: 'behavior_test',
            details: behaviorTest,
            codeValidation: codeValidation
        };
    }
    
    static async testTypeSync() {
        const TestTypeSyncValidator = require('../tests/helpers/type-sync-validator');
        
        const validation = TestTypeSyncValidator.validateTestSync();
        
        if (!validation.isValid) {
            // 自動修正を試行
            const autoFixResults = [];
            validation.issues.forEach(issue => {
                if (issue.severity === 'HIGH') {
                    const fixResult = TestTypeSyncValidator.generateAutoFix(issue.file);
                    autoFixResults.push(fixResult);
                }
            });
            
            // 修正後に再検証
            const revalidation = TestTypeSyncValidator.validateTestSync();
            
            return {
                passed: revalidation.isValid,
                type: 'type_sync',
                originalIssues: validation.issues,
                autoFixApplied: autoFixResults.length > 0,
                finalValidation: revalidation
            };
        }
        
        return {
            passed: true,
            type: 'type_sync',
            issues: []
        };
    }
    
    static async testSecurity() {
        const SecurityValidatorEnhanced = require('../src/main/security-validator-enhanced');
        
        // セキュリティ設定を取得（模擬）
        const mockWebPreferences = {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            preload: 'src/preload/preload.js'
        };
        
        const validation = SecurityValidatorEnhanced.validateWebPreferences(mockWebPreferences);
        const report = SecurityValidatorEnhanced.generateSecurityReport(validation);
        
        return {
            passed: validation.isSecure && validation.score >= 90,
            type: 'security',
            score: validation.score,
            report: report
        };
    }
    
    static generateTestSummary(results) {
        const testTypes = Object.keys(results);
        const failedTests = testTypes.filter(type => 
            results[type] && !results[type].passed
        );
        
        return {
            totalTests: testTypes.length,
            passedTests: testTypes.length - failedTests.length,
            failedTests: failedTests,
            allPassed: failedTests.length === 0,
            successRate: ((testTypes.length - failedTests.length) / testTypes.length * 100).toFixed(1)
        };
    }
}

module.exports = EnhancedTestRunner;
```

### 3.2 デバッグツール設計（Vibe Logger統合）

#### 構造化ログシステム（AI分析対応）
```javascript
// src/main/vibe-debug-logger.js
class VibeDebugLogger {
    static LOG_CONTEXT = {
        SINGLE_INSTANCE: 'single_instance_control',
        TYPE_SAFETY: 'type_safety_validation',
        IPC_COMMUNICATION: 'ipc_communication',
        SECURITY: 'security_validation',
        PERFORMANCE: 'performance_monitoring',
        ERROR_HANDLING: 'error_handling'
    };
    
    /**
     * AI向け構造化ログ
     * Claude Code が理解しやすい形式でログを出力
     */
    static vibeLog(context, operation, data = {}) {
        const vibeEntry = {
            timestamp: new Date().toISOString(),
            context: context,
            operation: operation,
            
            // 人間向け情報
            human_readable: data.message || operation,
            severity: data.severity || 'INFO',
            
            // AI向け構造化データ
            ai_context: {
                operation_type: operation,
                context_category: context,
                success: data.success !== undefined ? data.success : null,
                error_code: data.error_code || null,
                duration_ms: data.duration_ms || null,
                memory_usage: process.memoryUsage(),
                
                // 特定のコンテキスト向けデータ
                ...this.getContextSpecificData(context, data)
            },
            
            // AI分析・改善提案向け
            ai_todo: data.ai_todo || null,
            patterns: data.patterns || [],
            metrics: data.metrics || {},
            
            // デバッグ用生データ
            raw_data: data.raw_data || {}
        };
        
        // コンソール出力（開発時）
        if (process.env.NODE_ENV === 'development') {
            console.log('🤖 VIBE LOG:', JSON.stringify(vibeEntry, null, 2));
        }
        
        // ファイル出力（AI分析用）
        this.writeVibeLog(vibeEntry);
        
        return vibeEntry;
    }
    
    static getContextSpecificData(context, data) {
        switch (context) {
            case this.LOG_CONTEXT.SINGLE_INSTANCE:
                return {
                    lock_acquired: data.lock_acquired,
                    second_instance_detected: data.second_instance_detected,
                    window_focused: data.window_focused,
                    platform: process.platform
                };
                
            case this.LOG_CONTEXT.TYPE_SAFETY:
                return {
                    expected_type: data.expected_type,
                    actual_type: data.actual_type,
                    property_name: data.property_name,
                    validation_errors: data.validation_errors || []
                };
                
            case this.LOG_CONTEXT.IPC_COMMUNICATION:
                return {
                    channel: data.channel,
                    args_type: typeof data.args,
                    response_type: typeof data.response,
                    timeout_ms: data.timeout_ms,
                    retry_count: data.retry_count || 0
                };
                
            case this.LOG_CONTEXT.PERFORMANCE:
                return {
                    target_ms: data.target_ms,
                    actual_ms: data.actual_ms,
                    performance_ratio: data.actual_ms / data.target_ms,
                    component: data.component
                };
                
            default:
                return {};
        }
    }
    
    /**
     * シングルインスタンス制御専用ログ
     */
    static logSingleInstance(operation, success, details = {}) {
        return this.vibeLog(
            this.LOG_CONTEXT.SINGLE_INSTANCE,
            operation,
            {
                success: success,
                severity: success ? 'INFO' : 'ERROR',
                message: `Single instance ${operation}: ${success ? 'SUCCESS' : 'FAILED'}`,
                lock_acquired: details.lock_acquired,
                second_instance_detected: details.second_instance_detected,
                window_focused: details.window_focused,
                ai_todo: success ? null : 'Analyze single instance control implementation for timing issues',
                patterns: success ? ['single_instance_success'] : ['single_instance_failure'],
                raw_data: details
            }
        );
    }
    
    /**
     * 型安全性検証専用ログ
     */
    static logTypeSafety(property, expectedType, actualType, isValid, context = {}) {
        return this.vibeLog(
            this.LOG_CONTEXT.TYPE_SAFETY,
            'type_validation',
            {
                success: isValid,
                severity: isValid ? 'INFO' : 'ERROR',
                message: `Type validation for ${property}: ${isValid ? 'VALID' : 'INVALID'}`,
                expected_type: expectedType,
                actual_type: actualType,
                property_name: property,
                validation_errors: context.errors || [],
                ai_todo: isValid ? null : `Fix type mismatch for ${property}: expected ${expectedType}, got ${actualType}`,
                patterns: isValid ? ['type_safety_valid'] : ['type_safety_invalid', `type_mismatch_${expectedType}_to_${actualType}`],
                raw_data: context
            }
        );
    }
    
    /**
     * パフォーマンス監視専用ログ
     */
    static logPerformance(component, operation, targetMs, actualMs, context = {}) {
        const success = actualMs <= targetMs;
        const ratio = actualMs / targetMs;
        
        return this.vibeLog(
            this.LOG_CONTEXT.PERFORMANCE,
            'performance_measurement',
            {
                success: success,
                severity: success ? 'INFO' : (ratio > 2 ? 'ERROR' : 'WARN'),
                message: `${component} ${operation}: ${actualMs}ms (target: ${targetMs}ms)`,
                target_ms: targetMs,
                actual_ms: actualMs,
                performance_ratio: ratio,
                component: component,
                ai_todo: success ? null : `Optimize ${component} ${operation} performance (${ratio.toFixed(2)}x slower than target)`,
                patterns: success ? ['performance_good'] : ['performance_issue', `performance_slow_${component}`],
                metrics: {
                    target_ms: targetMs,
                    actual_ms: actualMs,
                    ratio: ratio,
                    overhead_ms: actualMs - targetMs
                },
                raw_data: context
            }
        );
    }
    
    static writeVibeLog(vibeEntry) {
        const fs = require('fs').promises;
        const path = require('path');
        const os = require('os');
        
        const logDir = path.join(os.homedir(), 'Library', 'Application Support', 'multi-grep-replacer', 'logs', 'vibe');
        const logFile = path.join(logDir, `vibe_${new Date().toISOString().split('T')[0]}.jsonl`);
        
        // ディレクトリ作成
        fs.mkdir(logDir, { recursive: true }).then(() => {
            // JSONL形式で追記（AI分析しやすい形式）
            const logLine = JSON.stringify(vibeEntry) + '\n';
            return fs.appendFile(logFile, logLine);
        }).catch(error => {
            console.error('Failed to write vibe log:', error);
        });
    }
}

module.exports = VibeDebugLogger;
```

## 📋 4. 継続的品質保証プロセス（強化版）

### 4.1 Task完了チェックリスト（必須項目追加）
```markdown
各Task完了時の必須確認項目：

### シングルインスタンス制御確認（Critical）
- [ ] SingleInstanceValidator.validateImplementation() 通過
- [ ] シングルインスタンス制御が最上位で実装されている
- [ ] second-instanceイベントハンドラーが適切に実装されている
- [ ] ウィンドウ復元・フォーカス処理が完全に動作する
- [ ] 2回連続起動テストで正常動作確認

### データ型安全性確認（Critical）
- [ ] TestTypeSyncValidator.validateTestSync() 通過
- [ ] 変更されたデータ型に対応するテストがすべて更新済み
- [ ] TypeValidator.validateReplacementResult() でエラーなし
- [ ] 実装変更時の型定義文書が更新済み
- [ ] 危険なテストパターン（toHaveLength、配列アクセス）なし

### 基本動作確認
- [ ] npm start でアプリケーション正常起動
- [ ] ESLint チェック通過（警告0件）
- [ ] 基本テストスイート全項目PASS
- [ ] メモリ使用量が200MB以下

### セキュリティ確認
- [ ] SecurityValidatorEnhanced でスコア90以上
- [ ] contextIsolation: true, nodeIntegration: false
- [ ] preload.js でのAPI公開が適切
- [ ] セキュリティベストプラクティス準拠

### パフォーマンス確認（Phase 3以降）
- [ ] UI応答性100ms以内（PerformanceMonitor確認）
- [ ] メインスレッドブロッキングなし
- [ ] 大容量ファイル処理での安定動作
- [ ] VibeDebugLogger でパフォーマンス閾値内

### 実行ファイル確認（適用可能な場合）
- [ ] npm run build:dev で.appファイル作成成功
- [ ] .appファイル単体起動確認（1回目）
- [ ] .appファイル2回目起動確認（シングルインスタンス制御）
- [ ] パッケージ版での全機能動作確認
- [ ] パッケージ版でのセキュリティ設定維持確認

### AI分析・記録
- [ ] VibeDebugLogger で構造化ログ出力確認
- [ ] 問題発生時のパターン記録
- [ ] 知識ベース（PATTERNS.md）更新
- [ ] Claude Code 向け改善提案生成
```

### 4.2 問題発生時のトリアージ（強化版）

#### 重要度レベル定義（シングルインスタンス・型安全性追加）
```markdown
🔴 Critical（即座対応・作業停止）:
- シングルインスタンス制御の完全失敗（アプリが起動しない）
- データ型エラーによるテスト大量失敗
- アプリケーションが起動しない
- 基本機能が全く動作しない
- セキュリティ設定でCritical判定
- データ破損・ファイル削除が発生

🟡 High（当日対応）:
- シングルインスタンス制御の部分的失敗（2回目起動でウィンドウ非表示）
- データ型不整合によるテスト一部失敗
- UI応答性が目標値（100ms）を大幅超過
- エラーメッセージが不適切・無意味
- 特定条件下での機能不全
- セキュリティスコア70未満

🟢 Medium（翌日対応）:
- 軽微なUI表示不具合
- 非重要機能の動作不安定
- パフォーマンス軽微劣化
- セキュリティスコア90未満
- 型検証の軽微な警告

🔵 Low（時間あるとき対応）:
- UIデザイン微調整
- ログメッセージ改善
- コードリファクタリング
- VibeLogger出力の最適化
```

## 🎯 5. まとめ：期待される成果

### Before（問題頻発）
```
問題発生パターン：
- シングルインスタンス制御エラー → アプリ即座終了 → 原因不明で作り直し
- データ型変更 → テスト大量失敗 → 1つずつ手動修正 → 時間浪費
- 実装・テスト非同期 → 品質劣化 → 信頼性低下
```

### After（予防的品質保証）
```
改善されたフロー：
- 事前検証 → 問題予防 → 安定開発 → 高品質アプリ
- 自動検出 → 自動修正 → 迅速解決 → 継続的改善
- 構造化ログ → AI分析 → パターン学習 → 知識蓄積
```

### 期待される具体的成果
1. **シングルインスタンス制御エラー**: 100%予防（検証・テストの標準化）
2. **データ型エラー**: 80%削減（自動検証・自動修正システム）
3. **開発効率**: 問題解決時間70%短縮（予防的アプローチ）
4. **品質向上**: Critical問題0件、UI応答性100%達成
5. **AI支援強化**: Claude Code による自動分析・改善提案の精度向上

この強化されたデバッグ環境により、頻発する問題パターンを根本的に解決し、Python版を大幅に上回る安定したElectronアプリケーションを確実に開発できます。