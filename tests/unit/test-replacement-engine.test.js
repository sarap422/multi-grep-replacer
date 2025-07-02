/**
 * ReplacementEngine統合テスト
 * Task 2.2で実装した置換エンジンの包括的テスト
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// テスト対象クラス
const ReplacementEngine = require('../../src/main/replacement-engine');
const ReplacementProcessor = require('../../src/main/replacement-processor');
const ReplacementPreview = require('../../src/main/replacement-preview');

describe('ReplacementEngine Comprehensive Tests', () => {
    let testDir;
    let testFiles;
    let engine;

    beforeAll(async () => {
        // テストディレクトリ作成
        testDir = path.join(os.tmpdir(), `mgr_replacement_test_${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
        
        // テストファイル作成
        testFiles = [
            {
                name: 'test1.txt',
                content: 'Hello world\nThis is old-class and oldVariable\nAnother old-class here.',
                expected: 'Hi world\nThis is new-class and newVariable\nAnother new-class here.'
            },
            {
                name: 'test2.js',
                content: 'const oldVariable = "test";\nconsole.log(oldVariable);\nold-class styling',
                expected: 'const newVariable = "test";\nconsole.log(newVariable);\nnew-class styling'
            },
            {
                name: 'test3.html',
                content: '<div class="old-class">Content</div>\n<span class="old-class">More</span>',
                expected: '<div class="new-class">Content</div>\n<span class="new-class">More</span>'
            }
        ];

        for (const testFile of testFiles) {
            const filePath = path.join(testDir, testFile.name);
            await fs.writeFile(filePath, testFile.content, 'utf8');
        }

        console.log(`✅ テスト環境構築完了: ${testDir}`);
    });

    afterAll(async () => {
        // テストファイルクリーンアップ
        try {
            await fs.rm(testDir, { recursive: true, force: true });
            console.log(`🧹 テスト環境クリーンアップ完了`);
        } catch (error) {
            console.warn(`⚠️ クリーンアップエラー:`, error.message);
        }
    });

    beforeEach(() => {
        // テスト用置換ルール
        const rules = [
            {
                id: 'rule1',
                from: 'old-class',
                to: 'new-class',
                enabled: true,
                caseSensitive: true,
                wholeWord: false
            },
            {
                id: 'rule2',
                from: 'oldVariable',
                to: 'newVariable',
                enabled: true,
                caseSensitive: true,
                wholeWord: true
            },
            {
                id: 'rule3',
                from: 'Hello',
                to: 'Hi',
                enabled: true,
                caseSensitive: true,
                wholeWord: true
            }
        ];

        engine = new ReplacementEngine(rules, {
            useWorkerThreads: false, // テスト環境では無効
            enablePerformanceMonitoring: true,
            dryRun: false
        });
    });

    afterEach(() => {
        if (engine) {
            engine.removeAllListeners();
        }
    });

    describe('ReplacementProcessor 基本機能', () => {
        let processor;

        beforeEach(() => {
            processor = new ReplacementProcessor({
                caseSensitive: true,
                wholeWord: false
            });
        });

        it('単一ルールの置換が正常に動作する', () => {
            const content = 'This is old-class content with old-class again';
            const rule = {
                from: 'old-class',
                to: 'new-class',
                enabled: true,
                caseSensitive: true
            };

            const result = processor.applyRule(content, rule);
            
            expect(result.content).toBe('This is new-class content with new-class again');
            expect(result.replacements).toBe(2);
            expect(result.changes).toHaveLength(2);
        });

        it('複数ルールの順次適用が動作する', () => {
            const content = 'old-class and oldVariable test';
            const rules = [
                { from: 'old-class', to: 'new-class', enabled: true },
                { from: 'oldVariable', to: 'newVariable', enabled: true }
            ];

            const result = processor.applyRules(content, rules);
            
            expect(result.content).toBe('new-class and newVariable test');
            expect(result.totalReplacements).toBe(2);
            expect(result.changes).toHaveLength(2);
        });

        it('大文字小文字区別設定が動作する', () => {
            const content = 'Test and test content';
            const rule = {
                from: 'test',
                to: 'demo',
                enabled: true,
                caseSensitive: false
            };

            const result = processor.applyRule(content, rule);
            
            expect(result.content).toBe('demo and demo content');
            expect(result.replacements).toBe(2);
        });

        it('単語境界設定が動作する', () => {
            const content = 'test testing tested';
            const rule = {
                from: 'test',
                to: 'demo',
                enabled: true,
                wholeWord: true
            };

            const result = processor.applyRule(content, rule);
            
            expect(result.content).toBe('demo testing tested');
            expect(result.replacements).toBe(1);
        });

        it('無効なルールはスキップされる', () => {
            const content = 'test content';
            const rule = {
                from: 'test',
                to: 'demo',
                enabled: false
            };

            const result = processor.applyRule(content, rule);
            
            expect(result.content).toBe('test content');
            expect(result.replacements).toBe(0);
        });
    });

    describe('ReplacementEngine 統合機能', () => {
        it('単一ファイル処理が正常に動作する', async () => {
            const filePath = path.join(testDir, 'test1.txt');
            
            const result = await engine.processFile(filePath);
            
            expect(result.success).toBe(true);
            expect(result.modified).toBe(true);
            expect(result.stats.totalReplacements).toBeGreaterThan(0);
            
            // ファイル内容確認
            const updatedContent = await fs.readFile(filePath, 'utf8');
            expect(updatedContent).toContain('new-class');
            expect(updatedContent).toContain('newVariable');
            expect(updatedContent).toContain('Hi world');
        });

        it('複数ファイルのバッチ処理が動作する', async () => {
            const filePaths = testFiles.map(file => path.join(testDir, file.name));
            
            const result = await engine.processBatch(filePaths);
            
            expect(result.summary.processedFiles).toBe(3);
            expect(result.summary.modifiedFiles).toBe(3);
            expect(result.summary.errorFiles).toBe(0);
            expect(result.summary.totalReplacements).toBeGreaterThan(0);
            
            // 全ファイルの内容確認
            for (const filePath of filePaths) {
                const content = await fs.readFile(filePath, 'utf8');
                expect(content).not.toContain('old-class');
                expect(content).not.toContain('oldVariable');
            }
        });

        it('進捗通知が正常に動作する', async () => {
            const filePaths = testFiles.map(file => path.join(testDir, file.name));
            const progressEvents = [];
            
            const progressCallback = (progress) => {
                progressEvents.push(progress);
            };
            
            await engine.processBatch(filePaths, progressCallback);
            
            expect(progressEvents.length).toBeGreaterThan(0);
            expect(progressEvents[progressEvents.length - 1].current).toBe(3);
            expect(progressEvents[progressEvents.length - 1].total).toBe(3);
        });

        it('ドライランモードが動作する', async () => {
            const filePath = path.join(testDir, 'test1.txt');
            const originalContent = await fs.readFile(filePath, 'utf8');
            
            // ドライラン用エンジン作成
            const dryRunEngine = new ReplacementEngine(engine.rules, {
                dryRun: true,
                useWorkerThreads: false
            });
            
            const result = await dryRunEngine.processFile(filePath);
            
            expect(result.success).toBe(true);
            expect(result.dryRun).toBe(true);
            expect(result.modified).toBe(true);
            
            // ファイルが実際には変更されていないことを確認
            const unchangedContent = await fs.readFile(filePath, 'utf8');
            expect(unchangedContent).toBe(originalContent);
        });

        it('エラーハンドリングが適切に動作する', async () => {
            const nonExistentPath = path.join(testDir, 'nonexistent.txt');
            
            const result = await engine.processFile(nonExistentPath);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.filePath).toBe(nonExistentPath);
        });
    });

    describe('ReplacementPreview プレビュー機能', () => {
        let preview;

        beforeEach(() => {
            preview = new ReplacementPreview({
                maxPreviewFiles: 10,
                maxChangesPerFile: 5,
                contextLines: 2
            });
        });

        it('基本プレビュー生成が動作する', async () => {
            const filePaths = [path.join(testDir, 'test1.txt')];
            
            const result = await preview.generateComprehensivePreview(filePaths, engine.rules);
            
            expect(result.overview.totalFiles).toBe(1);
            expect(result.overview.affectedFiles).toBeGreaterThan(0);
            expect(result.overview.totalChanges).toBeGreaterThan(0);
            expect(result.fileChanges).toHaveLength(1);
            expect(result.ruleAnalysis).toHaveLength(engine.rules.length);
        });

        it('リスク分析が動作する', async () => {
            const filePaths = testFiles.map(file => path.join(testDir, file.name));
            
            const result = await preview.generateComprehensivePreview(filePaths, engine.rules);
            
            expect(result.riskAnalysis).toBeDefined();
            expect(result.riskAnalysis.level).toMatch(/^(low|medium|high)$/);
            expect(Array.isArray(result.riskAnalysis.factors)).toBe(true);
            expect(Array.isArray(result.riskAnalysis.warnings)).toBe(true);
        });

        it('推奨事項が生成される', async () => {
            const filePaths = testFiles.map(file => path.join(testDir, file.name));
            
            const result = await preview.generateComprehensivePreview(filePaths, engine.rules);
            
            expect(Array.isArray(result.recommendations)).toBe(true);
        });

        it('処理時間推定が動作する', async () => {
            const filePaths = [path.join(testDir, 'test1.txt')];
            
            const result = await preview.generateComprehensivePreview(filePaths, engine.rules);
            
            expect(result.overview.estimatedTime).toBeGreaterThan(0);
            expect(typeof result.overview.estimatedTime).toBe('number');
        });
    });

    describe('エラーケースとエッジケース', () => {
        it('空のルール配列でエラーが発生する', () => {
            expect(() => {
                new ReplacementEngine([]);
            }).toThrow();
        });

        it('無効なルール形式でエラーが発生する', () => {
            expect(() => {
                new ReplacementEngine([
                    { from: '', to: 'test' } // 空のfrom
                ]);
            }).toThrow();
        });

        it('処理中断機能が動作する', async () => {
            const filePaths = testFiles.map(file => path.join(testDir, file.name));
            
            // 処理開始
            const processPromise = engine.processBatch(filePaths);
            
            // すぐにキャンセル
            setTimeout(() => {
                engine.cancel();
            }, 10);
            
            const result = await processPromise;
            
            expect(result.cancelled).toBe(true);
        });

        it('大きなファイルでもメモリ効率的に処理される', async () => {
            // 大きなテストファイル作成（1MB）
            const largeContent = 'old-class '.repeat(100000);
            const largeFilePath = path.join(testDir, 'large.txt');
            await fs.writeFile(largeFilePath, largeContent, 'utf8');
            
            const beforeMemory = process.memoryUsage().heapUsed;
            
            const result = await engine.processFile(largeFilePath);
            
            const afterMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = afterMemory - beforeMemory;
            
            expect(result.success).toBe(true);
            expect(result.modified).toBe(true);
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以内
            
            // クリーンアップ
            await fs.unlink(largeFilePath);
        });
    });

    describe('パフォーマンス要件確認', () => {
        it('UI応答性要件（100ms以内）を満たす', async () => {
            const filePath = path.join(testDir, 'test1.txt');
            
            const startTime = Date.now();
            const result = await engine.processFile(filePath);
            const endTime = Date.now();
            
            const processingTime = endTime - startTime;
            
            expect(result.success).toBe(true);
            expect(processingTime).toBeLessThan(100); // 100ms以内
        });

        it('複数ファイル処理が効率的である', async () => {
            const filePaths = testFiles.map(file => path.join(testDir, file.name));
            
            const startTime = Date.now();
            const result = await engine.processBatch(filePaths);
            const endTime = Date.now();
            
            const totalTime = endTime - startTime;
            const timePerFile = totalTime / filePaths.length;
            
            expect(result.summary.processedFiles).toBe(filePaths.length);
            expect(timePerFile).toBeLessThan(1000); // 1秒/ファイル以内
        });
    });

    describe('FileOperations統合確認', () => {
        it('FileOperationsの高度な機能が使用される', async () => {
            const filePaths = testFiles.map(file => path.join(testDir, file.name));
            
            // システム情報取得
            const systemInfo = engine.fileOps.getSystemInfo();
            expect(systemInfo).toBeDefined();
            expect(systemInfo.fileSystemUtils).toBeDefined();
            
            // バッチ処理でFileOperationsが活用される
            const result = await engine.processBatch(filePaths);
            expect(result.performance).toBeDefined();
        });

        it('パフォーマンス監視が統合されている', async () => {
            const filePath = path.join(testDir, 'test1.txt');
            
            await engine.processFile(filePath);
            
            // パフォーマンス監視機能の確認
            const report = engine.fileOps.performanceMonitor.generateReport();
            expect(report).toBeDefined();
            expect(report.systemInfo).toBeDefined();
        });
    });
});

console.log('✅ ReplacementEngine包括的テストスイート読み込み完了');