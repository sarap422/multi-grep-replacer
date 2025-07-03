const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const os = require('os');

const PerformanceMonitor = require('./performance-monitor');
const FileOperations = require('./file-operations');

/**
 * 自動化されたパフォーマンステストランナー
 * 処理速度、メモリ使用量、UI応答性を定期的にベンチマーク測定
 */
class BenchmarkRunner {
    constructor(options = {}) {
        this.options = {
            enableAutoReporting: options.enableAutoReporting !== false,
            reportOutputPath: options.reportOutputPath || path.join(process.cwd(), 'debug', 'benchmark-reports'),
            testDataPath: options.testDataPath || path.join(process.cwd(), 'tests', 'fixtures', 'benchmark'),
            thresholds: {
                fileProcessingPerSec: 50,    // 最低50ファイル/秒
                memoryWarningMB: 200,        // 200MB警告閾値
                uiResponseMaxMs: 100,        // UI応答100ms以内
                totalTimeMaxSec: 30,         // 1000ファイル30秒以内
                ...options.thresholds
            },
            ...options
        };

        this.performanceMonitor = new PerformanceMonitor({
            enableDetailedLogs: true,
            monitoringInterval: 500
        });

        this.fileOperations = new FileOperations({
            enablePerformanceMonitoring: true,
            useWorkerThreads: true,
            useStreamProcessing: true
        });

        // ベンチマーク結果履歴
        this.benchmarkHistory = [];
        this.currentTest = null;

        console.log('🏁 ベンチマークランナー初期化完了');
        console.log(`📊 閾値設定: ${JSON.stringify(this.options.thresholds, null, 2)}`);
    }

    /**
     * 完全なパフォーマンステストスイートを実行
     * @param {Object} testConfig テスト設定
     * @returns {Promise<Object>} ベンチマーク結果
     */
    async runFullBenchmark(testConfig = {}) {
        try {
            console.log('🏁 フルベンチマークテスト開始');
            
            const startTime = performance.now();
            const systemInfo = await this._collectSystemInfo();
            
            // テストデータ準備
            const testData = await this._prepareTestData(testConfig);
            
            // ベンチマーク実行
            const results = {
                systemInfo,
                testConfig,
                timestamp: new Date().toISOString(),
                tests: {}
            };

            // 1. ファイル処理速度テスト
            console.log('📄 ファイル処理速度テスト実行中...');
            results.tests.fileProcessing = await this._benchmarkFileProcessing(testData);

            // 2. メモリ使用量テスト
            console.log('💾 メモリ使用量テスト実行中...');
            results.tests.memoryUsage = await this._benchmarkMemoryUsage(testData);

            // 3. UI応答性テスト
            console.log('🖱️ UI応答性テスト実行中...');
            results.tests.uiResponsiveness = await this._benchmarkUIResponsiveness();

            // 4. スケーラビリティテスト
            console.log('📈 スケーラビリティテスト実行中...');
            results.tests.scalability = await this._benchmarkScalability(testData);

            // 総合評価
            results.summary = this._generateBenchmarkSummary(results);
            results.totalTime = (performance.now() - startTime) / 1000;

            // 結果保存
            if (this.options.enableAutoReporting) {
                await this._saveBenchmarkReport(results);
            }

            this.benchmarkHistory.push(results);
            
            console.log(`✅ フルベンチマークテスト完了: ${Math.round(results.totalTime)}秒`);
            console.log(`📊 総合スコア: ${results.summary.overallScore}/100`);
            
            return results;

        } catch (error) {
            console.error('❌ ベンチマークテストエラー:', error);
            throw new Error(`ベンチマークテストに失敗しました: ${error.message}`);
        }
    }

    /**
     * ファイル処理速度ベンチマーク
     * @param {Object} testData テストデータ
     * @returns {Promise<Object>} 処理速度結果
     * @private
     */
    async _benchmarkFileProcessing(testData) {
        const results = [];
        
        for (const dataset of testData.datasets) {
            console.log(`📄 テスト実行: ${dataset.name} (${dataset.files.length}ファイル)`);
            
            const startTime = performance.now();
            this.performanceMonitor.startMonitoring(dataset.files.length);

            try {
                // 置換処理実行
                const processingResult = await this.fileOperations.processBatchReplacement(
                    dataset.files,
                    dataset.replacementRules,
                    (current, total) => {
                        // 進捗ログ（テスト用）
                        if (current % 100 === 0) {
                            console.log(`  📊 進捗: ${current}/${total}`);
                        }
                    }
                );

                const endTime = performance.now();
                const performanceStats = this.performanceMonitor.stopMonitoring();

                const result = {
                    datasetName: dataset.name,
                    fileCount: dataset.files.length,
                    totalTime: (endTime - startTime) / 1000, // 秒
                    filesPerSecond: dataset.files.length / ((endTime - startTime) / 1000),
                    successRate: processingResult.summary.successRate,
                    memoryPeak: performanceStats.performance.memory.peak,
                    cpuPeak: performanceStats.performance.cpu.peak,
                    passedThreshold: null
                };

                // 閾値チェック
                result.passedThreshold = result.filesPerSecond >= this.options.thresholds.fileProcessingPerSec;
                
                results.push(result);
                
                console.log(`  ✅ 結果: ${Math.round(result.filesPerSecond)}ファイル/秒 (${result.passedThreshold ? 'PASS' : 'FAIL'})`);

            } catch (error) {
                console.error(`  ❌ テストエラー: ${dataset.name}`, error);
                results.push({
                    datasetName: dataset.name,
                    error: error.message,
                    passedThreshold: false
                });
            }
        }

        return {
            results,
            averageFilesPerSecond: results.reduce((sum, r) => sum + (r.filesPerSecond || 0), 0) / results.length,
            allPassed: results.every(r => r.passedThreshold === true)
        };
    }

    /**
     * メモリ使用量ベンチマーク
     * @param {Object} testData テストデータ
     * @returns {Promise<Object>} メモリ使用量結果
     * @private
     */
    async _benchmarkMemoryUsage(testData) {
        const results = [];
        const baseline = process.memoryUsage();

        for (const dataset of testData.memoryTestSets) {
            console.log(`💾 メモリテスト: ${dataset.name}`);
            
            const beforeMemory = process.memoryUsage();
            
            try {
                // メモリ集約的処理を実行
                await this._executeMemoryIntensiveTask(dataset);
                
                // ガベージコレクション実行
                if (global.gc) {
                    global.gc();
                }
                
                const afterMemory = process.memoryUsage();
                const peakMemory = Math.max(beforeMemory.heapUsed, afterMemory.heapUsed);
                const memoryDelta = afterMemory.heapUsed - beforeMemory.heapUsed;
                
                const result = {
                    testName: dataset.name,
                    baselineMemoryMB: Math.round(baseline.heapUsed / 1024 / 1024),
                    beforeMemoryMB: Math.round(beforeMemory.heapUsed / 1024 / 1024),
                    afterMemoryMB: Math.round(afterMemory.heapUsed / 1024 / 1024),
                    peakMemoryMB: Math.round(peakMemory / 1024 / 1024),
                    memoryDeltaMB: Math.round(memoryDelta / 1024 / 1024),
                    passedThreshold: null
                };

                // 閾値チェック
                result.passedThreshold = result.peakMemoryMB <= this.options.thresholds.memoryWarningMB;
                
                results.push(result);
                
                console.log(`  ✅ 結果: ピーク ${result.peakMemoryMB}MB (${result.passedThreshold ? 'PASS' : 'FAIL'})`);

            } catch (error) {
                console.error(`  ❌ メモリテストエラー: ${dataset.name}`, error);
                results.push({
                    testName: dataset.name,
                    error: error.message,
                    passedThreshold: false
                });
            }
        }

        return {
            results,
            maxMemoryUsageMB: Math.max(...results.map(r => r.peakMemoryMB || 0)),
            allPassed: results.every(r => r.passedThreshold === true)
        };
    }

    /**
     * UI応答性ベンチマーク
     * @returns {Promise<Object>} UI応答性結果
     * @private
     */
    async _benchmarkUIResponsiveness() {
        const tests = [
            { operation: 'button-click', targetMs: 100 },
            { operation: 'typing', targetMs: 50 },
            { operation: 'folder-select', targetMs: 200 },
            { operation: 'config-load', targetMs: 300 },
            { operation: 'file-search', targetMs: 500 }
        ];

        const results = [];

        for (const test of tests) {
            console.log(`🖱️ UI応答性テスト: ${test.operation}`);
            
            const measurements = [];
            
            // 各操作を10回測定
            for (let i = 0; i < 10; i++) {
                const startTime = performance.now();
                
                // UI操作シミュレーション
                await this._simulateUIOperation(test.operation);
                
                const endTime = performance.now();
                const responseTime = endTime - startTime;
                measurements.push(responseTime);
                
                // 少し待機（実際のUI操作間隔をシミュレート）
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            const avgResponseTime = measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
            const maxResponseTime = Math.max(...measurements);
            
            const result = {
                operation: test.operation,
                targetMs: test.targetMs,
                avgResponseTime: Math.round(avgResponseTime),
                maxResponseTime: Math.round(maxResponseTime),
                measurements,
                passedThreshold: maxResponseTime <= test.targetMs
            };

            results.push(result);
            
            console.log(`  ✅ 結果: 平均 ${result.avgResponseTime}ms, 最大 ${result.maxResponseTime}ms (${result.passedThreshold ? 'PASS' : 'FAIL'})`);
        }

        return {
            results,
            overallAvgResponseTime: Math.round(results.reduce((sum, r) => sum + r.avgResponseTime, 0) / results.length),
            allPassed: results.every(r => r.passedThreshold === true)
        };
    }

    /**
     * スケーラビリティベンチマーク
     * @param {Object} testData テストデータ  
     * @returns {Promise<Object>} スケーラビリティ結果
     * @private
     */
    async _benchmarkScalability(testData) {
        const fileCounts = [10, 50, 100, 500, 1000];
        const results = [];

        for (const fileCount of fileCounts) {
            console.log(`📈 スケーラビリティテスト: ${fileCount}ファイル`);
            
            // テストファイル作成
            const testFiles = await this._generateTestFiles(fileCount);
            
            const startTime = performance.now();
            this.performanceMonitor.startMonitoring(fileCount);

            try {
                const processingResult = await this.fileOperations.processBatchReplacement(
                    testFiles,
                    testData.standardReplacementRules
                );

                const endTime = performance.now();
                const performanceStats = this.performanceMonitor.stopMonitoring();

                const result = {
                    fileCount,
                    totalTime: (endTime - startTime) / 1000,
                    filesPerSecond: fileCount / ((endTime - startTime) / 1000),
                    memoryPeak: performanceStats.performance.memory.peak,
                    successRate: processingResult.summary.successRate,
                    timePerFile: ((endTime - startTime) / 1000) / fileCount
                };

                results.push(result);
                
                console.log(`  ✅ 結果: ${Math.round(result.totalTime)}秒, ${Math.round(result.filesPerSecond)}ファイル/秒`);

            } catch (error) {
                console.error(`  ❌ スケーラビリティテストエラー: ${fileCount}ファイル`, error);
                results.push({
                    fileCount,
                    error: error.message
                });
            } finally {
                // テストファイルクリーンアップ
                await this._cleanupTestFiles(testFiles);
            }
        }

        return {
            results,
            linearScaling: this._analyzeScalingPattern(results),
            maxTestedFiles: Math.max(...fileCounts),
            performanceAtScale: results.find(r => r.fileCount === 1000)
        };
    }

    /**
     * システム情報収集
     * @returns {Promise<Object>} システム情報
     * @private
     */
    async _collectSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            cpuCount: os.cpus().length,
            totalMemoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024),
            nodeVersion: process.version,
            electronVersion: process.versions.electron || 'N/A',
            timestamp: new Date().toISOString()
        };
    }

    /**
     * テストデータ準備
     * @param {Object} testConfig テスト設定
     * @returns {Promise<Object>} 準備済みテストデータ
     * @private
     */
    async _prepareTestData(testConfig = {}) {
        const baseTestData = {
            datasets: [
                {
                    name: 'small-files',
                    files: await this._generateTestFiles(50, { avgSize: 1024 }), // 1KB
                    replacementRules: [
                        { from: 'test', to: 'TEST', enabled: true }
                    ]
                },
                {
                    name: 'medium-files', 
                    files: await this._generateTestFiles(100, { avgSize: 50 * 1024 }), // 50KB
                    replacementRules: [
                        { from: 'old-class', to: 'new-class', enabled: true },
                        { from: 'oldVar', to: 'newVar', enabled: true }
                    ]
                },
                {
                    name: 'large-files',
                    files: await this._generateTestFiles(20, { avgSize: 1024 * 1024 }), // 1MB
                    replacementRules: [
                        { from: 'legacy', to: 'modern', enabled: true }
                    ]
                }
            ],
            memoryTestSets: [
                { name: 'normal-load', fileCount: 100 },
                { name: 'heavy-load', fileCount: 500 },
                { name: 'stress-test', fileCount: 1000 }
            ],
            standardReplacementRules: [
                { from: 'test', to: 'TEST', enabled: true },
                { from: 'old', to: 'new', enabled: true }
            ]
        };

        // カスタム設定をマージ
        return { ...baseTestData, ...testConfig };
    }

    /**
     * テストファイル生成
     * @param {number} count ファイル数
     * @param {Object} options オプション
     * @returns {Promise<string[]>} 生成されたファイルパス配列
     * @private
     */
    async _generateTestFiles(count, options = {}) {
        const { avgSize = 10 * 1024 } = options; // デフォルト10KB
        const testDir = path.join(this.options.testDataPath, `benchmark-${Date.now()}`);
        
        await fs.mkdir(testDir, { recursive: true });
        
        const files = [];
        
        for (let i = 0; i < count; i++) {
            const fileName = `test-file-${i.toString().padStart(4, '0')}.txt`;
            const filePath = path.join(testDir, fileName);
            
            // ランダムサイズのテストコンテンツ生成
            const sizeVariation = avgSize * 0.2; // ±20%の変動
            const actualSize = avgSize + (Math.random() - 0.5) * sizeVariation;
            
            const content = this._generateTestContent(actualSize);
            
            await fs.writeFile(filePath, content, 'utf8');
            files.push(filePath);
        }
        
        console.log(`📝 テストファイル生成完了: ${count}件 (${testDir})`);
        return files;
    }

    /**
     * テストコンテンツ生成
     * @param {number} targetSize 目標サイズ（バイト）
     * @returns {string} 生成されたコンテンツ
     * @private
     */
    _generateTestContent(targetSize) {
        const words = ['test', 'old-class', 'legacy', 'oldVar', 'function', 'const', 'let', 'var'];
        const lines = [];
        let currentSize = 0;
        
        while (currentSize < targetSize) {
            const lineWords = [];
            for (let i = 0; i < 10 + Math.floor(Math.random() * 10); i++) {
                lineWords.push(words[Math.floor(Math.random() * words.length)]);
            }
            
            const line = lineWords.join(' ');
            lines.push(line);
            currentSize += Buffer.byteLength(line + '\n', 'utf8');
        }
        
        return lines.join('\n');
    }

    /**
     * UI操作シミュレーション
     * @param {string} operation 操作種別
     * @returns {Promise<void>}
     * @private
     */
    async _simulateUIOperation(operation) {
        switch (operation) {
            case 'button-click':
                // CPU集約的な処理をシミュレート
                const start = performance.now();
                while (performance.now() - start < 10) {
                    Math.random();
                }
                break;
                
            case 'typing':
                // 軽量な処理をシミュレート
                await new Promise(resolve => setTimeout(resolve, 5));
                break;
                
            case 'folder-select':
                // ファイルシステムアクセスをシミュレート
                await fs.readdir(process.cwd());
                break;
                
            case 'config-load':
                // JSON解析をシミュレート
                const testConfig = { test: 'data', rules: [1, 2, 3] };
                JSON.stringify(testConfig);
                JSON.parse(JSON.stringify(testConfig));
                break;
                
            case 'file-search':
                // ファイル検索をシミュレート
                await this.fileOperations.findFiles(process.cwd(), ['.js'], ['node_modules/**']);
                break;
                
            default:
                await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    /**
     * メモリ集約的タスクの実行
     * @param {Object} dataset データセット
     * @returns {Promise<void>}
     * @private
     */
    async _executeMemoryIntensiveTask(dataset) {
        const arrays = [];
        
        // メモリを段階的に消費
        for (let i = 0; i < dataset.fileCount; i++) {
            // 大きな配列を作成してメモリを消費
            const largeArray = new Array(10000).fill(Math.random().toString(36));
            arrays.push(largeArray);
            
            // 定期的に処理を挟む
            if (i % 100 === 0) {
                await new Promise(resolve => setImmediate(resolve));
            }
        }
        
        // 処理の実行（配列を操作）
        arrays.forEach(arr => {
            arr.sort();
            arr.reverse();
        });
    }

    /**
     * スケーリングパターン分析
     * @param {Array} results スケーラビリティテスト結果
     * @returns {Object} スケーリング分析結果
     * @private
     */
    _analyzeScalingPattern(results) {
        const validResults = results.filter(r => !r.error);
        
        if (validResults.length < 2) {
            return { analysis: 'insufficient-data' };
        }
        
        // 線形スケーリングからの乖離度を計算
        const expectedLinearRatio = validResults[0].timePerFile;
        const deviations = validResults.map(r => Math.abs(r.timePerFile - expectedLinearRatio) / expectedLinearRatio);
        
        const avgDeviation = deviations.reduce((sum, dev) => sum + dev, 0) / deviations.length;
        
        return {
            analysis: avgDeviation < 0.3 ? 'linear' : avgDeviation < 0.6 ? 'sublinear' : 'degraded',
            avgDeviation: Math.round(avgDeviation * 100),
            scalingEfficiency: Math.max(0, 100 - avgDeviation * 100)
        };
    }

    /**
     * ベンチマーク総合評価生成
     * @param {Object} results 全テスト結果
     * @returns {Object} 総合評価
     * @private
     */
    _generateBenchmarkSummary(results) {
        let totalScore = 0;
        let maxScore = 0;
        const issues = [];

        // ファイル処理速度評価 (30点)
        if (results.tests.fileProcessing.allPassed) {
            totalScore += 30;
        } else {
            totalScore += Math.round(30 * results.tests.fileProcessing.averageFilesPerSecond / this.options.thresholds.fileProcessingPerSec);
            issues.push('ファイル処理速度が目標を下回っています');
        }
        maxScore += 30;

        // メモリ使用量評価 (25点)
        if (results.tests.memoryUsage.allPassed) {
            totalScore += 25;
        } else {
            totalScore += Math.round(25 * 0.5); // 部分点
            issues.push('メモリ使用量が目標を上回っています');
        }
        maxScore += 25;

        // UI応答性評価 (25点)
        if (results.tests.uiResponsiveness.allPassed) {
            totalScore += 25;
        } else {
            totalScore += Math.round(25 * 0.7); // 部分点
            issues.push('UI応答性が目標を下回っています');
        }
        maxScore += 25;

        // スケーラビリティ評価 (20点)
        const scalingScore = results.tests.scalability.linearScaling.scalingEfficiency || 0;
        totalScore += Math.round(20 * scalingScore / 100);
        maxScore += 20;

        if (scalingScore < 70) {
            issues.push('スケーラビリティに改善の余地があります');
        }

        return {
            overallScore: Math.round((totalScore / maxScore) * 100),
            breakdown: {
                fileProcessing: results.tests.fileProcessing.allPassed ? 30 : Math.round(30 * results.tests.fileProcessing.averageFilesPerSecond / this.options.thresholds.fileProcessingPerSec),
                memoryUsage: results.tests.memoryUsage.allPassed ? 25 : Math.round(25 * 0.5),
                uiResponsiveness: results.tests.uiResponsiveness.allPassed ? 25 : Math.round(25 * 0.7),
                scalability: Math.round(20 * scalingScore / 100)
            },
            grade: this._calculateGrade(totalScore / maxScore * 100),
            issues,
            recommendations: this._generateRecommendations(results)
        };
    }

    /**
     * グレード計算
     * @param {number} score スコア (0-100)
     * @returns {string} グレード
     * @private
     */
    _calculateGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * 改善提案生成
     * @param {Object} results テスト結果
     * @returns {string[]} 改善提案
     * @private
     */
    _generateRecommendations(results) {
        const recommendations = [];

        if (!results.tests.fileProcessing.allPassed) {
            recommendations.push('Worker Threadsの並行数を調整してファイル処理速度を向上させてください');
        }

        if (!results.tests.memoryUsage.allPassed) {
            recommendations.push('Stream処理の使用やメモリリークの確認を行ってください');
        }

        if (!results.tests.uiResponsiveness.allPassed) {
            recommendations.push('非同期処理の最適化でUI応答性を改善してください');
        }

        if (results.tests.scalability.linearScaling.scalingEfficiency < 70) {
            recommendations.push('アルゴリズムの最適化でスケーラビリティを改善してください');
        }

        return recommendations;
    }

    /**
     * ベンチマークレポート保存
     * @param {Object} results ベンチマーク結果
     * @returns {Promise<string>} 保存先パス
     * @private
     */
    async _saveBenchmarkReport(results) {
        await fs.mkdir(this.options.reportOutputPath, { recursive: true });
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const reportPath = path.join(this.options.reportOutputPath, `benchmark-${timestamp}.json`);
        
        await fs.writeFile(reportPath, JSON.stringify(results, null, 2), 'utf8');
        
        console.log(`📊 ベンチマークレポート保存: ${reportPath}`);
        return reportPath;
    }

    /**
     * テストファイルクリーンアップ
     * @param {string[]} testFiles テストファイルパス配列
     * @returns {Promise<void>}
     * @private
     */
    async _cleanupTestFiles(testFiles) {
        for (const filePath of testFiles) {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.warn(`⚠️ テストファイル削除失敗: ${filePath}`, error.message);
            }
        }
        
        // 空のディレクトリも削除
        if (testFiles.length > 0) {
            const testDir = path.dirname(testFiles[0]);
            try {
                await fs.rmdir(testDir);
                console.log(`🧹 テストディレクトリ削除: ${testDir}`);
            } catch (error) {
                // ディレクトリが空でない場合は無視
            }
        }
    }

    /**
     * 簡単なパフォーマンステストを実行
     * @param {Object} options テストオプション
     * @returns {Promise<Object>} 簡易テスト結果
     */
    async runQuickTest(options = {}) {
        console.log('⚡ クイックパフォーマンステスト開始');
        
        const testFiles = await this._generateTestFiles(50, { avgSize: 10 * 1024 });
        const testRules = [{ from: 'test', to: 'TEST', enabled: true }];
        
        const startTime = performance.now();
        
        try {
            const result = await this.fileOperations.processBatchReplacement(testFiles, testRules);
            const endTime = performance.now();
            
            const quickResult = {
                filesProcessed: result.summary.totalFiles,
                totalTime: (endTime - startTime) / 1000,
                filesPerSecond: result.summary.totalFiles / ((endTime - startTime) / 1000),
                memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
                passed: (endTime - startTime) / 1000 < 5 // 5秒以内
            };
            
            console.log(`⚡ クイックテスト結果: ${Math.round(quickResult.filesPerSecond)}ファイル/秒`);
            
            return quickResult;
            
        } finally {
            await this._cleanupTestFiles(testFiles);
        }
    }

    /**
     * ベンチマーク履歴取得
     * @returns {Array} ベンチマーク履歴
     */
    getBenchmarkHistory() {
        return this.benchmarkHistory;
    }

    /**
     * 現在のシステム状態取得
     * @returns {Object} システム状態
     */
    getCurrentSystemStatus() {
        return {
            memory: process.memoryUsage(),
            uptime: process.uptime(),
            cpuUsage: process.cpuUsage(),
            platform: os.platform(),
            loadAverage: os.loadavg()
        };
    }
}

module.exports = BenchmarkRunner;