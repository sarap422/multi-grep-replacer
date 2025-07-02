/**
 * FileOperations拡張機能の統合テスト
 * Task 2.1で実装した高度な機能のテスト
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// テスト対象クラス
const FileOperations = require('../../src/main/file-operations');

describe('FileOperations Advanced Features', () => {
    let fileOps;
    let testDir;
    let testFiles;

    beforeAll(async () => {
        // テストディレクトリ作成
        testDir = path.join(os.tmpdir(), `mgr_test_${Date.now()}`);
        await fs.mkdir(testDir, { recursive: true });
        
        // テストファイル作成
        testFiles = [
            { name: 'small.txt', content: 'Hello World\nThis is a test file.', size: 'small' },
            { name: 'medium.js', content: 'const oldVariable = "test";\nconsole.log(oldVariable);'.repeat(100), size: 'medium' },
            { name: 'test.css', content: '.old-class { color: red; }\n.another-old { background: blue; }', size: 'small' }
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
            await fs.rmdir(testDir, { recursive: true });
            console.log(`🧹 テスト環境クリーンアップ完了`);
        } catch (error) {
            console.warn(`⚠️ クリーンアップエラー:`, error.message);
        }
    });

    beforeEach(() => {
        // 各テスト前に新しいインスタンス作成
        fileOps = new FileOperations({
            enablePerformanceMonitoring: true,
            useWorkerThreads: false, // テスト環境では無効
            useStreamProcessing: true,
            asyncBatchThreshold: 2
        });
    });

    afterEach(() => {
        // 各テスト後にクリーンアップ
        if (fileOps) {
            fileOps.cleanup();
        }
    });

    describe('高度なファイル検索機能', () => {
        it('基本的なファイル検索が動作する', async () => {
            const files = await fileOps.findFiles(testDir, [], []);
            
            expect(files).toBeDefined();
            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            
            // テストファイルが含まれているかチェック
            const fileNames = files.map(f => path.basename(f));
            expect(fileNames).toContain('small.txt');
            expect(fileNames).toContain('medium.js');
            expect(fileNames).toContain('test.css');
        });

        it('拡張子フィルタが正常に動作する', async () => {
            const jsFiles = await fileOps.findFilesAdvanced(testDir, {
                extensions: ['.js']
            });
            
            expect(jsFiles).toBeDefined();
            expect(jsFiles.length).toBe(1);
            expect(path.basename(jsFiles[0])).toBe('medium.js');
        });

        it('高度なフィルタリングが動作する', async () => {
            const filteredFiles = await fileOps.findFilesAdvanced(testDir, {
                extensions: ['.txt', '.css'],
                maxFileSize: 1000,
                includeHidden: false
            });
            
            expect(filteredFiles).toBeDefined();
            expect(filteredFiles.length).toBeGreaterThan(0);
            
            // 各ファイルが条件を満たしているかチェック
            for (const file of filteredFiles) {
                const ext = path.extname(file);
                expect(['.txt', '.css']).toContain(ext);
            }
        });
    });

    describe('統合ファイル処理機能', () => {
        it('FileSystemUtilsが正常に動作する', () => {
            const systemInfo = fileOps.fileSystemUtils.getSystemInfo();
            
            expect(systemInfo).toBeDefined();
            expect(systemInfo.platform).toBeDefined();
            expect(systemInfo.cpuCount).toBeGreaterThan(0);
            expect(systemInfo.memory).toBeDefined();
            expect(systemInfo.memory.total).toBeGreaterThan(0);
        });

        it('パフォーマンス監視が機能する', async () => {
            // 監視開始
            fileOps.performanceMonitor.startMonitoring(1);
            
            // 簡単な処理実行
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // ファイル処理記録
            fileOps.performanceMonitor.recordFileProcessed(
                'test.txt', 
                1024, 
                50
            );
            
            // 監視停止
            const stats = fileOps.performanceMonitor.stopMonitoring();
            
            expect(stats).toBeDefined();
            expect(stats.summary).toBeDefined();
            expect(stats.summary.filesProcessed).toBe(1);
        });

        it('システム情報取得が動作する', () => {
            const systemInfo = fileOps.getSystemInfo();
            
            expect(systemInfo).toBeDefined();
            expect(systemInfo.fileSystemUtils).toBeDefined();
            expect(systemInfo.processingMode).toBeDefined();
            expect(systemInfo.capabilities).toBeDefined();
            expect(systemInfo.capabilities.workerThreadsSupported).toBe(false); // テスト設定
        });
    });

    describe('単一ファイル処理', () => {
        it('小さなファイルの置換が動作する', async () => {
            const filePath = path.join(testDir, 'small.txt');
            const replacementRules = [
                {
                    enabled: true,
                    from: 'Hello',
                    to: 'Hi',
                    caseSensitive: true,
                    wholeWord: false
                }
            ];

            const result = await fileOps._processSingleFile(filePath, replacementRules);
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.filePath).toBe(filePath);
            expect(result.replacements).toBeGreaterThan(0);
            
            // ファイル内容確認
            const content = await fs.readFile(filePath, 'utf8');
            expect(content).toContain('Hi');
            expect(content).not.toContain('Hello');
        });

        it('複数の置換ルールが順次適用される', async () => {
            const filePath = path.join(testDir, 'test.css');
            const replacementRules = [
                {
                    enabled: true,
                    from: 'old-class',
                    to: 'new-class',
                    caseSensitive: true,
                    wholeWord: false
                },
                {
                    enabled: true,
                    from: 'red',
                    to: 'blue',
                    caseSensitive: true,
                    wholeWord: false
                }
            ];

            const result = await fileOps._processSingleFile(filePath, replacementRules);
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.replacements).toBeGreaterThanOrEqual(2);
            
            // ファイル内容確認
            const content = await fs.readFile(filePath, 'utf8');
            expect(content).toContain('new-class');
            expect(content).not.toContain('old-class');
        });

        it('無効なルールはスキップされる', async () => {
            const filePath = path.join(testDir, 'small.txt');
            const replacementRules = [
                {
                    enabled: false, // 無効
                    from: 'Hi',
                    to: 'Hello',
                    caseSensitive: true,
                    wholeWord: false
                },
                {
                    enabled: true,
                    from: 'test',
                    to: 'demo',
                    caseSensitive: true,
                    wholeWord: false
                }
            ];

            const result = await fileOps._processSingleFile(filePath, replacementRules);
            
            expect(result).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.replacements).toBe(1); // 有効なルールのみ実行
            
            // ファイル内容確認
            const content = await fs.readFile(filePath, 'utf8');
            expect(content).toContain('Hi'); // 無効ルールは適用されない
            expect(content).toContain('demo'); // 有効ルールは適用される
        });
    });

    describe('設定と管理機能', () => {
        it('設定更新が正常に動作する', () => {
            const initialMaxSize = fileOps.MAX_FILE_SIZE;
            
            fileOps.updateSettings({
                maxFileSize: 50 * 1024 * 1024, // 50MB
                processingMode: {
                    useWorkerThreads: true
                }
            });
            
            expect(fileOps.MAX_FILE_SIZE).toBe(50 * 1024 * 1024);
            expect(fileOps.processingMode.useWorkerThreads).toBe(true);
        });

        it('クリーンアップが正常に動作する', () => {
            // クリーンアップ実行（エラーが発生しないことを確認）
            expect(() => {
                fileOps.cleanup();
            }).not.toThrow();
        });
    });

    describe('エラーハンドリング', () => {
        it('存在しないファイルの処理でエラーが適切に処理される', async () => {
            const nonExistentFile = path.join(testDir, 'nonexistent.txt');
            const replacementRules = [
                {
                    enabled: true,
                    from: 'test',
                    to: 'demo',
                    caseSensitive: true,
                    wholeWord: false
                }
            ];

            const result = await fileOps._processSingleFile(nonExistentFile, replacementRules);
            
            expect(result).toBeDefined();
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.filePath).toBe(nonExistentFile);
        });

        it('不正なディレクトリパスでエラーが適切に処理される', async () => {
            const invalidPath = '/invalid/nonexistent/path';
            
            // 存在しないパスは空配列を返すか、エラーを発生させる
            const result = await fileOps.findFilesAdvanced(invalidPath);
            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(0);
        });
    });

    describe('パフォーマンス要件確認', () => {
        it('UI応答性要件（100ms以内）を満たす', async () => {
            const startTime = performance.now();
            
            // 簡単なファイル検索
            const files = await fileOps.findFiles(testDir, ['.txt'], []);
            
            const endTime = performance.now();
            const processingTime = endTime - startTime;
            
            expect(files).toBeDefined();
            expect(processingTime).toBeLessThan(100); // 100ms以内
        });

        it('メモリ使用量が適切である', () => {
            const beforeMemory = process.memoryUsage().heapUsed;
            
            // システム情報取得（メモリを使用する処理）
            const systemInfo = fileOps.getSystemInfo();
            
            const afterMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = afterMemory - beforeMemory;
            
            expect(systemInfo).toBeDefined();
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内の増加
        });
    });
});

console.log('✅ FileOperations拡張機能テストスイート読み込み完了');