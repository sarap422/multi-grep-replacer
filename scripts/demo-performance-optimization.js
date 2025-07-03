#!/usr/bin/env node

/**
 * パフォーマンス最適化システム デモンストレーションスクリプト
 * 
 * 実行方法:
 * node scripts/demo-performance-optimization.js
 * 
 * GC機能を有効にする場合:
 * node --expose-gc scripts/demo-performance-optimization.js
 */

const path = require('path');
const BenchmarkRunner = require('../src/main/benchmark-runner');
const MemoryOptimizer = require('../src/main/memory-optimizer');
const SchedulerOptimizer = require('../src/main/scheduler-optimizer');

async function demonstratePerformanceOptimization() {
    console.log('🚀 Multi Grep Replacer - パフォーマンス最適化システム デモンストレーション');
    console.log('=' .repeat(80));
    console.log();

    // コンポーネント初期化
    console.log('📋 1. コンポーネント初期化');
    console.log('-'.repeat(40));

    const benchmarkRunner = new BenchmarkRunner({
        enableAutoReporting: true,
        reportOutputPath: path.join(__dirname, '..', 'debug', 'demo-reports'),
        thresholds: {
            fileProcessingPerSec: 30,
            memoryWarningMB: 150,
            uiResponseMaxMs: 100
        }
    });

    const memoryOptimizer = new MemoryOptimizer({
        memoryThresholdMB: 150,
        enableAutoGC: true,
        enableLeakDetection: true,
        gcIntervalMs: 10000 // 10秒間隔
    });

    const schedulerOptimizer = new SchedulerOptimizer({
        maxUIResponseTimeMs: 100,
        maxConcurrentTasks: 3,
        enableAdaptiveScheduling: true,
        enableUIMonitoring: true
    });

    console.log('✅ コンポーネント初期化完了');
    console.log();

    try {
        // パフォーマンス監視開始
        console.log('📊 2. パフォーマンス監視開始');
        console.log('-'.repeat(40));

        memoryOptimizer.startMonitoring();
        schedulerOptimizer.start();

        console.log('✅ 監視システム開始完了');
        console.log();

        // クイックベンチマークテスト
        console.log('⚡ 3. クイックベンチマークテスト');
        console.log('-'.repeat(40));

        const quickResult = await benchmarkRunner.runQuickTest();
        
        console.log(`📊 結果:`);
        console.log(`   ファイル処理: ${quickResult.filesProcessed}件`);
        console.log(`   処理速度: ${Math.round(quickResult.filesPerSecond)}ファイル/秒`);
        console.log(`   総実行時間: ${Math.round(quickResult.totalTime)}秒`);
        console.log(`   メモリ使用量: ${Math.round(quickResult.memoryUsage)}MB`);
        console.log(`   目標達成: ${quickResult.passed ? '✅ YES' : '❌ NO'}`);
        console.log();

        // スケジューラデモンストレーション
        console.log('⚡ 4. スケジューラデモンストレーション');
        console.log('-'.repeat(40));

        // 高優先度タスク
        console.log('🚀 高優先度タスク実行...');
        const highPriorityResult = await schedulerOptimizer.scheduleHighPriorityTask(async () => {
            console.log('   ⚡ 高優先度タスク処理中...');
            await new Promise(resolve => setTimeout(resolve, 40)); // 40msに短縮
            return 'High Priority Completed';
        }, { taskName: 'demo-high-priority', maxExecutionTime: 200 }); // タイムアウトを200msに延長

        console.log(`   結果: ${highPriorityResult}`);

        // バッチタスク
        console.log('📦 バッチタスク実行...');
        const workItems = Array.from({ length: 20 }, (_, i) => ({ id: i, value: Math.random() }));
        
        let progressReports = 0;
        const batchResults = await schedulerOptimizer.scheduleBatchTask(
            async (item) => {
                // 疑似的な処理
                await new Promise(resolve => setTimeout(resolve, 50));
                return item.value * 2;
            },
            workItems,
            {
                batchSize: 5,
                onProgress: (current, total) => {
                    progressReports++;
                    console.log(`   📊 進捗: ${current}/${total} (${Math.round(current/total*100)}%)`);
                }
            }
        );

        console.log(`   結果: ${batchResults.length}項目処理完了, ${progressReports}回進捗通知`);

        // UI応答時間測定
        console.log('🖱️ UI応答時間測定...');
        const uiMeasurement = await schedulerOptimizer.measureUIResponse(async () => {
            console.log('   🖱️ UI操作シミュレーション...');
            await new Promise(resolve => setTimeout(resolve, 80));
            return 'UI Operation Completed';
        }, 'demo-ui-operation');

        console.log(`   応答時間: ${Math.round(uiMeasurement.responseTime)}ms`);
        console.log(`   目標達成: ${!uiMeasurement.violatesTarget ? '✅ YES' : '❌ NO'}`);
        console.log();

        // メモリ最適化デモ
        console.log('🧠 5. メモリ最適化デモンストレーション');
        console.log('-'.repeat(40));

        // メモリ負荷生成
        console.log('📈 メモリ負荷生成中...');
        const heavyData = [];
        for (let i = 0; i < 1000; i++) {
            heavyData.push(new Array(1000).fill(0).map((_, j) => ({ 
                id: i * 1000 + j, 
                data: Math.random().toString(36) 
            })));
        }

        console.log('   メモリ負荷生成完了');

        // メモリリーク検出
        console.log('🔍 メモリリーク検出実行...');
        const leakDetection = memoryOptimizer.detectMemoryLeaks();
        
        console.log(`   検出結果: ${leakDetection.leaksDetected}件のリーク, ${leakDetection.warningsCount}件の警告`);
        if (leakDetection.leaks.length > 0) {
            leakDetection.leaks.forEach(leak => {
                console.log(`   ⚠️ ${leak.type}: ${leak.description}`);
            });
        }

        // メモリ最適化実行
        console.log('🚀 メモリ最適化実行...');
        const optimizationResult = await memoryOptimizer.optimizeMemoryUsage({
            enableGC: true,
            enableHistoryCleanup: true,
            enableReferenceCleanup: true,
            enableV8Optimization: true
        });

        console.log(`   最適化結果:`);
        console.log(`   - 実行前: ${optimizationResult.beforeMemory.heapUsedMB}MB`);
        console.log(`   - 実行後: ${optimizationResult.afterMemory.heapUsedMB}MB`);
        console.log(`   - 削減量: ${optimizationResult.memoryReduction.heapUsedMB}MB`);
        console.log(`   - 実行時間: ${optimizationResult.executionTimeMs}ms`);
        console.log();

        // アダプティブ最適化デモ
        console.log('🔄 6. アダプティブ最適化デモンストレーション');
        console.log('-'.repeat(40));

        // 負荷の高い状況をシミュレート
        console.log('📈 高負荷状況シミュレーション...');
        
        // UI応答時間違反をシミュレート
        for (let i = 0; i < 5; i++) {
            await schedulerOptimizer.measureUIResponse(async () => {
                await new Promise(resolve => setTimeout(resolve, 150)); // 目標より遅い
                return `slow-ui-${i}`;
            }, `slow-ui-operation-${i}`);
        }

        console.log('🔄 アダプティブ最適化実行...');
        schedulerOptimizer.performAdaptiveOptimization();

        console.log('   最適化調整完了');
        console.log();

        // 統計情報収集
        console.log('📊 7. 統計情報収集');
        console.log('-'.repeat(40));

        const schedulerStats = schedulerOptimizer.getSchedulerStats();
        const memoryReport = memoryOptimizer.generateMemoryReport();

        console.log('📊 スケジューラ統計:');
        console.log(`   - 総タスク数: ${schedulerStats.execution.totalTasks}`);
        console.log(`   - 完了タスク: ${schedulerStats.execution.completedTasks}`);
        console.log(`   - 成功率: ${schedulerStats.execution.successRate}%`);
        console.log(`   - 平均実行時間: ${schedulerStats.execution.avgExecutionTime}ms`);
        console.log(`   - UI違反回数: ${schedulerStats.execution.uiViolations || 0}`);

        console.log();
        console.log('🧠 メモリ統計:');
        console.log(`   - 現在のメモリ: ${memoryReport.currentStatus.memory.heapUsedMB}MB`);
        console.log(`   - 監視中: ${memoryReport.currentStatus.monitoring ? '✅ YES' : '❌ NO'}`);
        if (memoryReport.statistics.available) {
            console.log(`   - 平均メモリ: ${memoryReport.statistics.avgMemoryMB}MB`);
            console.log(`   - 最大メモリ: ${memoryReport.statistics.maxMemoryMB}MB`);
            console.log(`   - GC実行回数: ${memoryReport.statistics.gcEventsCount}`);
        }

        console.log();
        console.log('📋 推奨事項:');
        if (schedulerStats.recommendations.length > 0) {
            schedulerStats.recommendations.forEach(rec => {
                console.log(`   📝 ${rec}`);
            });
        }
        if (memoryReport.recommendations.length > 0) {
            memoryReport.recommendations.forEach(rec => {
                console.log(`   🧠 ${rec}`);
            });
        }

        // フルベンチマーク（オプション）
        if (process.argv.includes('--full-benchmark')) {
            console.log();
            console.log('🏁 8. フルベンチマークテスト（オプション）');
            console.log('-'.repeat(40));
            console.log('⚠️ この処理には時間がかかります...');

            const fullBenchmark = await benchmarkRunner.runFullBenchmark({
                datasets: [
                    {
                        name: 'demo-small',
                        files: await benchmarkRunner._generateTestFiles(10, { avgSize: 1024 }),
                        replacementRules: [{ from: 'test', to: 'TEST', enabled: true }]
                    }
                ]
            });

            console.log(`🏁 フルベンチマーク結果:`);
            console.log(`   - 総合スコア: ${fullBenchmark.summary.overallScore}/100`);
            console.log(`   - グレード: ${fullBenchmark.summary.grade}`);
            console.log(`   - 実行時間: ${Math.round(fullBenchmark.totalTime)}秒`);

            if (fullBenchmark.summary.issues.length > 0) {
                console.log(`   問題点:`);
                fullBenchmark.summary.issues.forEach(issue => {
                    console.log(`   ⚠️ ${issue}`);
                });
            }

            // テストファイルクリーンアップ
            for (const dataset of fullBenchmark.testConfig.datasets || []) {
                if (dataset.files) {
                    await benchmarkRunner._cleanupTestFiles(dataset.files);
                }
            }
        }

    } catch (error) {
        console.error('❌ デモンストレーション中にエラーが発生しました:', error);
    } finally {
        // クリーンアップ
        console.log();
        console.log('🧹 8. クリーンアップ');
        console.log('-'.repeat(40));

        if (schedulerOptimizer.running) {
            schedulerOptimizer.stop();
            console.log('⚡ スケジューラ停止完了');
        }

        if (memoryOptimizer.monitoring) {
            memoryOptimizer.stopMonitoring();
            console.log('🧠 メモリ監視停止完了');
        }

        memoryOptimizer.cleanup();
        schedulerOptimizer.cleanup();
        
        console.log('✅ 全クリーンアップ完了');
    }

    console.log();
    console.log('=' .repeat(80));
    console.log('🎉 パフォーマンス最適化システム デモンストレーション完了!');
    console.log();
    console.log('💡 ヒント:');
    console.log('   - フルベンチマークを実行するには --full-benchmark フラグを追加してください');
    console.log('   - ガベージコレクション機能を有効にするには --expose-gc フラグを追加してください');
    console.log('   - 例: node --expose-gc scripts/demo-performance-optimization.js --full-benchmark');
    console.log();
}

// 未処理例外・拒否のハンドリング
process.on('uncaughtException', (error) => {
    console.error('❌ 未処理例外:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('❌ 未処理Promise拒否:', reason);
    process.exit(1);
});

// メイン実行
if (require.main === module) {
    demonstratePerformanceOptimization()
        .then(() => {
            console.log('👋 デモンストレーション正常終了');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ デモンストレーション異常終了:', error);
            process.exit(1);
        });
}

module.exports = { demonstratePerformanceOptimization };