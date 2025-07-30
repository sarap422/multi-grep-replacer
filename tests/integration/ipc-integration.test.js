// tests/integration/ipc-integration.test.js
const { simulateIPCCall } = require('./test-ipc-integration');
const fs = require('fs').promises;
const path = require('path');

describe('IPC Integration Tests', () => {
    let testResults = [];
    
    beforeAll(() => {
        console.log('🧪 Starting IPC Integration Tests...');
    });
    
    afterAll(() => {
        console.log('📊 IPC Integration Test Results Summary:');
        testResults.forEach(result => {
            console.log(`  ✅ ${result.test}: ${result.status}`);
        });
    });
    
    describe('Core IPC Functionality', () => {
        test('IPC handlers should be registered correctly', async () => {
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
            const testDir = path.join(__dirname, '../test_files');
            
            try {
                await fs.mkdir(testDir, { recursive: true });
                
                const testFile = path.join(testDir, 'test.txt');
                await fs.writeFile(testFile, 'Hello World');
                
                const findResult = await simulateIPCCall('find-files', {
                    directory: testDir,
                    extensions: ['.txt'],
                    excludePatterns: []
                });
                
                expect(findResult).toHaveProperty('files');
                expect(findResult).toHaveProperty('count');
                expect(findResult.count).toBe(findResult.files.length);
                
                testResults.push({
                    test: 'File Operations',
                    status: 'PASS',
                    filesFound: findResult.count
                });
            } finally {
                try {
                    await fs.rm(testDir, { recursive: true, force: true });
                } catch (e) {
                    // クリーンアップエラーは無視
                }
            }
        });
        
        test('Replacement engine should work through IPC', async () => {
            const files = ['/test/file.txt'];
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
            expect(result).toHaveProperty('processedFiles');
            expect(result.processedFiles).toBe(files.length);
            
            testResults.push({
                test: 'Replacement Engine',
                status: 'PASS',
                changesApplied: result.totalChanges
            });
        });
        
        test('Configuration management should work through IPC', async () => {
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
    });
    
    describe('Security Tests', () => {
        test('Input validation should work', async () => {
            await expect(
                simulateIPCCall('find-files', {
                    directory: '../../../etc',
                    extensions: null,
                    excludePatterns: 'not-an-array'
                })
            ).rejects.toThrow('Invalid input');
            
            testResults.push({
                test: 'Input Validation',
                status: 'PASS',
                securityCheck: 'blocked invalid input'
            });
        });
        
        test('Path sanitization should work', async () => {
            await expect(
                simulateIPCCall('read-file', {
                    filePath: '../../../etc/passwd'
                })
            ).rejects.toThrow('Invalid path');
            
            testResults.push({
                test: 'Path Sanitization',
                status: 'PASS',
                securityCheck: 'blocked path traversal'
            });
        });
    });
    
    describe('Error Handling Tests', () => {
        test('IPC errors should be handled gracefully', async () => {
            await expect(
                simulateIPCCall('test-error')
            ).rejects.toThrow('Test error for debugging');
            
            testResults.push({
                test: 'Error Handling',
                status: 'PASS',
                errorHandled: 'gracefully'
            });
        });
        
        test('Non-existent handlers should return appropriate errors', async () => {
            await expect(
                simulateIPCCall('non-existent-handler')
            ).rejects.toThrow('No handler registered');
            
            testResults.push({
                test: 'Handler Validation',
                status: 'PASS',
                errorType: 'handler not found'
            });
        });
    });
});