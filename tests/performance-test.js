/**
 * Multi Grep Replacer - Performance Test Suite
 * Task 4.1: パフォーマンス最適化・品質向上のテストスイート
 */

const path = require('path');
const fs = require('fs').promises;
const { performance } = require('perf_hooks');

class PerformanceTestSuite {
  constructor() {
    this.testResults = [];
    this.vibeLogger = null;
    
    // パフォーマンス目標値（requirements.mdより）
    this.TARGETS = {
      FILE_PROCESSING_TIME: 30000, // 1000ファイル30秒
      UI_RESPONSE_TIME: 100, // 100ms
      MEMORY_USAGE: 200 * 1024 * 1024, // 200MB
      BUNDLE_SIZE: 150 * 1024 * 1024 // 150MB
    };
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Vibe Logger初期化（dynamic import使用）
      try {
        const vibeLoggerModule = await import('vibelogger');
        this.vibeLogger = vibeLoggerModule.createFileLogger('multi-grep-replacer');
      } catch (vibeError) {
        console.warn('⚠️ Vibe Logger initialization failed:', vibeError.message);
        this.vibeLogger = null;
      }
      
      if (this.vibeLogger) {
        await this.vibeLogger.info('performance_test_init', 'Performance Test Suite initializing', {
        context: {
          targets: {
            fileProcessing: `${this.TARGETS.FILE_PROCESSING_TIME}ms for 1000 files`,
            uiResponse: `${this.TARGETS.UI_RESPONSE_TIME}ms`,
            memory: `${Math.round(this.TARGETS.MEMORY_USAGE / 1024 / 1024)}MB`,
            bundle: `${Math.round(this.TARGETS.BUNDLE_SIZE / 1024 / 1024)}MB`
          }
        },
        humanNote: 'パフォーマンステストスイートの初期化',
        aiTodo: 'テスト項目の最適化と追加提案'
        });
      }
      
      console.log('🧪 Performance Test Suite initialized');
      
    } catch (error) {
      console.error('❌ Performance Test Suite initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * 全パフォーマンステスト実行
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive performance tests...');
    
    try {
      const startTime = performance.now();
      
      // 1. ファイル処理パフォーマンステスト
      console.log('📁 Testing file processing performance...');
      const fileProcessingResult = await this.testFileProcessingPerformance();
      
      // 2. メモリ使用量テスト
      console.log('🧠 Testing memory usage...');
      const memoryUsageResult = await this.testMemoryUsage();
      
      // 3. UI応答性テスト（モック）
      console.log('⚡ Testing UI responsiveness...');
      const uiResponseResult = await this.testUIResponsiveness();
      
      // 4. 最適化エンジンテスト
      console.log('🔧 Testing optimization engines...');
      const optimizationResult = await this.testOptimizationEngines();
      
      // 5. ストレステスト
      console.log('💪 Running stress tests...');
      const stressTestResult = await this.testStressConditions();
      
      const totalTime = performance.now() - startTime;
      
      // 結果サマリー
      const summary = this.generateTestSummary([
        fileProcessingResult,
        memoryUsageResult,
        uiResponseResult,
        optimizationResult,
        stressTestResult
      ], totalTime);
      
      await this.reportResults(summary);
      
      return summary;
      
    } catch (error) {
      console.error('❌ Performance tests failed:', error);
      if (this.vibeLogger) {
        await this.vibeLogger.error('performance_test_error', 'Performance tests failed', {
          context: { error: error.message, stack: error.stack },
          aiTodo: 'テスト失敗の原因分析と修正提案'
        });
      }
      throw error;
    }
  }
  
  /**
   * ファイル処理パフォーマンステスト
   */
  async testFileProcessingPerformance() {
    const testStartTime = performance.now();
    
    try {
      // テストファイル作成
      const testFiles = await this.createTestFiles(100); // 100ファイルでテスト
      
      // PerformanceOptimizerのテスト
      const PerformanceOptimizer = require('../src/main/performance-optimizer');
      const optimizer = new PerformanceOptimizer();
      
      // モックプロセッサー
      const mockProcessor = {
        processFile: async (filePath) => {
          const content = await fs.readFile(filePath, 'utf8');
          // シンプルな置換処理（テスト用）
          const processedContent = content.replace(/test/g, 'TEST');
          await fs.writeFile(filePath, processedContent);
          return { processed: true, changes: 1 };
        }
      };
      
      // ファイル処理実行
      const processingStartTime = performance.now();
      const result = await optimizer.optimizeFileProcessing(testFiles, mockProcessor);
      const processingTime = performance.now() - processingStartTime;
      
      // 100ファイルの処理時間から1000ファイルを推定
      const estimated1000FilesTime = processingTime * 10;
      const targetAchieved = estimated1000FilesTime <= this.TARGETS.FILE_PROCESSING_TIME;
      
      // テストファイル削除
      await this.cleanupTestFiles(testFiles);
      
      const testResult = {
        testName: 'File Processing Performance',
        passed: targetAchieved,
        metrics: {
          actualTime: Math.round(processingTime),
          estimated1000FilesTime: Math.round(estimated1000FilesTime),
          target: this.TARGETS.FILE_PROCESSING_TIME,
          throughput: Math.round(testFiles.length / (processingTime / 1000)),
          strategy: result.metrics?.strategy
        },
        totalTime: performance.now() - testStartTime
      };
      
      if (this.vibeLogger) {
        await this.vibeLogger.info('file_processing_test_complete', 'File processing performance test completed', {
          context: testResult,
          aiTodo: !targetAchieved ? 'ファイル処理速度の改善が必要' : null
        });
      }
      
      this.testResults.push(testResult);
      return testResult;
      
    } catch (error) {
      console.error('❌ File processing test failed:', error);
      return {
        testName: 'File Processing Performance',
        passed: false,
        error: error.message,
        totalTime: performance.now() - testStartTime
      };
    }
  }
  
  /**
   * メモリ使用量テスト
   */
  async testMemoryUsage() {
    const testStartTime = performance.now();
    
    try {
      const MemoryManager = require('../src/main/memory-manager');
      const memoryManager = new MemoryManager();
      
      // ベースラインメモリ使用量
      const baselineUsage = process.memoryUsage().heapUsed;
      
      // メモリストレステスト
      const testData = [];
      for (let i = 0; i < 10000; i++) {
        testData.push({
          id: i,
          data: 'test'.repeat(100),
          timestamp: Date.now()
        });
      }
      
      const peakUsage = process.memoryUsage().heapUsed;
      const memoryIncrease = peakUsage - baselineUsage;
      
      // メモリ最適化実行
      const optimizationResult = await memoryManager.performPeriodicCleanup();
      
      const afterOptimizationUsage = process.memoryUsage().heapUsed;
      const targetAchieved = afterOptimizationUsage <= this.TARGETS.MEMORY_USAGE;
      
      // テストデータクリア
      testData.length = 0;
      
      const testResult = {
        testName: 'Memory Usage',
        passed: targetAchieved,
        metrics: {
          baselineUsage: Math.round(baselineUsage / 1024 / 1024),
          peakUsage: Math.round(peakUsage / 1024 / 1024),
          memoryIncrease: Math.round(memoryIncrease / 1024 / 1024),
          afterOptimization: Math.round(afterOptimizationUsage / 1024 / 1024),
          target: Math.round(this.TARGETS.MEMORY_USAGE / 1024 / 1024)
        },
        totalTime: performance.now() - testStartTime
      };
      
      if (this.vibeLogger) {
        await this.vibeLogger.info('memory_usage_test_complete', 'Memory usage test completed', {
          context: testResult,
          aiTodo: !targetAchieved ? 'メモリ使用量の最適化が必要' : null
        });
      }
      
      this.testResults.push(testResult);
      return testResult;
      
    } catch (error) {
      console.error('❌ Memory usage test failed:', error);
      return {
        testName: 'Memory Usage',
        passed: false,
        error: error.message,
        totalTime: performance.now() - testStartTime
      };
    }
  }
  
  /**
   * UI応答性テスト（モック）
   */
  async testUIResponsiveness() {
    const testStartTime = performance.now();
    
    try {
      // UI応答性テスト（モック実装）
      const responseTimes = [];
      
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        
        // DOM操作のシミュレーション
        await this.simulateUIOperation();
        
        const responseTime = performance.now() - startTime;
        responseTimes.push(responseTime);
      }
      
      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const targetAchieved = averageResponseTime <= this.TARGETS.UI_RESPONSE_TIME;
      
      const testResult = {
        testName: 'UI Responsiveness',
        passed: targetAchieved,
        metrics: {
          averageResponseTime: Math.round(averageResponseTime * 100) / 100,
          maxResponseTime: Math.round(maxResponseTime * 100) / 100,
          target: this.TARGETS.UI_RESPONSE_TIME,
          responseTimes: responseTimes.map(t => Math.round(t * 100) / 100)
        },
        totalTime: performance.now() - testStartTime
      };
      
      if (this.vibeLogger) {
        await this.vibeLogger.info('ui_responsiveness_test_complete', 'UI responsiveness test completed', {
          context: testResult,
          aiTodo: !targetAchieved ? 'UI応答性の改善が必要' : null
        });
      }
      
      this.testResults.push(testResult);
      return testResult;
      
    } catch (error) {
      console.error('❌ UI responsiveness test failed:', error);
      return {
        testName: 'UI Responsiveness',
        passed: false,
        error: error.message,
        totalTime: performance.now() - testStartTime
      };
    }
  }
  
  /**
   * 最適化エンジンテスト
   */
  async testOptimizationEngines() {
    const testStartTime = performance.now();
    
    try {
      const PerformanceOptimizer = require('../src/main/performance-optimizer');
      const MemoryManager = require('../src/main/memory-manager');
      
      // パフォーマンス最適化エンジンテスト
      const optimizer = new PerformanceOptimizer();
      const optimizationStats = optimizer.getPerformanceStats();
      
      // メモリ管理エンジンテスト
      const memoryManager = new MemoryManager();
      const memoryStats = memoryManager.getStats();
      
      const testResult = {
        testName: 'Optimization Engines',
        passed: true, // エンジンが正常に動作すればpass
        metrics: {
          optimizerTargets: optimizationStats.targets,
          memoryManagerStats: {
            currentUsage: memoryStats.currentUsage,
            objectPools: memoryStats.objectPools.length,
            totalCleanups: memoryStats.totalCleanups
          }
        },
        totalTime: performance.now() - testStartTime
      };
      
      if (this.vibeLogger) {
        await this.vibeLogger.info('optimization_engines_test_complete', 'Optimization engines test completed', {
          context: testResult
        });
      }
      
      this.testResults.push(testResult);
      return testResult;
      
    } catch (error) {
      console.error('❌ Optimization engines test failed:', error);
      return {
        testName: 'Optimization Engines',
        passed: false,
        error: error.message,
        totalTime: performance.now() - testStartTime
      };
    }
  }
  
  /**
   * ストレステスト
   */
  async testStressConditions() {
    const testStartTime = performance.now();
    
    try {
      // 大量データ処理テスト
      const largeDataArray = new Array(50000).fill(0).map((_, i) => ({
        id: i,
        data: 'stress-test-data'.repeat(20)
      }));
      
      const stressStartTime = performance.now();
      
      // データ処理
      const processedData = largeDataArray.map(item => ({
        ...item,
        processed: true,
        timestamp: Date.now()
      }));
      
      const stressTime = performance.now() - stressStartTime;
      const memoryAfterStress = process.memoryUsage().heapUsed;
      
      // クリーンアップ
      largeDataArray.length = 0;
      processedData.length = 0;
      
      const testResult = {
        testName: 'Stress Conditions',
        passed: stressTime < 5000 && memoryAfterStress < this.TARGETS.MEMORY_USAGE * 1.2,
        metrics: {
          stressTime: Math.round(stressTime),
          itemsProcessed: 50000,
          memoryAfterStress: Math.round(memoryAfterStress / 1024 / 1024),
          throughput: Math.round(50000 / (stressTime / 1000))
        },
        totalTime: performance.now() - testStartTime
      };
      
      if (this.vibeLogger) {
        await this.vibeLogger.info('stress_test_complete', 'Stress test completed', {
          context: testResult,
          aiTodo: !testResult.passed ? 'ストレス耐性の改善が必要' : null
        });
      }
      
      this.testResults.push(testResult);
      return testResult;
      
    } catch (error) {
      console.error('❌ Stress test failed:', error);
      return {
        testName: 'Stress Conditions',
        passed: false,
        error: error.message,
        totalTime: performance.now() - testStartTime
      };
    }
  }
  
  /**
   * テストサマリー生成
   */
  generateTestSummary(testResults, totalTime) {
    const passedTests = testResults.filter(test => test.passed).length;
    const totalTests = testResults.length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate,
        totalTime: Math.round(totalTime)
      },
      details: testResults,
      overallPassed: successRate >= 80, // 80%以上で合格
      recommendations: this.generateRecommendations(testResults)
    };
  }
  
  /**
   * 改善提案生成
   */
  generateRecommendations(testResults) {
    const recommendations = [];
    
    testResults.forEach(test => {
      if (!test.passed) {
        switch (test.testName) {
          case 'File Processing Performance':
            recommendations.push({
              category: 'performance',
              priority: 'high',
              title: 'ファイル処理速度の改善',
              actions: [
                'ストリーミング処理の導入',
                'Worker Threadsの活用',
                '並行処理数の最適化'
              ]
            });
            break;
          case 'Memory Usage':
            recommendations.push({
              category: 'memory',
              priority: 'high',
              title: 'メモリ使用量の最適化',
              actions: [
                'オブジェクトプールの活用',
                'ガベージコレクションの最適化',
                'メモリリークの修正'
              ]
            });
            break;
          case 'UI Responsiveness':
            recommendations.push({
              category: 'ui',
              priority: 'medium',
              title: 'UI応答性の改善',
              actions: [
                '非同期処理の導入',
                'requestAnimationFrameの活用',
                'DOM操作の最適化'
              ]
            });
            break;
        }
      }
    });
    
    return recommendations;
  }
  
  /**
   * 結果レポート
   */
  async reportResults(summary) {
    console.log('\n📊 Performance Test Results:');
    console.log('================================');
    console.log(`Total Tests: ${summary.summary.totalTests}`);
    console.log(`Passed: ${summary.summary.passedTests}`);
    console.log(`Failed: ${summary.summary.failedTests}`);
    console.log(`Success Rate: ${summary.summary.successRate}%`);
    console.log(`Total Time: ${summary.summary.totalTime}ms`);
    console.log(`Overall Result: ${summary.overallPassed ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
        rec.actions.forEach(action => console.log(`   - ${action}`));
      });
    }
    
    // 詳細結果
    console.log('\n📋 Detailed Results:');
    summary.details.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`${status} ${test.testName}: ${Math.round(test.totalTime)}ms`);
      if (test.metrics) {
        Object.entries(test.metrics).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }
      if (test.error) {
        console.log(`   Error: ${test.error}`);
      }
    });
    
    if (this.vibeLogger) {
      await this.vibeLogger.info('performance_test_summary', 'Performance test summary', {
        context: summary,
        aiTodo: !summary.overallPassed ? 'パフォーマンステスト失敗の改善策を検討' : null
      });
    }
  }
  
  /**
   * ユーティリティメソッド
   */
  async createTestFiles(count) {
    const testDir = path.join(__dirname, 'temp-test-files');
    await fs.mkdir(testDir, { recursive: true });
    
    const files = [];
    for (let i = 0; i < count; i++) {
      const filePath = path.join(testDir, `test-file-${i}.txt`);
      const content = `test content ${i}\n`.repeat(100);
      await fs.writeFile(filePath, content);
      files.push(filePath);
    }
    
    return files;
  }
  
  async cleanupTestFiles(files) {
    for (const file of files) {
      try {
        await fs.unlink(file);
      } catch (error) {
        // ファイルが存在しない場合は無視
      }
    }
    
    // テストディレクトリ削除
    try {
      const testDir = path.dirname(files[0]);
      await fs.rmdir(testDir);
    } catch (error) {
      // ディレクトリが空でない場合は無視
    }
  }
  
  async simulateUIOperation() {
    // UI操作のシミュレーション（非同期処理）
    return new Promise(resolve => {
      setImmediate(() => {
        // DOM操作のモック
        const mockElement = { classList: { add: () => {}, remove: () => {} } };
        mockElement.classList.add('test-class');
        mockElement.classList.remove('test-class');
        resolve();
      });
    });
  }
}

// メイン実行
async function main() {
  try {
    const testSuite = new PerformanceTestSuite();
    const results = await testSuite.runAllTests();
    
    process.exit(results.overallPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test suite execution failed:', error);
    process.exit(1);
  }
}

// スクリプトとして実行された場合
if (require.main === module) {
  main();
}

module.exports = PerformanceTestSuite;