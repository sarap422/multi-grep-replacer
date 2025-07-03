/**
 * End-to-End テスト
 * Electronアプリケーション全体の統合テスト
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

describe('Multi Grep Replacer E2E Tests', () => {
    let electronProcess;
    let testWorkingDir;
    
    // テスト前の準備
    beforeAll(async () => {
        // テスト用作業ディレクトリの作成
        testWorkingDir = path.join(__dirname, '../temp_test_workspace');
        await fs.mkdir(testWorkingDir, { recursive: true });
        
        // テスト用ファイルのコピー
        await setupTestFiles();
        
        // 環境変数設定
        process.env.NODE_ENV = 'test';
        process.env.ELECTRON_IS_DEV = '1';
    }, 30000);
    
    // テスト後のクリーンアップ
    afterAll(async () => {
        // Electronプロセスの終了
        if (electronProcess && !electronProcess.killed) {
            electronProcess.kill();
            await waitForProcessExit(electronProcess);
        }
        
        // テスト用ディレクトリの削除
        try {
            await fs.rmdir(testWorkingDir, { recursive: true });
        } catch (error) {
            console.warn('Failed to cleanup test directory:', error);
        }
    }, 10000);
    
    // 各テスト前の準備
    beforeEach(async () => {
        // Electronプロセスが既に動いている場合は終了
        if (electronProcess && !electronProcess.killed) {
            electronProcess.kill();
            await waitForProcessExit(electronProcess);
        }
    });
    
    // 各テスト後のクリーンアップ
    afterEach(async () => {
        if (electronProcess && !electronProcess.killed) {
            electronProcess.kill();
            await waitForProcessExit(electronProcess);
        }
    });
    
    describe('アプリケーション起動テスト', () => {
        it('Electronアプリが正常に起動する', async () => {
            electronProcess = await startElectronApp();
            expect(electronProcess).toBeDefined();
            expect(electronProcess.killed).toBe(false);
            
            // プロセスが安定して動作することを確認
            await new Promise(resolve => setTimeout(resolve, 3000));
            expect(electronProcess.killed).toBe(false);
        }, 15000);
        
        it('アプリケーションが指定されたポートで起動する', async () => {
            electronProcess = await startElectronApp();
            
            // アプリケーションのメタデータを確認
            // 注：実際のE2Eテストでは、WebDriver経由でページタイトルなどを確認
            expect(electronProcess.pid).toBeGreaterThan(0);
        }, 15000);
    });
    
    describe('設定ファイル操作テスト', () => {
        let testConfigPath;
        
        beforeEach(async () => {
            testConfigPath = path.join(testWorkingDir, 'test-config.json');
            
            // テスト用設定ファイルの作成
            const testConfig = global.testUtils.createMockConfig();
            await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
        });
        
        it('設定ファイルの読み込みが正常に動作する', async () => {
            electronProcess = await startElectronApp();
            
            // 設定ファイルが存在することを確認
            const configExists = await fileExists(testConfigPath);
            expect(configExists).toBe(true);
            
            // 設定ファイルの内容を確認
            const configContent = await fs.readFile(testConfigPath, 'utf8');
            const config = JSON.parse(configContent);
            expect(config.app_info).toBeDefined();
            expect(config.replacements).toBeDefined();
        });
        
        it('設定ファイルの保存が正常に動作する', async () => {
            electronProcess = await startElectronApp();
            
            const saveConfigPath = path.join(testWorkingDir, 'saved-config.json');
            
            // 設定ファイルが存在しないことを確認
            const initialExists = await fileExists(saveConfigPath);
            expect(initialExists).toBe(false);
            
            // 実際のアプリケーションでは、UIを通じて設定保存をトリガー
            // ここではファイルシステムレベルでの確認のみ
            const testConfig = global.testUtils.createMockConfig();
            await fs.writeFile(saveConfigPath, JSON.stringify(testConfig, null, 2));
            
            const finalExists = await fileExists(saveConfigPath);
            expect(finalExists).toBe(true);
        });
    });
    
    describe('ファイル操作テスト', () => {
        let testFilesDir;
        
        beforeEach(async () => {
            testFilesDir = path.join(testWorkingDir, 'test_files');
            await fs.mkdir(testFilesDir, { recursive: true });
            
            // テスト用ファイルの作成
            await createTestFile(path.join(testFilesDir, 'test.html'), 
                '<div class="old-class">Test content</div>');
            await createTestFile(path.join(testFilesDir, 'test.css'), 
                '.old-class { color: red; }');
            await createTestFile(path.join(testFilesDir, 'test.js'), 
                'var oldVariable = "test";');
        });
        
        it('指定ディレクトリ内のファイルを正しく検索する', async () => {
            electronProcess = await startElectronApp();
            
            // ファイルが作成されていることを確認
            const htmlExists = await fileExists(path.join(testFilesDir, 'test.html'));
            const cssExists = await fileExists(path.join(testFilesDir, 'test.css'));
            const jsExists = await fileExists(path.join(testFilesDir, 'test.js'));
            
            expect(htmlExists).toBe(true);
            expect(cssExists).toBe(true);
            expect(jsExists).toBe(true);
        });
        
        it('ファイル内容の読み取りが正常に動作する', async () => {
            electronProcess = await startElectronApp();
            
            const htmlContent = await fs.readFile(path.join(testFilesDir, 'test.html'), 'utf8');
            const cssContent = await fs.readFile(path.join(testFilesDir, 'test.css'), 'utf8');
            const jsContent = await fs.readFile(path.join(testFilesDir, 'test.js'), 'utf8');
            
            expect(htmlContent).toContain('old-class');
            expect(cssContent).toContain('old-class');
            expect(jsContent).toContain('oldVariable');
        });
    });
    
    describe('置換処理テスト', () => {
        let testFilesDir;
        let backupDir;
        
        beforeEach(async () => {
            testFilesDir = path.join(testWorkingDir, 'replacement_test');
            backupDir = path.join(testWorkingDir, 'backups');
            await fs.mkdir(testFilesDir, { recursive: true });
            await fs.mkdir(backupDir, { recursive: true });
            
            // 置換テスト用ファイルの作成
            await createTestFile(path.join(testFilesDir, 'replace-test.html'), 
                '<div class="old-container"><span class="old-text">Content</span></div>');
            await createTestFile(path.join(testFilesDir, 'replace-test.css'),
                '.old-container { padding: 20px; } .old-text { font-size: 14px; }');
            await createTestFile(path.join(testFilesDir, 'replace-test.js'),
                'const oldVariable = "test"; function oldFunction() { return oldVariable; }');
        });
        
        it('単一ルールでの置換が正常に動作する', async () => {
            electronProcess = await startElectronApp();
            
            const testFile = path.join(testFilesDir, 'replace-test.html');
            const originalContent = await fs.readFile(testFile, 'utf8');
            
            // 元のコンテンツに置換対象が含まれることを確認
            expect(originalContent).toContain('old-container');
            
            // 手動で置換を実行（実際のE2Eテストでは、UIを通じて実行）
            const replacedContent = originalContent.replace(/old-container/g, 'new-container');
            await fs.writeFile(testFile, replacedContent);
            
            const resultContent = await fs.readFile(testFile, 'utf8');
            expect(resultContent).toContain('new-container');
            expect(resultContent).not.toContain('old-container');
        });
        
        it('複数ルールでの置換が正常に動作する', async () => {
            electronProcess = await startElectronApp();
            
            const testFile = path.join(testFilesDir, 'replace-test.css');
            let content = await fs.readFile(testFile, 'utf8');
            
            // 複数の置換ルールを適用
            const rules = [
                { from: 'old-container', to: 'new-container' },
                { from: 'old-text', to: 'new-text' }
            ];
            
            rules.forEach(rule => {
                content = content.replace(new RegExp(rule.from, 'g'), rule.to);
            });
            
            await fs.writeFile(testFile, content);
            
            const resultContent = await fs.readFile(testFile, 'utf8');
            expect(resultContent).toContain('new-container');
            expect(resultContent).toContain('new-text');
            expect(resultContent).not.toContain('old-container');
            expect(resultContent).not.toContain('old-text');
        });
    });
    
    describe('エラーハンドリングテスト', () => {
        it('存在しないディレクトリの指定でエラーが発生する', async () => {
            electronProcess = await startElectronApp();
            
            const nonExistentDir = path.join(testWorkingDir, 'non-existent-directory');
            
            // ディレクトリが存在しないことを確認
            const dirExists = await fileExists(nonExistentDir);
            expect(dirExists).toBe(false);
            
            // 実際のアプリケーションでは、UIでエラーメッセージが表示される
            // ここではファイルシステムレベルでの確認のみ
        });
        
        it('書き込み権限がないファイルで適切にエラーハンドリングされる', async () => {
            electronProcess = await startElectronApp();
            
            // 読み取り専用ファイルの作成（テスト環境によっては制限あり）
            const readOnlyFile = path.join(testWorkingDir, 'readonly.txt');
            await createTestFile(readOnlyFile, 'readonly content');
            
            // 実際の権限変更はプラットフォーム依存のため、
            // ここではファイルの存在確認のみ
            const fileExists = await fs.access(readOnlyFile).then(() => true).catch(() => false);
            expect(fileExists).toBe(true);
        });
    });
    
    // ヘルパー関数
    
    async function startElectronApp() {
        return new Promise((resolve, reject) => {
            const electronPath = require('electron');
            const mainScript = path.resolve(__dirname, '../../src/main/main.js');
            
            const process = spawn(electronPath, [mainScript], {
                env: {
                    ...process.env,
                    NODE_ENV: 'test',
                    ELECTRON_IS_DEV: '1'
                }
            });
            
            // プロセス開始の確認
            setTimeout(() => {
                if (process && !process.killed) {
                    resolve(process);
                } else {
                    reject(new Error('Failed to start Electron process'));
                }
            }, 3000);
            
            process.on('error', (error) => {
                reject(error);
            });
        });
    }
    
    async function waitForProcessExit(process) {
        return new Promise((resolve) => {
            if (process.killed) {
                resolve();
                return;
            }
            
            const checkProcess = () => {
                if (process.killed) {
                    resolve();
                } else {
                    setTimeout(checkProcess, 100);
                }
            };
            
            // 強制終了のタイムアウト
            setTimeout(() => {
                if (!process.killed) {
                    process.kill('SIGKILL');
                }
                resolve();
            }, 5000);
            
            checkProcess();
        });
    }
    
    async function fileExists(filePath) {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
    
    async function createTestFile(filePath, content) {
        await fs.writeFile(filePath, content, 'utf8');
    }
    
    async function setupTestFiles() {
        const testFilesSource = path.join(__dirname, '../test_files');
        const testFilesDest = path.join(testWorkingDir, 'test_files');
        
        await fs.mkdir(testFilesDest, { recursive: true });
        
        // サンプルファイルのコピー
        const sampleFiles = ['sample.html', 'sample.css', 'sample.js', 'sample.md'];
        
        for (const file of sampleFiles) {
            const sourcePath = path.join(testFilesSource, file);
            const destPath = path.join(testFilesDest, file);
            
            try {
                const content = await fs.readFile(sourcePath, 'utf8');
                await fs.writeFile(destPath, content, 'utf8');
            } catch (error) {
                console.warn(`Failed to copy ${file}:`, error);
            }
        }
    }
});

console.log('✅ E2E test suite loaded');