/**
 * 基本的なテスト - Jest設定の動作確認
 */

describe('Basic Test Suite', () => {
    
    it('Jest is working correctly', () => {
        expect(true).toBe(true);
    });
    
    it('Test utilities are available', () => {
        expect(global.testUtils).toBeDefined();
        expect(global.testUtils.createMockConfig).toBeDefined();
        expect(global.testUtils.waitFor).toBeDefined();
    });
    
    it('Mock Electron is available', () => {
        expect(global.mockElectron).toBeDefined();
        expect(global.mockElectron.app).toBeDefined();
        expect(global.mockElectron.ipcMain).toBeDefined();
    });
    
    it('Mock FS is available', () => {
        expect(global.mockFs).toBeDefined();
        expect(global.mockFs.promises).toBeDefined();
    });
    
    it('Can create test config', () => {
        const config = global.testUtils.createMockConfig();
        expect(config).toBeDefined();
        expect(config.app_info).toBeDefined();
        expect(config.replacements).toBeDefined();
        expect(config.target_settings).toBeDefined();
    });
    
    it('Async utilities work', async () => {
        const start = Date.now();
        await global.testUtils.waitFor(100);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(90);
    });
});

console.log('✅ Basic test suite loaded');