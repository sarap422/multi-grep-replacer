const os = require('os');
const { performance } = require('perf_hooks');

/**
 * リアルタイムパフォーマンス監視システム
 * CPU使用率、メモリ使用量、ファイル処理速度、UI応答性を監視
 */
class PerformanceMonitor {
    constructor(options = {}) {
        this.options = {
            monitoringInterval: options.monitoringInterval || 1000, // 1秒間隔
            memoryWarningThreshold: options.memoryWarningThreshold || 200 * 1024 * 1024, // 200MB
            processingTimeWarning: options.processingTimeWarning || 5000, // 5秒
            uiResponseTarget: options.uiResponseTarget || 100, // 100ms
            enableDetailedLogs: options.enableDetailedLogs || false,
            ...options
        };

        // パフォーマンス統計
        this.stats = {
            startTime: null,
            endTime: null,
            filesProcessed: 0,
            totalFiles: 0,
            bytesProcessed: 0,
            operationTimes: [],
            memoryUsage: [],
            cpuUsage: [],
            errors: [],
            warnings: []
        };

        // 現在の監視状態
        this.monitoring = false;
        this.monitoringTimer = null;
        this.lastCpuUsage = process.cpuUsage();
        this.baselineMemory = process.memoryUsage();

        // パフォーマンス閾値
        this.thresholds = {
            UI_RESPONSE_TARGET: 100,     // ms
            BUTTON_CLICK_RESPONSE: 100,  // ms
            TYPING_RESPONSE: 50,         // ms
            FILE_PROCESSING_PER_SEC: 50, // files/sec for medium files
            MEMORY_WARNING: 200,         // MB
            CPU_WARNING: 80,             // %
            OPERATION_WARNING: 5000      // ms
        };

        console.log('📊 パフォーマンス監視システム初期化完了');
    }

    /**
     * 監視を開始
     * @param {number} totalFiles 処理予定ファイル数
     */
    startMonitoring(totalFiles = 0) {
        console.log('📊 パフォーマンス監視開始');
        
        this.stats.startTime = performance.now();
        this.stats.totalFiles = totalFiles;
        this.stats.filesProcessed = 0;
        this.stats.bytesProcessed = 0;
        this.monitoring = true;

        // ベースラインメモリ使用量記録
        this.baselineMemory = process.memoryUsage();
        
        // 定期監視タイマー開始
        this.monitoringTimer = setInterval(() => {
            this._collectSystemMetrics();
        }, this.options.monitoringInterval);

        console.log(`📊 監視開始: ${totalFiles}ファイル予定, メモリベースライン: ${Math.round(this.baselineMemory.heapUsed / 1024 / 1024)}MB`);
    }

    /**
     * 監視を停止
     * @returns {Object} 最終統計情報
     */
    stopMonitoring() {
        console.log('📊 パフォーマンス監視停止');
        
        this.monitoring = false;
        this.stats.endTime = performance.now();
        
        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        // 最終統計計算
        const finalStats = this._calculateFinalStats();
        
        if (this.options.enableDetailedLogs) {
            this._logDetailedStats(finalStats);
        }

        return finalStats;
    }

    /**
     * ファイル処理完了を記録
     * @param {string} filePath 処理ファイルパス
     * @param {number} fileSize ファイルサイズ（バイト）
     * @param {number} processingTime 処理時間（ミリ秒）
     */
    recordFileProcessed(filePath, fileSize, processingTime) {
        this.stats.filesProcessed++;
        this.stats.bytesProcessed += fileSize;
        this.stats.operationTimes.push({
            file: filePath,
            size: fileSize,
            time: processingTime,
            timestamp: performance.now()
        });

        // 処理時間警告
        if (processingTime > this.thresholds.OPERATION_WARNING) {
            const warning = `⚠️ 処理時間警告: ${filePath} (${processingTime}ms)`;
            this.stats.warnings.push(warning);
            console.warn(warning);
        }

        // 進捗ログ
        if (this.stats.filesProcessed % 100 === 0 || this.options.enableDetailedLogs) {
            const progress = this.stats.totalFiles > 0 ? 
                Math.round((this.stats.filesProcessed / this.stats.totalFiles) * 100) : 0;
            console.log(`📊 処理進捗: ${this.stats.filesProcessed}/${this.stats.totalFiles} (${progress}%)`);
        }
    }

    /**
     * UI操作時間を記録
     * @param {string} operation 操作名
     * @param {number} responseTime 応答時間（ミリ秒）
     */
    recordUIOperation(operation, responseTime) {
        const record = {
            operation,
            responseTime,
            timestamp: performance.now(),
            threshold: this._getUIThreshold(operation)
        };

        this.stats.operationTimes.push(record);

        // UI応答性警告
        if (responseTime > record.threshold) {
            const warning = `⚠️ UI応答性警告: ${operation} (${responseTime}ms > ${record.threshold}ms)`;
            this.stats.warnings.push(warning);
            console.warn(warning);
        }

        if (this.options.enableDetailedLogs) {
            console.log(`📊 UI操作: ${operation} = ${responseTime}ms`);
        }
    }

    /**
     * エラーを記録
     * @param {Error} error エラーオブジェクト
     * @param {string} context エラー発生コンテキスト
     */
    recordError(error, context = '') {
        const errorRecord = {
            message: error.message,
            stack: error.stack,
            context,
            timestamp: performance.now()
        };

        this.stats.errors.push(errorRecord);
        console.error(`❌ エラー記録: ${context}`, error);
    }

    /**
     * 現在のパフォーマンス統計を取得
     * @returns {Object} 現在の統計情報
     */
    getCurrentStats() {
        const currentTime = performance.now();
        const elapsed = this.stats.startTime ? (currentTime - this.stats.startTime) / 1000 : 0;
        
        return {
            elapsed: Math.round(elapsed),
            filesProcessed: this.stats.filesProcessed,
            totalFiles: this.stats.totalFiles,
            progress: this.stats.totalFiles > 0 ? 
                Math.round((this.stats.filesProcessed / this.stats.totalFiles) * 100) : 0,
            processingRate: elapsed > 0 ? Math.round(this.stats.filesProcessed / elapsed) : 0,
            bytesProcessed: this.stats.bytesProcessed,
            memoryUsage: this._getCurrentMemoryUsage(),
            cpuUsage: this._getCurrentCPUUsage(),
            warnings: this.stats.warnings.length,
            errors: this.stats.errors.length
        };
    }

    /**
     * システムメトリクスを定期収集
     * @private
     */
    _collectSystemMetrics() {
        if (!this.monitoring) return;

        // メモリ使用量
        const memUsage = process.memoryUsage();
        const memoryRecord = {
            heapUsed: memUsage.heapUsed,
            heapTotal: memUsage.heapTotal,
            external: memUsage.external,
            rss: memUsage.rss,
            timestamp: performance.now()
        };
        this.stats.memoryUsage.push(memoryRecord);

        // メモリ警告チェック
        if (memUsage.heapUsed > this.options.memoryWarningThreshold) {
            const warning = `⚠️ メモリ使用量警告: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`;
            this.stats.warnings.push(warning);
            console.warn(warning);
        }

        // CPU使用率
        const cpuUsage = process.cpuUsage(this.lastCpuUsage);
        const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / (this.options.monitoringInterval / 1000) * 100;
        
        this.stats.cpuUsage.push({
            percent: cpuPercent,
            user: cpuUsage.user,
            system: cpuUsage.system,
            timestamp: performance.now()
        });

        this.lastCpuUsage = process.cpuUsage();

        // CPU警告チェック
        if (cpuPercent > this.thresholds.CPU_WARNING) {
            const warning = `⚠️ CPU使用率警告: ${Math.round(cpuPercent)}%`;
            this.stats.warnings.push(warning);
            console.warn(warning);
        }

        // 古いデータの削除（メモリ効率化）
        const maxRecords = 1000;
        if (this.stats.memoryUsage.length > maxRecords) {
            this.stats.memoryUsage = this.stats.memoryUsage.slice(-maxRecords);
        }
        if (this.stats.cpuUsage.length > maxRecords) {
            this.stats.cpuUsage = this.stats.cpuUsage.slice(-maxRecords);
        }
    }

    /**
     * 最終統計を計算
     * @returns {Object} 最終統計情報
     * @private
     */
    _calculateFinalStats() {
        const totalTime = (this.stats.endTime - this.stats.startTime) / 1000; // 秒
        const avgMemory = this._calculateAverage(this.stats.memoryUsage.map(m => m.heapUsed));
        const maxMemory = Math.max(...this.stats.memoryUsage.map(m => m.heapUsed));
        const avgCPU = this._calculateAverage(this.stats.cpuUsage.map(c => c.percent));
        const maxCPU = Math.max(...this.stats.cpuUsage.map(c => c.percent));

        // 処理速度計算
        const processingRate = totalTime > 0 ? this.stats.filesProcessed / totalTime : 0;
        const throughput = totalTime > 0 ? this.stats.bytesProcessed / totalTime : 0;

        // UI応答性統計
        const uiOperations = this.stats.operationTimes.filter(op => op.operation);
        const avgUIResponse = this._calculateAverage(uiOperations.map(op => op.responseTime));
        const maxUIResponse = uiOperations.length > 0 ? Math.max(...uiOperations.map(op => op.responseTime)) : 0;

        return {
            summary: {
                totalTime: Math.round(totalTime),
                filesProcessed: this.stats.filesProcessed,
                totalFiles: this.stats.totalFiles,
                completionRate: this.stats.totalFiles > 0 ? 
                    Math.round((this.stats.filesProcessed / this.stats.totalFiles) * 100) : 100,
                processingRate: Math.round(processingRate),
                throughput: Math.round(throughput / 1024), // KB/s
                errorsCount: this.stats.errors.length,
                warningsCount: this.stats.warnings.length
            },
            performance: {
                memory: {
                    baseline: Math.round(this.baselineMemory.heapUsed / 1024 / 1024),
                    average: Math.round(avgMemory / 1024 / 1024),
                    peak: Math.round(maxMemory / 1024 / 1024),
                    unit: 'MB'
                },
                cpu: {
                    average: Math.round(avgCPU),
                    peak: Math.round(maxCPU),
                    unit: '%'
                },
                ui: {
                    averageResponse: Math.round(avgUIResponse || 0),
                    maxResponse: Math.round(maxUIResponse),
                    operations: uiOperations.length,
                    unit: 'ms'
                }
            },
            thresholds: {
                memoryExceeded: maxMemory > this.options.memoryWarningThreshold,
                cpuExceeded: maxCPU > this.thresholds.CPU_WARNING,
                uiResponseExceeded: maxUIResponse > this.thresholds.UI_RESPONSE_TARGET,
                processingRate: processingRate >= this.thresholds.FILE_PROCESSING_PER_SEC
            },
            issues: {
                errors: this.stats.errors,
                warnings: this.stats.warnings.slice(-10) // 最新10件のみ
            }
        };
    }

    /**
     * 詳細統計をログ出力
     * @param {Object} stats 統計情報
     * @private
     */
    _logDetailedStats(stats) {
        console.log('\n📊 === パフォーマンス統計詳細 ===');
        console.log(`⏱️ 総実行時間: ${stats.summary.totalTime}秒`);
        console.log(`📁 処理ファイル数: ${stats.summary.filesProcessed}/${stats.summary.totalFiles} (${stats.summary.completionRate}%)`);
        console.log(`🚀 処理速度: ${stats.summary.processingRate}ファイル/秒`);
        console.log(`📊 スループット: ${stats.summary.throughput}KB/秒`);
        
        console.log('\n💾 メモリ使用量:');
        console.log(`  ベースライン: ${stats.performance.memory.baseline}MB`);
        console.log(`  平均: ${stats.performance.memory.average}MB`);
        console.log(`  ピーク: ${stats.performance.memory.peak}MB`);
        
        console.log('\n🖥️ CPU使用率:');
        console.log(`  平均: ${stats.performance.cpu.average}%`);
        console.log(`  ピーク: ${stats.performance.cpu.peak}%`);
        
        console.log('\n🖱️ UI応答性:');
        console.log(`  平均応答時間: ${stats.performance.ui.averageResponse}ms`);
        console.log(`  最大応答時間: ${stats.performance.ui.maxResponse}ms`);
        console.log(`  UI操作回数: ${stats.performance.ui.operations}回`);
        
        if (stats.summary.errorsCount > 0) {
            console.log(`\n❌ エラー: ${stats.summary.errorsCount}件`);
        }
        
        if (stats.summary.warningsCount > 0) {
            console.log(`\n⚠️ 警告: ${stats.summary.warningsCount}件`);
        }
        
        console.log('📊 === 統計詳細終了 ===\n');
    }

    /**
     * 現在のメモリ使用量を取得
     * @returns {Object} メモリ使用量情報
     * @private
     */
    _getCurrentMemoryUsage() {
        const usage = process.memoryUsage();
        return {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
            external: Math.round(usage.external / 1024 / 1024), // MB
            rss: Math.round(usage.rss / 1024 / 1024) // MB
        };
    }

    /**
     * 現在のCPU使用率を取得
     * @returns {number} CPU使用率（%）
     * @private
     */
    _getCurrentCPUUsage() {
        const cpus = os.cpus();
        let totalIdle = 0;
        let totalTick = 0;

        cpus.forEach(cpu => {
            for (let type in cpu.times) {
                totalTick += cpu.times[type];
            }
            totalIdle += cpu.times.idle;
        });

        return Math.round(100 - (totalIdle / totalTick) * 100);
    }

    /**
     * UI操作の閾値を取得
     * @param {string} operation 操作名
     * @returns {number} 閾値（ミリ秒）
     * @private
     */
    _getUIThreshold(operation) {
        const thresholds = {
            'button-click': this.thresholds.BUTTON_CLICK_RESPONSE,
            'typing': this.thresholds.TYPING_RESPONSE,
            'folder-select': 200,
            'config-load': 300,
            'file-search': 500
        };

        return thresholds[operation] || this.thresholds.UI_RESPONSE_TARGET;
    }

    /**
     * 配列の平均値を計算
     * @param {number[]} values 数値配列
     * @returns {number} 平均値
     * @private
     */
    _calculateAverage(values) {
        if (values.length === 0) return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }

    /**
     * パフォーマンスレポートを生成
     * @returns {Object} レポート情報
     */
    generateReport() {
        const stats = this.monitoring ? this.getCurrentStats() : this._calculateFinalStats();
        
        return {
            timestamp: new Date().toISOString(),
            monitoring: this.monitoring,
            systemInfo: {
                platform: os.platform(),
                arch: os.arch(),
                cpuCount: os.cpus().length,
                totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024), // GB
                nodeVersion: process.version
            },
            statistics: stats,
            recommendations: this._generateRecommendations(stats)
        };
    }

    /**
     * パフォーマンス改善提案を生成
     * @param {Object} stats 統計情報
     * @returns {string[]} 改善提案
     * @private
     */
    _generateRecommendations(stats) {
        const recommendations = [];

        if (stats.performance?.memory?.peak > 150) {
            recommendations.push('メモリ使用量が高めです。大容量ファイルの処理時はStream処理の使用を検討してください。');
        }

        if (stats.performance?.cpu?.peak > 70) {
            recommendations.push('CPU使用率が高めです。並行処理数を減らすか、Worker Threadsの使用を検討してください。');
        }

        if (stats.performance?.ui?.maxResponse > 200) {
            recommendations.push('UI応答時間が遅めです。非同期処理の最適化を検討してください。');
        }

        if (stats.summary?.processingRate < 30) {
            recommendations.push('ファイル処理速度が遅めです。並行処理の増加やファイルフィルタリングの最適化を検討してください。');
        }

        return recommendations;
    }
}

module.exports = PerformanceMonitor;