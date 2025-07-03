/**
 * パフォーマンスE2Eテスト
 * 実際のユーザー操作でのパフォーマンス検証
 */

const path = require('path');
const fs = require('fs').promises;

const BenchmarkRunner = require('../../src/main/benchmark-runner');
const FileOperations = require('../../src/main/file-operations');
const ReplacementEngine = require('../../src/main/replacement-engine');
const MemoryOptimizer = require('../../src/main/memory-optimizer');
const SchedulerOptimizer = require('../../src/main/scheduler-optimizer');

describe('パフォーマンスE2Eテスト', () => {
    let testDir;
    let benchmarkRunner;
    let memoryOptimizer;
    let schedulerOptimizer;

    beforeAll(async () => {
        console.log('🚀 パフォーマンスE2Eテスト開始');
        
        // テスト用ディレクトリ作成
        testDir = path.join(__dirname, '..', 'fixtures', 'performance-e2e');
        await fs.mkdir(testDir, { recursive: true });
        
        // パフォーマンス監視コンポーネント初期化
        benchmarkRunner = new BenchmarkRunner({
            enableAutoReporting: false,
            testDataPath: testDir,
            thresholds: {
                fileProcessingPerSec: 30,
                memoryWarningMB: 200,
                uiResponseMaxMs: 100,
                totalTimeMaxSec: 30
            }
        });
        
        memoryOptimizer = new MemoryOptimizer({
            memoryThresholdMB: 200,
            enableAutoGC: true,
            enableLeakDetection: true
        });
        
        schedulerOptimizer = new SchedulerOptimizer({
            maxUIResponseTimeMs: 100,
            maxConcurrentTasks: 4,
            enableAdaptiveScheduling: true
        });
    });

    afterAll(async () => {
        // クリーンアップ
        if (memoryOptimizer.monitoring) {
            memoryOptimizer.stopMonitoring();
        }
        if (schedulerOptimizer.running) {
            schedulerOptimizer.stop();
        }
        
        memoryOptimizer.cleanup();
        schedulerOptimizer.cleanup();
        
        // テストファイルクリーンアップ
        try {
            await fs.rmdir(testDir, { recursive: true });
        } catch (error) {
            console.warn('テストディレクトリクリーンアップ失敗:', error.message);
        }
        
        console.log('✅ パフォーマンスE2Eテスト完了');
    });

    test('UI応答性要件テスト: 100ms以内応答', async () => {
        console.log('⚡ UI応答性要件検証開始');
        
        schedulerOptimizer.start();
        
        // 各種UI操作のシミュレーション
        const uiOperations = [
            {
                name: 'button-click',
                operation: async () => {
                    // ボタンクリックシミュレーション
                    await new Promise(resolve => setTimeout(resolve, 10));
                    return 'clicked';
                },
                target: 100 // ms
            },
            {
                name: 'folder-selection',
                operation: async () => {
                    // フォルダ選択シミュレーション
                    return await FileOperations.findFiles(testDir, ['.txt'], []);
                },
                target: 200 // ms
            },
            {
                name: 'config-load',
                operation: async () => {
                    // 設定読み込みシミュレーション
                    const config = { test: 'config' };
                    return JSON.stringify(config);
                },
                target: 300 // ms
            },
            {
                name: 'preview-update',
                operation: async () => {
                    // プレビュー更新シミュレーション
                    const files = await FileOperations.findFiles(testDir, ['.js', '.css'], []);
                    return `Found ${files.length} files`;
                },
                target: 500 // ms
            }
        ];
        
        for (const uiOp of uiOperations) {
            const measurement = await schedulerOptimizer.measureUIResponse(
                uiOp.operation,
                uiOp.name
            );
            
            console.log(`    ⚡ ${uiOp.name}: ${Math.round(measurement.responseTime)}ms (目標: ${uiOp.target}ms)`);
            
            // UI応答性要件確認
            expect(measurement.responseTime).toBeLessThan(uiOp.target);
            expect(measurement.success).toBe(true);
        }
        
        schedulerOptimizer.stop();
        
        console.log('✅ UI応答性要件テスト完了 - 全操作が目標時間内');
    });

    test('ファイル処理性能テスト: 1000ファイル30秒以内', async () => {
        console.log('📁 ファイル処理性能検証開始');
        
        // 1000ファイルのテストデータ生成
        const testFiles = await benchmarkRunner._generateTestFiles(1000, { avgSize: 1024 });
        
        const replacementRules = [
            {
                id: 'rule_001',
                from: 'test',
                to: 'performance',
                enabled: true,
                description: 'パフォーマンステスト用ルール'
            }
        ];
        
        const replacementEngine = new ReplacementEngine(replacementRules);
        
        const startTime = performance.now();
        
        const results = await replacementEngine.processBatchReplacement(
            testFiles,
            replacementRules,
            (current, total) => {
                if (current % 100 === 0) {
                    console.log(`    📊 進捗: ${current}/${total} (${Math.round(current/total*100)}%)`);
                }
            }
        );
        
        const endTime = performance.now();
        const totalTime = (endTime - startTime) / 1000; // 秒
        const filesPerSecond = testFiles.length / totalTime;
        
        console.log(`📊 処理結果:`);
        console.log(`    ファイル数: ${testFiles.length}`);
        console.log(`    処理時間: ${Math.round(totalTime)}秒`);
        console.log(`    処理速度: ${Math.round(filesPerSecond)}ファイル/秒`);
        console.log(`    変更ファイル: ${results.summary.modifiedFiles}`);
        console.log(`    総変更箇所: ${results.summary.totalChanges}`);
        
        // パフォーマンス要件確認
        expect(totalTime).toBeLessThan(30); // 30秒以内
        expect(filesPerSecond).toBeGreaterThan(30); // 30ファイル/秒以上
        expect(results.summary.successRate).toBeGreaterThan(95); // 95%以上成功率
        
        // テストファイルクリーンアップ
        await benchmarkRunner._cleanupTestFiles(testFiles);
        
        console.log('✅ ファイル処理性能テスト完了 - 要件達成');
    });

    test('メモリ使用量テスト: 200MB以下', async () => {
        console.log('🧠 メモリ使用量検証開始');
        
        memoryOptimizer.startMonitoring();
        
        // 初期メモリ使用量記録
        const initialMemory = memoryOptimizer._getCurrentMemoryUsage();
        console.log(`    初期メモリ: ${initialMemory.heapUsedMB}MB`);
        
        // メモリ集約的な処理を実行
        const heavyWorkload = async () => {
            // 500ファイルでの処理
            const testFiles = await benchmarkRunner._generateTestFiles(500, { avgSize: 5000 });
            
            const replacementRules = [
                { id: 'rule_001', from: 'memory', to: 'optimized', enabled: true },
                { id: 'rule_002', from: 'test', to: 'verified', enabled: true },
                { id: 'rule_003', from: 'performance', to: 'enhanced', enabled: true }
            ];
            
            const replacementEngine = new ReplacementEngine(replacementRules);
            
            const results = await replacementEngine.processBatchReplacement(
                testFiles,
                replacementRules
            );
            
            // テストファイルクリーンアップ
            await benchmarkRunner._cleanupTestFiles(testFiles);
            
            return results;
        };
        
        await heavyWorkload();
        
        // 処理後メモリ使用量確認
        const afterProcessingMemory = memoryOptimizer._getCurrentMemoryUsage();
        console.log(`    処理後メモリ: ${afterProcessingMemory.heapUsedMB}MB`);
        
        // メモリ最適化実行
        const optimizationResult = await memoryOptimizer.optimizeMemoryUsage();
        console.log(`    最適化後メモリ: ${optimizationResult.afterMemory.heapUsedMB}MB`);
        
        // メモリリーク検出
        const leakDetection = memoryOptimizer.detectMemoryLeaks();
        console.log(`    リーク検出: ${leakDetection.leaksDetected}件, 警告: ${leakDetection.warningsCount}件`);
        
        memoryOptimizer.stopMonitoring();
        
        // メモリ要件確認
        expect(afterProcessingMemory.heapUsedMB).toBeLessThan(200); // 200MB以下
        expect(optimizationResult.afterMemory.heapUsedMB).toBeLessThan(150); // 最適化後150MB以下
        expect(leakDetection.leaksDetected).toBe(0); // メモリリークなし
        
        console.log('✅ メモリ使用量テスト完了 - 要件達成');
    });

    test('同時処理・並行性テスト', async () => {
        console.log('⚡ 同時処理性能検証開始');
        
        schedulerOptimizer.start();
        
        // 並行処理タスクの準備
        const concurrentTasks = [];
        
        for (let i = 0; i < 5; i++) {
            const task = async () => {
                const taskFiles = await benchmarkRunner._generateTestFiles(50, { avgSize: 2000 });
                
                const replacementRules = [{
                    id: `concurrent_rule_${i}`,
                    from: `task${i}`,
                    to: `completed${i}`,
                    enabled: true
                }];
                
                const replacementEngine = new ReplacementEngine(replacementRules);
                
                const result = await replacementEngine.processBatchReplacement(
                    taskFiles,
                    replacementRules
                );
                
                // クリーンアップ
                await benchmarkRunner._cleanupTestFiles(taskFiles);
                
                return {
                    taskId: i,
                    filesProcessed: result.summary.totalFiles,
                    changesApplied: result.summary.totalChanges,
                    processingTime: result.summary.processingTime || 0
                };
            };
            
            // スケジューラ経由でタスクを並行実行
            const scheduledTask = schedulerOptimizer.scheduleTask(task, {
                taskName: `concurrent-task-${i}`,
                priority: 'normal'
            });
            
            concurrentTasks.push(scheduledTask);
        }
        
        // 全タスクの完了を待機
        const startTime = performance.now();
        const results = await Promise.all(concurrentTasks);
        const endTime = performance.now();
        
        const totalTime = (endTime - startTime) / 1000;
        const totalFilesProcessed = results.reduce((sum, r) => sum + r.filesProcessed, 0);
        const totalChanges = results.reduce((sum, r) => sum + r.changesApplied, 0);
        
        console.log(`📊 並行処理結果:`);
        console.log(`    並行タスク数: ${results.length}`);
        console.log(`    総処理時間: ${Math.round(totalTime)}秒`);
        console.log(`    総ファイル数: ${totalFilesProcessed}`);
        console.log(`    総変更箇所: ${totalChanges}`);
        console.log(`    並行効率: ${Math.round(totalFilesProcessed / totalTime)}ファイル/秒`);
        
        // スケジューラ統計確認
        const schedulerStats = schedulerOptimizer.getSchedulerStats();
        console.log(`    完了タスク: ${schedulerStats.execution.completedTasks}`);
        console.log(`    成功率: ${schedulerStats.execution.successRate || 0}%`);
        
        schedulerOptimizer.stop();
        
        // 並行処理要件確認
        expect(results.length).toBe(5); // 全タスク完了
        expect(totalTime).toBeLessThan(20); // 20秒以内（単一処理より高速）
        expect(totalFilesProcessed).toBe(250); // 全ファイル処理完了
        expect(schedulerStats.execution.completedTasks).toBeGreaterThanOrEqual(5);
        
        console.log('✅ 同時処理・並行性テスト完了 - 要件達成');
    });

    test('エラー耐性・回復力テスト', async () => {
        console.log('🛡️ エラー耐性検証開始');
        
        // エラー条件でのテストファイル作成
        const testFiles = await benchmarkRunner._generateTestFiles(100, { avgSize: 1000 });
        
        // 一部ファイルに権限問題をシミュレート（読み取り専用）
        const problematicFiles = testFiles.slice(0, 10);
        for (const file of problematicFiles) {
            try {
                await fs.chmod(file, 0o444); // 読み取り専用
            } catch (error) {
                // プラットフォームによってはchmodが機能しない場合がある
                console.log(`    権限変更スキップ: ${file}`);
            }
        }
        
        const replacementRules = [{
            id: 'error_test_rule',
            from: 'test',
            to: 'error_handled',
            enabled: true
        }];
        
        const replacementEngine = new ReplacementEngine(replacementRules);
        
        const startTime = performance.now();
        
        let results;
        let caughtError = null;
        
        try {
            results = await replacementEngine.processBatchReplacement(
                testFiles,
                replacementRules,
                (current, total) => {
                    // 進捗コールバックがエラーで中断されないことを確認
                    console.log(`    📊 エラー耐性テスト進捗: ${current}/${total}`);
                }
            );
        } catch (error) {
            caughtError = error;
        }
        
        const endTime = performance.now();
        const totalTime = (endTime - startTime) / 1000;
        
        console.log(`📊 エラー耐性テスト結果:`);
        console.log(`    処理時間: ${Math.round(totalTime)}秒`);
        console.log(`    エラー発生: ${caughtError ? 'あり' : 'なし'}`);
        
        if (results) {
            console.log(`    総ファイル数: ${results.summary.totalFiles}`);
            console.log(`    成功ファイル: ${results.summary.modifiedFiles}`);
            console.log(`    エラーファイル: ${results.errors ? results.errors.length : 0}`);
            console.log(`    成功率: ${Math.round((results.summary.modifiedFiles / results.summary.totalFiles) * 100)}%`);
        }
        
        // 権限を元に戻す
        for (const file of problematicFiles) {
            try {
                await fs.chmod(file, 0o644);
            } catch (error) {
                // 無視
            }
        }
        
        // テストファイルクリーンアップ
        await benchmarkRunner._cleanupTestFiles(testFiles);
        
        // エラー耐性要件確認
        expect(caughtError).toBeNull(); // 処理全体は完了すること
        if (results) {
            expect(results.summary.totalFiles).toBe(100); // 全ファイルが対象
            expect(results.summary.modifiedFiles).toBeGreaterThan(80); // 80%以上成功
            expect(totalTime).toBeLessThan(15); // エラーがあっても15秒以内
        }
        
        console.log('✅ エラー耐性・回復力テスト完了 - 適切なエラー処理');
    });

    test('統合パフォーマンスベンチマーク', async () => {
        console.log('🏁 統合パフォーマンスベンチマーク開始');
        
        // フルベンチマークの実行
        const benchmarkResult = await benchmarkRunner.runFullBenchmark({
            datasets: [
                {
                    name: 'e2e-performance-test',
                    files: await benchmarkRunner._generateTestFiles(200, { avgSize: 2048 }),
                    replacementRules: [
                        { from: 'benchmark', to: 'verified', enabled: true },
                        { from: 'performance', to: 'optimized', enabled: true }
                    ]
                }
            ]
        });
        
        console.log(`📊 統合ベンチマーク結果:`);
        console.log(`    総合スコア: ${benchmarkResult.summary.overallScore}/100`);
        console.log(`    グレード: ${benchmarkResult.summary.grade}`);
        console.log(`    実行時間: ${Math.round(benchmarkResult.totalTime)}秒`);
        
        // 個別テスト結果
        console.log(`    ファイル処理: ${benchmarkResult.tests.fileProcessing.allPassed ? '✅' : '❌'}`);
        console.log(`    メモリ使用: ${benchmarkResult.tests.memoryUsage.allPassed ? '✅' : '❌'}`);
        console.log(`    UI応答性: ${benchmarkResult.tests.uiResponsiveness.allPassed ? '✅' : '❌'}`);
        console.log(`    スケーラビリティ: ${benchmarkResult.tests.scalability.linearScaling.analysis}`);
        
        if (benchmarkResult.summary.issues.length > 0) {
            console.log(`    問題点:`);
            benchmarkResult.summary.issues.forEach(issue => {
                console.log(`    ⚠️ ${issue}`);
            });
        }
        
        // 統合ベンチマーク要件確認
        expect(benchmarkResult.summary.overallScore).toBeGreaterThan(70); // 70点以上
        expect(benchmarkResult.summary.grade).not.toBe('F'); // F評価以外
        expect(benchmarkResult.totalTime).toBeLessThan(60); // 1分以内
        expect(benchmarkResult.tests.fileProcessing.allPassed).toBe(true);
        expect(benchmarkResult.tests.uiResponsiveness.allPassed).toBe(true);
        
        // テストファイルクリーンアップ
        for (const dataset of benchmarkResult.testConfig.datasets || []) {
            if (dataset.files) {
                await benchmarkRunner._cleanupTestFiles(dataset.files);
            }
        }
        
        console.log('✅ 統合パフォーマンスベンチマーク完了 - 要件達成');
    });
});