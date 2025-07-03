const BenchmarkRunner = require('../../src/main/benchmark-runner');
const MemoryOptimizer = require('../../src/main/memory-optimizer');
const SchedulerOptimizer = require('../../src/main/scheduler-optimizer');

/**
 * パフォーマンス最適化コンポーネントのテストスイート
 */
describe('Performance Optimization Components', () => {
    let benchmarkRunner;
    let memoryOptimizer;
    let schedulerOptimizer;

    beforeEach(() => {
        benchmarkRunner = new BenchmarkRunner({
            enableAutoReporting: false,
            testDataPath: require('path').join(__dirname, '..', 'fixtures', 'benchmark-test'),
            thresholds: {
                fileProcessingPerSec: 30, // テスト用に緩い閾値
                memoryWarningMB: 100,
                uiResponseMaxMs: 200,
                totalTimeMaxSec: 60
            }
        });

        memoryOptimizer = new MemoryOptimizer({
            memoryThresholdMB: 100,
            enableAutoGC: false, // テスト用に無効化
            enableLeakDetection: false,
            gcIntervalMs: 500 // テスト用に短縮
        });

        schedulerOptimizer = new SchedulerOptimizer({
            maxUIResponseTimeMs: 200,
            maxConcurrentTasks: 2, // テスト用に制限
            enableAdaptiveScheduling: false
        });
    });

    afterEach(async () => {
        if (memoryOptimizer.monitoring) {
            memoryOptimizer.stopMonitoring();
        }
        if (schedulerOptimizer.running) {
            schedulerOptimizer.stop();
        }
        
        // クリーンアップ
        benchmarkRunner = null;
        memoryOptimizer.cleanup();
        schedulerOptimizer.cleanup();
    });

    describe('BenchmarkRunner', () => {
        test('クイックパフォーマンステストの実行', async () => {
            console.log('\n🏁 BenchmarkRunner - クイックテスト開始');
            
            const result = await benchmarkRunner.runQuickTest();
            
            expect(result).toBeDefined();
            expect(result.filesProcessed).toBeGreaterThan(0);
            expect(result.totalTime).toBeGreaterThan(0);
            expect(result.filesPerSecond).toBeGreaterThan(0);
            expect(result.memoryUsage).toBeGreaterThan(0);
            expect(typeof result.passed).toBe('boolean');
            
            console.log(`📊 クイックテスト結果: ${result.filesPerSecond}ファイル/秒, ${result.totalTime}秒`);
        }, 30000);

        test('システム情報収集', async () => {
            console.log('\n📊 BenchmarkRunner - システム情報収集');
            
            const systemInfo = await benchmarkRunner._collectSystemInfo();
            
            expect(systemInfo).toBeDefined();
            expect(systemInfo.platform).toBeDefined();
            expect(systemInfo.cpuCount).toBeGreaterThan(0);
            expect(systemInfo.totalMemoryGB).toBeGreaterThan(0);
            expect(systemInfo.nodeVersion).toBeDefined();
            
            console.log(`💻 システム: ${systemInfo.platform}, CPU: ${systemInfo.cpuCount}コア, RAM: ${systemInfo.totalMemoryGB}GB`);
        });

        test('テストファイル生成・削除', async () => {
            console.log('\n📝 BenchmarkRunner - テストファイル管理');
            
            const testFiles = await benchmarkRunner._generateTestFiles(5, { avgSize: 1024 });
            
            expect(testFiles).toBeDefined();
            expect(testFiles.length).toBe(5);
            
            // ファイル存在確認
            const fs = require('fs').promises;
            for (const filePath of testFiles) {
                const exists = await fs.access(filePath).then(() => true).catch(() => false);
                expect(exists).toBe(true);
            }
            
            // クリーンアップ
            await benchmarkRunner._cleanupTestFiles(testFiles);
            
            // ファイル削除確認
            for (const filePath of testFiles) {
                const exists = await fs.access(filePath).then(() => true).catch(() => false);
                expect(exists).toBe(false);
            }
            
            console.log(`📝 テストファイル管理: 作成・削除 ${testFiles.length}件完了`);
        });

        test('UI操作シミュレーション', async () => {
            console.log('\n🖱️ BenchmarkRunner - UI操作シミュレーション');
            
            const operations = ['button-click', 'typing', 'folder-select'];
            
            for (const operation of operations) {
                const startTime = performance.now();
                await benchmarkRunner._simulateUIOperation(operation);
                const endTime = performance.now();
                const duration = endTime - startTime;
                
                expect(duration).toBeGreaterThan(0);
                expect(duration).toBeLessThan(1000); // 1秒以内
                
                console.log(`  🖱️ ${operation}: ${Math.round(duration)}ms`);
            }
        });
    });

    describe('MemoryOptimizer', () => {
        test('メモリ監視の開始・停止', async () => {
            console.log('\n🧠 MemoryOptimizer - 監視開始・停止');
            
            expect(memoryOptimizer.monitoring).toBe(false);
            
            memoryOptimizer.startMonitoring();
            expect(memoryOptimizer.monitoring).toBe(true);
            
            // 少し待ってメモリ履歴が記録されることを確認
            await new Promise(resolve => setTimeout(resolve, 1100));
            expect(memoryOptimizer.memoryHistory.length).toBeGreaterThan(0);
            
            memoryOptimizer.stopMonitoring();
            expect(memoryOptimizer.monitoring).toBe(false);
            
            console.log(`🧠 監視結果: ${memoryOptimizer.memoryHistory.length}件のメモリ記録`);
        });

        test('メモリ使用量最適化', async () => {
            console.log('\n🚀 MemoryOptimizer - メモリ最適化');
            
            const beforeMemory = memoryOptimizer._getCurrentMemoryUsage();
            
            const optimizationResult = await memoryOptimizer.optimizeMemoryUsage({
                enableGC: false, // GCが利用できない場合のテスト
                enableHistoryCleanup: true,
                enableReferenceCleanup: true,
                enableV8Optimization: true
            });
            
            expect(optimizationResult).toBeDefined();
            expect(optimizationResult.success).toBe(true);
            expect(optimizationResult.beforeMemory).toBeDefined();
            expect(optimizationResult.afterMemory).toBeDefined();
            expect(optimizationResult.actions).toBeDefined();
            expect(Array.isArray(optimizationResult.actions)).toBe(true);
            
            console.log(`🚀 最適化結果: ${optimizationResult.beforeMemory.heapUsedMB}MB → ${optimizationResult.afterMemory.heapUsedMB}MB`);
        });

        test('メモリリーク検出', async () => {
            console.log('\n🔍 MemoryOptimizer - リーク検出');
            
            // メモリ履歴を作成（人工的に増加傾向をシミュレート）
            for (let i = 0; i < 15; i++) {
                memoryOptimizer.memoryHistory.push({
                    heapUsedMB: 50 + i * 2, // 段階的に増加
                    timestamp: performance.now() + i * 1000
                });
            }
            
            const detectionResult = memoryOptimizer.detectMemoryLeaks();
            
            expect(detectionResult).toBeDefined();
            expect(detectionResult.currentMemory).toBeDefined();
            expect(typeof detectionResult.leaksDetected).toBe('number');
            expect(typeof detectionResult.warningsCount).toBe('number');
            expect(Array.isArray(detectionResult.leaks)).toBe(true);
            expect(Array.isArray(detectionResult.warnings)).toBe(true);
            
            console.log(`🔍 リーク検出結果: ${detectionResult.leaksDetected}件のリーク, ${detectionResult.warningsCount}件の警告`);
        });

        test('メモリレポート生成', () => {
            console.log('\n📊 MemoryOptimizer - レポート生成');
            
            const report = memoryOptimizer.generateMemoryReport();
            
            expect(report).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(report.currentStatus).toBeDefined();
            expect(report.statistics).toBeDefined();
            expect(report.history).toBeDefined();
            expect(report.recommendations).toBeDefined();
            expect(report.configuration).toBeDefined();
            
            console.log(`📊 レポート生成完了: メモリ ${report.currentStatus.memory.heapUsedMB}MB`);
        });

        test('ガベージコレクション実行', () => {
            console.log('\n🧹 MemoryOptimizer - ガベージコレクション');
            
            const gcResult = memoryOptimizer.performGarbageCollection(false);
            
            expect(gcResult).toBeDefined();
            expect(typeof gcResult.success).toBe('boolean');
            expect(gcResult.beforeMemoryMB).toBeGreaterThan(0);
            
            if (gcResult.success) {
                expect(gcResult.afterMemoryMB).toBeGreaterThan(0);
                expect(gcResult.executionTimeMs).toBeGreaterThan(0);
                console.log(`🧹 GC実行: ${gcResult.beforeMemoryMB}MB → ${gcResult.afterMemoryMB}MB`);
            } else {
                console.log(`🧹 GC: ${gcResult.reason} (${gcResult.beforeMemoryMB}MB)`);
            }
        });
    });

    describe('SchedulerOptimizer', () => {
        test('スケジューラの開始・停止', async () => {
            console.log('\n⚡ SchedulerOptimizer - スケジューラ制御');
            
            expect(schedulerOptimizer.running).toBe(false);
            
            schedulerOptimizer.start();
            expect(schedulerOptimizer.running).toBe(true);
            
            // 少し待ってスケジューラが動作することを確認
            await new Promise(resolve => setTimeout(resolve, 100));
            
            schedulerOptimizer.stop();
            expect(schedulerOptimizer.running).toBe(false);
            
            console.log('⚡ スケジューラ制御: 開始・停止完了');
        });

        test('高優先度タスクのスケジューリング', async () => {
            console.log('\n🚀 SchedulerOptimizer - 高優先度タスク');
            
            schedulerOptimizer.start();
            
            const testTask = async () => {
                await new Promise(resolve => setTimeout(resolve, 50));
                return 'high-priority-result';
            };
            
            const startTime = performance.now();
            const result = await schedulerOptimizer.scheduleHighPriorityTask(testTask, {
                taskName: 'test-high-priority'
            });
            const endTime = performance.now();
            
            expect(result).toBe('high-priority-result');
            expect(endTime - startTime).toBeLessThan(200); // 200ms以内
            
            schedulerOptimizer.stop();
            
            console.log(`🚀 高優先度タスク完了: ${Math.round(endTime - startTime)}ms`);
        });

        test('バッチタスクのスケジューリング', async () => {
            console.log('\n📦 SchedulerOptimizer - バッチタスク');
            
            schedulerOptimizer.start();
            
            const workItems = Array.from({ length: 20 }, (_, i) => ({ value: i }));
            const taskFunction = async (item) => {
                await new Promise(resolve => setTimeout(resolve, 5));
                return item.value * 2;
            };
            
            let progressCount = 0;
            const results = await schedulerOptimizer.scheduleBatchTask(
                taskFunction,
                workItems,
                {
                    batchSize: 5,
                    priority: 'normal',
                    maxBatchTime: 200, // タイムアウトを延長
                    onProgress: (current, total) => {
                        progressCount++;
                        console.log(`    📊 進捗: ${current}/${total}`);
                    }
                }
            );
            
            expect(results).toBeDefined();
            expect(results.length).toBe(workItems.length);
            expect(progressCount).toBeGreaterThan(0);
            
            // 結果の検証
            results.forEach((result, index) => {
                expect(result).toBe(index * 2);
            });
            
            schedulerOptimizer.stop();
            
            console.log(`📦 バッチタスク完了: ${results.length}項目処理, ${progressCount}回進捗通知`);
        });

        test('UI応答時間測定', async () => {
            console.log('\n🖱️ SchedulerOptimizer - UI応答時間測定');
            
            const uiOperation = async () => {
                await new Promise(resolve => setTimeout(resolve, 80));
                return 'ui-operation-result';
            };
            
            const measurement = await schedulerOptimizer.measureUIResponse(
                uiOperation,
                'test-ui-operation'
            );
            
            expect(measurement).toBeDefined();
            expect(measurement.operationName).toBe('test-ui-operation');
            expect(measurement.responseTime).toBeGreaterThan(70);
            expect(measurement.responseTime).toBeLessThan(200);
            expect(measurement.success).toBe(true);
            expect(measurement.result).toBe('ui-operation-result');
            
            console.log(`🖱️ UI応答測定: ${measurement.operationName} = ${Math.round(measurement.responseTime)}ms`);
        });

        test('スケジューラ統計取得', async () => {
            console.log('\n📊 SchedulerOptimizer - 統計取得');
            
            schedulerOptimizer.start();
            
            // いくつかのタスクを実行して統計を生成
            await schedulerOptimizer.scheduleTask(async () => {
                await new Promise(resolve => setTimeout(resolve, 30));
                return 'test-result-1';
            });
            
            await schedulerOptimizer.scheduleTask(async () => {
                await new Promise(resolve => setTimeout(resolve, 20));
                return 'test-result-2';
            });
            
            const stats = schedulerOptimizer.getSchedulerStats();
            
            expect(stats).toBeDefined();
            expect(stats.timestamp).toBeDefined();
            expect(stats.running).toBe(true);
            expect(stats.taskQueue).toBeDefined();
            expect(stats.execution).toBeDefined();
            expect(stats.configuration).toBeDefined();
            
            schedulerOptimizer.stop();
            
            console.log(`📊 統計取得完了: 完了タスク ${stats.execution.completedTasks}件`);
        });

        test('アダプティブ最適化', () => {
            console.log('\n🔄 SchedulerOptimizer - アダプティブ最適化');
            
            const originalConcurrency = schedulerOptimizer.options.maxConcurrentTasks;
            const originalSliceTime = schedulerOptimizer.options.taskSliceTimeMs;
            
            // 設定でアダプティブ調整を有効化
            schedulerOptimizer.options.enableAdaptiveScheduling = true;
            
            // UI応答時間違反をシミュレート
            schedulerOptimizer.uiResponses.push(
                { responseTime: 250, violatesTarget: true },
                { responseTime: 300, violatesTarget: true },
                { responseTime: 200, violatesTarget: true }
            );
            
            schedulerOptimizer.performAdaptiveOptimization();
            
            // 設定が調整されたかチェック
            const newConcurrency = schedulerOptimizer.options.maxConcurrentTasks;
            const newSliceTime = schedulerOptimizer.options.taskSliceTimeMs;
            
            expect(newConcurrency).toBeLessThanOrEqual(originalConcurrency);
            expect(newSliceTime).toBeLessThanOrEqual(originalSliceTime);
            
            console.log(`🔄 アダプティブ調整: 同時実行数 ${originalConcurrency}→${newConcurrency}, スライス時間 ${originalSliceTime}→${newSliceTime}ms`);
        });
    });

    describe('統合テスト', () => {
        test('パフォーマンス最適化コンポーネントの連携', async () => {
            console.log('\n🔗 統合テスト - コンポーネント連携');
            
            // メモリ監視開始
            memoryOptimizer.startMonitoring();
            
            // スケジューラ開始
            schedulerOptimizer.start();
            
            // 負荷の高いタスクを実行
            const heavyTask = async () => {
                const largeArray = new Array(100000).fill(0).map((_, i) => ({ id: i, data: Math.random() }));
                
                // 配列操作
                largeArray.sort((a, b) => a.data - b.data);
                largeArray.reverse();
                
                return largeArray.length;
            };
            
            const taskPromises = [];
            for (let i = 0; i < 5; i++) {
                taskPromises.push(
                    schedulerOptimizer.scheduleTask(heavyTask, {
                        taskName: `heavy-task-${i + 1}`
                    })
                );
            }
            
            const results = await Promise.all(taskPromises);
            
            // 結果検証
            expect(results.length).toBe(5);
            results.forEach(result => {
                expect(result).toBe(100000);
            });
            
            // メモリ最適化実行
            const optimizationResult = await memoryOptimizer.optimizeMemoryUsage();
            
            // スケジューラ統計取得
            const schedulerStats = schedulerOptimizer.getSchedulerStats();
            
            // メモリレポート生成
            const memoryReport = memoryOptimizer.generateMemoryReport();
            
            // クリーンアップ
            schedulerOptimizer.stop();
            memoryOptimizer.stopMonitoring();
            
            console.log('🔗 統合テスト完了:');
            console.log(`  📊 タスク実行: ${schedulerStats.execution.completedTasks}件完了`);
            console.log(`  🧠 メモリ最適化: ${optimizationResult.memoryReduction.heapUsedMB}MB削減`);
            console.log(`  📈 メモリ監視: ${memoryReport.history.memorySnapshots.length}件記録`);
            
        }, 15000); // 長めのタイムアウト
    });
});

// テスト環境でのグローバルGC有効化（可能な場合）
if (typeof global !== 'undefined' && !global.gc) {
    console.log('⚠️ ガベージコレクションが利用できません。完全なテストには --expose-gc フラグが必要です。');
}