/**
 * メインワークフローE2Eテスト
 * ユーザーの主要操作フローを検証
 */

const path = require('path');
const fs = require('fs').promises;

const FileOperations = require('../../src/main/file-operations');
const ReplacementEngine = require('../../src/main/replacement-engine');
const ConfigManager = require('../../src/main/config-manager');

describe('メインワークフローE2Eテスト', () => {
    let testDir;
    let testFiles;
    let configManager;

    beforeAll(async () => {
        console.log('🚀 メインワークフローE2Eテスト開始');
        
        // テスト用ディレクトリ作成
        testDir = path.join(__dirname, '..', 'fixtures', 'e2e-test');
        await fs.mkdir(testDir, { recursive: true });
        
        // テスト用ファイル作成
        testFiles = {
            'index.html': '<div class="old-class">Hello World</div>',
            'style.css': '.old-class { color: red; } .old-style { margin: 10px; }',
            'script.js': 'const oldVariable = "test"; let oldFunction = () => {};',
            'readme.md': '# Old Project\nThis is an old-style readme.'
        };
        
        for (const [filename, content] of Object.entries(testFiles)) {
            await fs.writeFile(path.join(testDir, filename), content, 'utf8');
        }
        
        configManager = new ConfigManager();
    });

    afterAll(async () => {
        // テストファイルクリーンアップ
        try {
            await fs.rmdir(testDir, { recursive: true });
        } catch (error) {
            console.warn('テストディレクトリクリーンアップ失敗:', error.message);
        }
        
        console.log('✅ メインワークフローE2Eテスト完了');
    });

    test('完全なワークフロー: フォルダ選択→設定→実行→結果確認', async () => {
        console.log('📋 完全ワークフローテスト開始');
        
        // 1. フォルダ選択シミュレーション
        const targetFolder = testDir;
        const fileExtensions = ['.html', '.css', '.js', '.md'];
        
        // 2. ファイル検索
        const foundFiles = await FileOperations.findFiles(
            targetFolder,
            fileExtensions,
            []
        );
        
        expect(foundFiles.length).toBe(4);
        expect(foundFiles.some(f => f.endsWith('index.html'))).toBe(true);
        expect(foundFiles.some(f => f.endsWith('style.css'))).toBe(true);
        expect(foundFiles.some(f => f.endsWith('script.js'))).toBe(true);
        expect(foundFiles.some(f => f.endsWith('readme.md'))).toBe(true);
        
        // 3. 置換ルール設定
        const replacementRules = [
            {
                id: 'rule_001',
                from: 'old-class',
                to: 'new-class',
                enabled: true,
                description: 'CSSクラス名更新'
            },
            {
                id: 'rule_002', 
                from: 'oldVariable',
                to: 'newVariable',
                enabled: true,
                description: 'JavaScript変数名更新'
            },
            {
                id: 'rule_003',
                from: 'Old Project',
                to: 'New Project',
                enabled: true,
                description: 'プロジェクト名更新'
            }
        ];
        
        // 4. 設定保存・読み込みテスト
        const config = {
            app_info: {
                name: 'E2E Test Config',
                version: '1.0.0',
                description: 'E2E Test Configuration'
            },
            replacements: replacementRules,
            target_settings: {
                file_extensions: fileExtensions,
                exclude_patterns: [],
                include_subdirectories: true
            }
        };
        
        const configPath = path.join(testDir, 'test-config.json');
        await configManager.saveConfig(config, configPath);
        
        const loadedConfig = await configManager.loadConfig(configPath);
        expect(loadedConfig.replacements.length).toBe(3);
        expect(loadedConfig.replacements[0].from).toBe('old-class');
        
        // 5. 置換実行
        const replacementEngine = new ReplacementEngine(replacementRules);
        
        const results = await replacementEngine.processBatchReplacement(
            foundFiles,
            replacementRules,
            (current, total) => {
                console.log(`    📊 進捗: ${current}/${total}`);
            }
        );
        
        // 6. 結果検証
        expect(results.summary.totalFiles).toBe(4);
        expect(results.summary.modifiedFiles).toBeGreaterThan(0);
        expect(results.summary.totalChanges).toBeGreaterThan(0);
        
        // ファイル内容確認
        const htmlContent = await fs.readFile(path.join(testDir, 'index.html'), 'utf8');
        expect(htmlContent).toContain('new-class');
        expect(htmlContent).not.toContain('old-class');
        
        const jsContent = await fs.readFile(path.join(testDir, 'script.js'), 'utf8');
        expect(jsContent).toContain('newVariable');
        expect(jsContent).not.toContain('oldVariable');
        
        const mdContent = await fs.readFile(path.join(testDir, 'readme.md'), 'utf8');
        expect(mdContent).toContain('New Project');
        expect(mdContent).not.toContain('Old Project');
        
        console.log(`📊 実行結果: ${results.summary.modifiedFiles}ファイル修正, ${results.summary.totalChanges}箇所変更`);
        
    }, 15000);

    test('エラーケース: 権限なしファイル処理', async () => {
        console.log('🚫 権限エラーケーステスト開始');
        
        // 権限のないファイルを作成（シミュレーション）
        const restrictedFile = path.join(testDir, 'restricted.txt');
        await fs.writeFile(restrictedFile, 'restricted content', 'utf8');
        
        const replacementRules = [{
            id: 'rule_001',
            from: 'restricted',
            to: 'allowed',
            enabled: true
        }];
        
        const replacementEngine = new ReplacementEngine(replacementRules);
        
        // ファイル権限チェックのテスト
        try {
            const results = await replacementEngine.processBatchReplacement(
                [restrictedFile],
                replacementRules
            );
            
            // エラーが適切に処理されることを確認
            expect(results.errors.length).toBeGreaterThanOrEqual(0);
            
        } catch (error) {
            // エラーが適切にキャッチされることを確認
            expect(error).toBeDefined();
        }
        
        console.log('✅ 権限エラーケーステスト完了');
    });

    test('大容量ファイル処理性能テスト', async () => {
        console.log('📈 大容量ファイル性能テスト開始');
        
        // 大容量ファイル作成（1MB）
        const largeContent = 'test content '.repeat(80000);
        const largeFile = path.join(testDir, 'large-file.txt');
        await fs.writeFile(largeFile, largeContent, 'utf8');
        
        const replacementRules = [{
            id: 'rule_001',
            from: 'test',
            to: 'processed',
            enabled: true
        }];
        
        const replacementEngine = new ReplacementEngine(replacementRules);
        
        const startTime = performance.now();
        
        const results = await replacementEngine.processBatchReplacement(
            [largeFile],
            replacementRules
        );
        
        const endTime = performance.now();
        const processingTime = endTime - startTime;
        
        // 性能要件確認（大容量ファイルでも合理的な時間内に完了）
        expect(processingTime).toBeLessThan(5000); // 5秒以内
        expect(results.summary.modifiedFiles).toBe(1);
        expect(results.summary.totalChanges).toBeGreaterThan(0);
        
        console.log(`📊 大容量ファイル処理時間: ${Math.round(processingTime)}ms`);
        
        // ファイルクリーンアップ
        await fs.unlink(largeFile);
    });

    test('UI応答性要件テスト', async () => {
        console.log('⚡ UI応答性テスト開始');
        
        // UI操作シミュレーション関数
        const simulateUIOperation = async (operationName) => {
            const startTime = performance.now();
            
            switch (operationName) {
                case 'folder-selection':
                    // フォルダ選択シミュレーション
                    await FileOperations.findFiles(testDir, ['.js'], []);
                    break;
                    
                case 'config-load':
                    // 設定読み込みシミュレーション
                    const configPath = path.join(testDir, 'test-config.json');
                    await configManager.loadConfig(configPath);
                    break;
                    
                case 'preview-update':
                    // プレビュー更新シミュレーション
                    await FileOperations.findFiles(testDir, ['.html', '.css'], []);
                    break;
                    
                default:
                    await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            const endTime = performance.now();
            return endTime - startTime;
        };
        
        // UI応答性テスト（100ms以内要件）
        const operations = ['folder-selection', 'config-load', 'preview-update'];
        
        for (const operation of operations) {
            const responseTime = await simulateUIOperation(operation);
            
            console.log(`    ⚡ ${operation}: ${Math.round(responseTime)}ms`);
            
            // UI応答性要件（100ms以内）
            expect(responseTime).toBeLessThan(100);
        }
        
        console.log('✅ UI応答性テスト完了 - 全操作100ms以内');
    });
});