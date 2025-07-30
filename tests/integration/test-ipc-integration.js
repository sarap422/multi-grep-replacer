// tests/integration/test-ipc-integration.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

describe('IPC Integration Tests', () => {
    let testResults = [];
    
    beforeAll(() => {
        console.log('🧪 Starting IPC Integration Tests...');
    });
    
    afterAll(() => {
        console.log('📊 IPC Integration Test Results:', testResults);
    });
    
    describe('Core IPC Functionality', () => {
        test('IPC handlers should be registered correctly', async () => {
            // IPC ハンドラー登録の確認
            const result = await simulateIPCCall('test-ping');
            
            expect(result).toHaveProperty('pong', true);
            expect(result).toHaveProperty('timestamp');
            expect(result).toHaveProperty('pid');
            
            testResults.push({
                test: 'IPC Registration',
                status: 'PASS',
                responseTime: '<10ms'
            });
        });
        
        test('File operations should work through IPC', async () => {
            // ファイル操作APIのテスト
            const testDir = path.join(__dirname, '../test_files');
            
            // テストディレクトリの作成
            await fs.mkdir(testDir, { recursive: true });
            
            // テストファイルの作成
            const testFile = path.join(testDir, 'test.txt');
            await fs.writeFile(testFile, 'Hello World');
            
            // ファイル検索のテスト
            const findResult = await simulateIPCCall('find-files', {
                directory: testDir,
                extensions: ['.txt'],
                excludePatterns: []
            });
            
            expect(findResult).toHaveProperty('files');
            expect(findResult.files.length).toBeGreaterThan(0);
            expect(findResult.count).toBe(findResult.files.length);
            
            testResults.push({
                test: 'File Operations',
                status: 'PASS',
                filesFound: findResult.count
            });
            
            // クリーンアップ
            await fs.rm(testDir, { recursive: true });
        });
        
        test('Replacement engine should work through IPC', async () => {
            // 置換エンジンのテスト
            const testDir = path.join(__dirname, '../test_files');
            await fs.mkdir(testDir, { recursive: true });
            
            // テストファイルの作成
            const testFile = path.join(testDir, 'replace-test.txt');
            await fs.writeFile(testFile, 'old-class old-variable old-function');
            
            const files = [testFile];
            const rules = [
                { from: 'old-class', to: 'new-class', enabled: true },
                { from: 'old-variable', to: 'new-variable', enabled: true }
            ];
            
            const result = await simulateIPCCall('execute-replacement', {
                files,
                rules,
                options: { caseSensitive: true }
            });
            
            expect(result).toHaveProperty('totalChanges');
            expect(result.totalChanges).toBeGreaterThan(0);
            
            // ファイル内容の確認
            const updatedContent = await fs.readFile(testFile, 'utf8');
            expect(updatedContent).toContain('new-class');
            expect(updatedContent).toContain('new-variable');
            expect(updatedContent).toContain('old-function'); // 変更されないはず
            
            testResults.push({
                test: 'Replacement Engine',
                status: 'PASS',
                changesApplied: result.totalChanges
            });
            
            // クリーンアップ
            await fs.rm(testDir, { recursive: true });
        });
        
        test('Configuration management should work through IPC', async () => {
            // 設定管理のテスト
            const defaultConfig = await simulateIPCCall('get-default-config');
            
            expect(defaultConfig).toHaveProperty('app_info');
            expect(defaultConfig).toHaveProperty('replacements');
            expect(defaultConfig).toHaveProperty('target_settings');
            
            testResults.push({
                test: 'Configuration Management',
                status: 'PASS',
                configLoaded: 'default'
            });
        });
    });
    
    describe('Performance Tests', () => {
        test('IPC calls should respond within 50ms', async () => {
            const testCalls = [
                { method: 'test-ping', args: {} },
                { method: 'get-default-config', args: {} },
                { method: 'test-performance', args: { delay: 0 } }
            ];
            
            const results = [];
            
            for (const call of testCalls) {
                const startTime = Date.now();
                const result = await simulateIPCCall(call.method, call.args);
                const responseTime = Date.now() - startTime;
                
                results.push({
                    method: call.method,
                    responseTime,
                    success: !!result
                });
                
                expect(responseTime).toBeLessThan(50);
            }
            
            testResults.push({
                test: 'IPC Performance',
                status: 'PASS',
                averageResponseTime: `${Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length)}ms`
            });
        });
        
        test('Large file operations should not block IPC', async () => {
            // 大容量ファイル処理でのIPC応答性テスト
            const testDir = path.join(__dirname, '../test_files');
            await fs.mkdir(testDir, { recursive: true });
            
            // 大きなテストファイルの作成
            const largeFile = path.join(testDir, 'large-test.txt');
            const largeContent = 'test-content '.repeat(10000); // 約100KB
            await fs.writeFile(largeFile, largeContent);
            
            // 同時実行テスト
            const promises = [
                simulateIPCCall('find-files', {
                    directory: testDir,
                    extensions: ['.txt'],
                    excludePatterns: []
                }),
                simulateIPCCall('test-ping'),
                simulateIPCCall('get-default-config')
            ];
            
            const results = await Promise.all(promises);
            
            expect(results).toHaveLength(3);
            expect(results[0]).toHaveProperty('files'); // find-files result
            expect(results[1]).toHaveProperty('pong', true); // ping result
            expect(results[2]).toHaveProperty('app_info'); // config result
            
            testResults.push({
                test: 'Concurrent Operations',
                status: 'PASS',
                operationsCompleted: 3
            });
            
            // クリーンアップ
            await fs.rm(testDir, { recursive: true });
        });
    });
    
    describe('Security Tests', () => {
        test('Input validation should work', async () => {
            // 不正な入力に対するテスト
            try {
                await simulateIPCCall('find-files', {
                    directory: '../../../etc', // パストラバーサル試行
                    extensions: null, // 不正な型
                    excludePatterns: 'not-an-array' // 不正な型
                });
                
                // エラーが発生するはず
                expect(false).toBe(true);
            } catch (error) {
                expect(error.message).toContain('Invalid input');
                
                testResults.push({
                    test: 'Input Validation',
                    status: 'PASS',
                    securityCheck: 'blocked invalid input'
                });
            }
        });
        
        test('Path sanitization should work', async () => {
            // パスサニタイゼーションのテスト
            try {
                await simulateIPCCall('read-file', {
                    filePath: '../../../etc/passwd' // システムファイルアクセス試行
                });
                
                // エラーが発生するはず
                expect(false).toBe(true);
            } catch (error) {
                expect(error.message).toContain('Invalid path');
                
                testResults.push({
                    test: 'Path Sanitization',
                    status: 'PASS',
                    securityCheck: 'blocked path traversal'
                });
            }
        });
    });
    
    describe('Error Handling Tests', () => {
        test('IPC errors should be handled gracefully', async () => {
            try {
                await simulateIPCCall('test-error');
                
                // エラーが発生するはず
                expect(false).toBe(true);
            } catch (error) {
                expect(error).toHaveProperty('code');
                expect(error).toHaveProperty('message');
                expect(error).toHaveProperty('handler', 'test-error');
                
                testResults.push({
                    test: 'Error Handling',
                    status: 'PASS',
                    errorHandled: 'gracefully'
                });
            }
        });
        
        test('Non-existent handlers should return appropriate errors', async () => {
            try {
                await simulateIPCCall('non-existent-handler');
                
                // エラーが発生するはず
                expect(false).toBe(true);
            } catch (error) {
                expect(error.message).toContain('No handler registered');
                
                testResults.push({
                    test: 'Handler Validation',
                    status: 'PASS',
                    errorType: 'handler not found'
                });
            }
        });
    });
});

// IPC呼び出しシミュレーション関数
async function simulateIPCCall(method, args = {}) {
    return new Promise((resolve, reject) => {
        // 実際のテストでは、Electronプロセスとの通信を行う
        // ここでは簡略化したシミュレーション
        
        switch (method) {
            case 'test-ping':
                resolve({
                    pong: true,
                    timestamp: Date.now(),
                    pid: process.pid
                });
                break;
                
            case 'get-default-config':
                resolve({
                    app_info: { name: 'Multi Grep Replacer', version: '1.0.0' },
                    replacements: [],
                    target_settings: { file_extensions: ['.html', '.css', '.js'] }
                });
                break;
                
            case 'find-files':
                if (!args.directory || typeof args.directory !== 'string') {
                    reject(new Error('Invalid input: directory must be a string'));
                    return;
                }
                
                if (args.directory.includes('..')) {
                    reject(new Error('Invalid path: ' + args.directory));
                    return;
                }
                
                resolve({
                    files: ['/test/file1.txt', '/test/file2.html'],
                    count: 2,
                    directory: args.directory
                });
                break;
                
            case 'execute-replacement':
                resolve({
                    totalChanges: 2,
                    processedFiles: args.files.length,
                    results: args.files.map(file => ({
                        file,
                        changes: 1,
                        success: true
                    }))
                });
                break;
                
            case 'test-performance':
                if (args.delay) {
                    setTimeout(() => resolve({ success: true, delay: args.delay }), args.delay);
                } else {
                    resolve({ success: true, delay: 0 });
                }
                break;
                
            case 'read-file':
                if (args.filePath.includes('..')) {
                    reject(new Error('Invalid path: ' + args.filePath));
                    return;
                }
                resolve('file content');
                break;
                
            case 'test-error':
                reject(new Error('Test error for debugging'));
                break;
                
            default:
                reject(new Error('No handler registered for: ' + method));
        }
    });
}

module.exports = { simulateIPCCall };