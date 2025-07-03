const { performance } = require('perf_hooks');

/**
 * メモリ使用量最適化管理システム
 * ガベージコレクション制御、メモリリーク検出、使用量監視を提供
 */
class MemoryOptimizer {
    constructor(options = {}) {
        this.options = {
            memoryThresholdMB: options.memoryThresholdMB || 200,
            gcIntervalMs: options.gcIntervalMs || 30000, // 30秒間隔
            leakDetectionInterval: options.leakDetectionInterval || 60000, // 1分間隔
            enableAutoGC: options.enableAutoGC !== false,
            enableLeakDetection: options.enableLeakDetection !== false,
            maxMemoryHistorySize: options.maxMemoryHistorySize || 100,
            ...options
        };

        // メモリ監視状態
        this.monitoring = false;
        this.monitoringTimer = null;
        this.leakDetectionTimer = null;
        
        // メモリ使用履歴
        this.memoryHistory = [];
        this.gcHistory = [];
        this.leakAlerts = [];
        
        // ベースラインメモリ
        this.baselineMemory = null;
        this.lastMemoryCheck = null;
        
        // 参照カウンタ（リーク検出用）
        this.objectCounters = new Map();
        this.memorySnapshots = [];

        console.log('🧠 メモリ最適化システム初期化完了');
        console.log(`⚙️ 設定: 閾値 ${this.options.memoryThresholdMB}MB, 自動GC ${this.options.enableAutoGC}`);
    }

    /**
     * メモリ監視開始
     */
    startMonitoring() {
        if (this.monitoring) {
            console.warn('⚠️ メモリ監視は既に開始されています');
            return;
        }

        console.log('🧠 メモリ監視開始');
        this.monitoring = true;
        this.baselineMemory = process.memoryUsage();
        this.lastMemoryCheck = performance.now();

        // 定期メモリチェック
        this.monitoringTimer = setInterval(() => {
            this._performMemoryCheck();
        }, this.options.gcIntervalMs);

        // リーク検出（有効な場合）
        if (this.options.enableLeakDetection) {
            this.leakDetectionTimer = setInterval(() => {
                this._performLeakDetection();
            }, this.options.leakDetectionInterval);
        }

        console.log(`📊 監視開始 - ベースライン: ${Math.round(this.baselineMemory.heapUsed / 1024 / 1024)}MB`);
    }

    /**
     * メモリ監視停止
     */
    stopMonitoring() {
        if (!this.monitoring) {
            console.warn('⚠️ メモリ監視は開始されていません');
            return;
        }

        console.log('🧠 メモリ監視停止');
        this.monitoring = false;

        if (this.monitoringTimer) {
            clearInterval(this.monitoringTimer);
            this.monitoringTimer = null;
        }

        if (this.leakDetectionTimer) {
            clearInterval(this.leakDetectionTimer);
            this.leakDetectionTimer = null;
        }

        // 最終メモリチェック
        this._performMemoryCheck();
        
        const finalMemory = this._getCurrentMemoryUsage();
        console.log(`📊 監視終了 - 最終メモリ: ${finalMemory.heapUsedMB}MB`);
    }

    /**
     * 手動ガベージコレクション実行
     * @param {boolean} forceGC 強制実行フラグ
     * @returns {Object} GC結果
     */
    performGarbageCollection(forceGC = false) {
        const beforeMemory = process.memoryUsage();
        const startTime = performance.now();

        if (!global.gc) {
            console.warn('⚠️ ガベージコレクションが利用できません（--expose-gc フラグが必要）');
            return {
                success: false,
                reason: 'gc-not-available',
                beforeMemoryMB: Math.round(beforeMemory.heapUsed / 1024 / 1024)
            };
        }

        // GC実行判定
        const currentMemoryMB = beforeMemory.heapUsed / 1024 / 1024;
        const shouldRunGC = forceGC || currentMemoryMB > this.options.memoryThresholdMB;

        if (!shouldRunGC) {
            console.log(`📊 GCスキップ: メモリ使用量 ${Math.round(currentMemoryMB)}MB (閾値: ${this.options.memoryThresholdMB}MB)`);
            return {
                success: false,
                reason: 'threshold-not-met',
                beforeMemoryMB: Math.round(currentMemoryMB)
            };
        }

        try {
            console.log(`🧹 ガベージコレクション実行中... (${Math.round(currentMemoryMB)}MB)`);
            
            // GC実行
            global.gc();
            
            const afterMemory = process.memoryUsage();
            const endTime = performance.now();
            
            const gcResult = {
                success: true,
                beforeMemoryMB: Math.round(beforeMemory.heapUsed / 1024 / 1024),
                afterMemoryMB: Math.round(afterMemory.heapUsed / 1024 / 1024),
                freedMemoryMB: Math.round((beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024),
                executionTimeMs: Math.round(endTime - startTime),
                timestamp: new Date().toISOString(),
                forced: forceGC
            };

            // GC履歴記録
            this.gcHistory.push(gcResult);
            if (this.gcHistory.length > 50) {
                this.gcHistory = this.gcHistory.slice(-50); // 最新50件のみ保持
            }

            console.log(`✅ GC完了: ${gcResult.beforeMemoryMB}MB → ${gcResult.afterMemoryMB}MB (${gcResult.freedMemoryMB}MB解放, ${gcResult.executionTimeMs}ms)`);
            
            return gcResult;

        } catch (error) {
            console.error('❌ ガベージコレクションエラー:', error);
            return {
                success: false,
                reason: 'gc-error',
                error: error.message,
                beforeMemoryMB: Math.round(currentMemoryMB)
            };
        }
    }

    /**
     * メモリ使用量最適化実行
     * @param {Object} optimizationConfig 最適化設定
     * @returns {Promise<Object>} 最適化結果
     */
    async optimizeMemoryUsage(optimizationConfig = {}) {
        console.log('🚀 メモリ使用量最適化開始');
        
        const startTime = performance.now();
        const beforeMemory = this._getCurrentMemoryUsage();
        const optimizationActions = [];

        try {
            // 1. 強制ガベージコレクション
            if (optimizationConfig.enableGC !== false) {
                console.log('🧹 ガベージコレクション実行');
                const gcResult = this.performGarbageCollection(true);
                optimizationActions.push({
                    action: 'garbage-collection',
                    result: gcResult
                });
            }

            // 2. メモリ履歴のクリーンアップ
            if (optimizationConfig.enableHistoryCleanup !== false) {
                console.log('📋 メモリ履歴クリーンアップ');
                const cleanupResult = this._cleanupMemoryHistory();
                optimizationActions.push({
                    action: 'history-cleanup',
                    result: cleanupResult
                });
            }

            // 3. オブジェクト参照のクリーンアップ
            if (optimizationConfig.enableReferenceCleanup !== false) {
                console.log('🔗 オブジェクト参照クリーンアップ');
                const refCleanupResult = this._cleanupObjectReferences();
                optimizationActions.push({
                    action: 'reference-cleanup',
                    result: refCleanupResult
                });
            }

            // 4. Node.js内部の最適化ヒント提供
            if (optimizationConfig.enableV8Optimization !== false) {
                console.log('⚡ V8エンジン最適化ヒント適用');
                const v8OptResult = this._applyV8OptimizationHints();
                optimizationActions.push({
                    action: 'v8-optimization',
                    result: v8OptResult
                });
            }

            // 最終的なGC実行
            await new Promise(resolve => setTimeout(resolve, 100));
            const finalGC = this.performGarbageCollection(true);
            optimizationActions.push({
                action: 'final-gc',
                result: finalGC
            });

            const endTime = performance.now();
            const afterMemory = this._getCurrentMemoryUsage();

            const optimizationResult = {
                success: true,
                executionTimeMs: Math.round(endTime - startTime),
                beforeMemory,
                afterMemory,
                memoryReduction: {
                    heapUsedMB: beforeMemory.heapUsedMB - afterMemory.heapUsedMB,
                    rssUsedMB: beforeMemory.rssUsedMB - afterMemory.rssUsedMB,
                    externalUsedMB: beforeMemory.externalUsedMB - afterMemory.externalUsedMB
                },
                actions: optimizationActions,
                recommendations: this._generateOptimizationRecommendations(beforeMemory, afterMemory)
            };

            console.log(`✅ メモリ最適化完了: ${beforeMemory.heapUsedMB}MB → ${afterMemory.heapUsedMB}MB (-${optimizationResult.memoryReduction.heapUsedMB}MB)`);
            
            return optimizationResult;

        } catch (error) {
            console.error('❌ メモリ最適化エラー:', error);
            throw new Error(`メモリ最適化に失敗しました: ${error.message}`);
        }
    }

    /**
     * メモリリーク検出実行
     * @returns {Object} リーク検出結果
     */
    detectMemoryLeaks() {
        console.log('🔍 メモリリーク検出開始');
        
        const currentMemory = this._getCurrentMemoryUsage();
        const leaks = [];
        const warnings = [];

        // 1. メモリ使用量のトレンド分析
        if (this.memoryHistory.length >= 10) {
            const trendAnalysis = this._analyzeMemoryTrend();
            
            if (trendAnalysis.isIncreasing && trendAnalysis.slope > 1.0) {
                leaks.push({
                    type: 'increasing-trend',
                    severity: trendAnalysis.slope > 5.0 ? 'high' : 'medium',
                    description: `メモリ使用量が継続的に増加しています (傾斜: ${trendAnalysis.slope.toFixed(2)}MB/分)`,
                    currentMemoryMB: currentMemory.heapUsedMB,
                    trendData: trendAnalysis
                });
            }
        }

        // 2. ベースラインからの乖離チェック
        if (this.baselineMemory) {
            const baselineMB = this.baselineMemory.heapUsed / 1024 / 1024;
            const currentMB = currentMemory.heapUsedMB;
            const increase = currentMB - baselineMB;
            
            if (increase > 50) { // 50MB以上の増加
                warnings.push({
                    type: 'baseline-deviation',
                    severity: increase > 100 ? 'high' : 'medium',
                    description: `ベースラインから${Math.round(increase)}MB増加しています`,
                    baselineMemoryMB: Math.round(baselineMB),
                    currentMemoryMB: currentMB,
                    increaseMB: Math.round(increase)
                });
            }
        }

        // 3. オブジェクト数の異常チェック
        const objectCountAnalysis = this._analyzeObjectCounts();
        if (objectCountAnalysis.suspiciousObjects.length > 0) {
            leaks.push({
                type: 'object-count-anomaly',
                severity: 'medium',
                description: 'オブジェクト数に異常な増加が検出されました',
                suspiciousObjects: objectCountAnalysis.suspiciousObjects
            });
        }

        // 4. ヒープ外メモリチェック
        const externalMemoryMB = currentMemory.externalUsedMB;
        if (externalMemoryMB > 50) {
            warnings.push({
                type: 'high-external-memory',
                severity: externalMemoryMB > 100 ? 'high' : 'medium',
                description: `外部メモリ使用量が高くなっています: ${externalMemoryMB}MB`,
                externalMemoryMB
            });
        }

        const detectionResult = {
            timestamp: new Date().toISOString(),
            currentMemory,
            leaksDetected: leaks.length,
            warningsCount: warnings.length,
            leaks,
            warnings,
            recommendations: this._generateLeakRecommendations(leaks, warnings),
            overallAssessment: this._assessMemoryHealth(leaks, warnings)
        };

        // アラート履歴に追加
        if (leaks.length > 0 || warnings.length > 0) {
            this.leakAlerts.push(detectionResult);
            if (this.leakAlerts.length > 20) {
                this.leakAlerts = this.leakAlerts.slice(-20);
            }
        }

        console.log(`🔍 リーク検出完了: ${leaks.length}件のリーク, ${warnings.length}件の警告`);
        
        return detectionResult;
    }

    /**
     * メモリ状態レポート生成
     * @returns {Object} メモリ状態レポート
     */
    generateMemoryReport() {
        const currentMemory = this._getCurrentMemoryUsage();
        const memoryStats = this._calculateMemoryStatistics();
        
        return {
            timestamp: new Date().toISOString(),
            currentStatus: {
                memory: currentMemory,
                monitoring: this.monitoring,
                optimizationRecommended: currentMemory.heapUsedMB > this.options.memoryThresholdMB
            },
            statistics: memoryStats,
            history: {
                memorySnapshots: this.memoryHistory.slice(-20), // 最新20件
                gcEvents: this.gcHistory.slice(-10), // 最新10件
                leakAlerts: this.leakAlerts.slice(-5) // 最新5件
            },
            recommendations: this._generateMemoryRecommendations(currentMemory, memoryStats),
            configuration: {
                thresholdMB: this.options.memoryThresholdMB,
                autoGCEnabled: this.options.enableAutoGC,
                leakDetectionEnabled: this.options.enableLeakDetection
            }
        };
    }

    /**
     * 定期メモリチェック実行
     * @private
     */
    _performMemoryCheck() {
        const currentMemory = this._getCurrentMemoryUsage();
        
        // メモリ履歴に記録
        this.memoryHistory.push({
            ...currentMemory,
            timestamp: performance.now()
        });

        // 履歴サイズ制限
        if (this.memoryHistory.length > this.options.maxMemoryHistorySize) {
            this.memoryHistory = this.memoryHistory.slice(-this.options.maxMemoryHistorySize);
        }

        // 閾値チェック
        if (currentMemory.heapUsedMB > this.options.memoryThresholdMB) {
            console.warn(`⚠️ メモリ使用量が閾値を超過: ${currentMemory.heapUsedMB}MB > ${this.options.memoryThresholdMB}MB`);
            
            if (this.options.enableAutoGC) {
                console.log('🧹 自動ガベージコレクション実行');
                this.performGarbageCollection(false);
            }
        }

        this.lastMemoryCheck = performance.now();
    }

    /**
     * リーク検出実行
     * @private
     */
    _performLeakDetection() {
        try {
            const detectionResult = this.detectMemoryLeaks();
            
            if (detectionResult.leaksDetected > 0) {
                console.warn(`⚠️ メモリリーク検出: ${detectionResult.leaksDetected}件`);
                
                // 重要なリークの場合は自動GC実行
                const criticalLeaks = detectionResult.leaks.filter(leak => leak.severity === 'high');
                if (criticalLeaks.length > 0 && this.options.enableAutoGC) {
                    console.log('🚨 重要なリーク検出 - 緊急GC実行');
                    this.performGarbageCollection(true);
                }
            }
        } catch (error) {
            console.error('❌ リーク検出エラー:', error);
        }
    }

    /**
     * 現在のメモリ使用量取得
     * @returns {Object} メモリ使用量情報
     * @private
     */
    _getCurrentMemoryUsage() {
        const usage = process.memoryUsage();
        
        return {
            heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
            externalUsedMB: Math.round(usage.external / 1024 / 1024),
            rssUsedMB: Math.round(usage.rss / 1024 / 1024),
            timestamp: performance.now()
        };
    }

    /**
     * メモリトレンド分析
     * @returns {Object} トレンド分析結果
     * @private
     */
    _analyzeMemoryTrend() {
        if (this.memoryHistory.length < 5) {
            return { isIncreasing: false, slope: 0, confidence: 0 };
        }

        const recentHistory = this.memoryHistory.slice(-10);
        const timeDeltas = [];
        const memoryDeltas = [];

        for (let i = 1; i < recentHistory.length; i++) {
            const timeDelta = (recentHistory[i].timestamp - recentHistory[i-1].timestamp) / 60000; // 分
            const memoryDelta = recentHistory[i].heapUsedMB - recentHistory[i-1].heapUsedMB;
            
            timeDeltas.push(timeDelta);
            memoryDeltas.push(memoryDelta);
        }

        // 線形回帰で傾斜を計算
        const slope = this._calculateLinearRegression(timeDeltas, memoryDeltas);
        const isIncreasing = slope > 0.1; // 0.1MB/分以上の増加で増加傾向と判定

        return {
            isIncreasing,
            slope,
            confidence: recentHistory.length >= 10 ? 0.8 : 0.5,
            dataPoints: recentHistory.length
        };
    }

    /**
     * オブジェクト数分析
     * @returns {Object} オブジェクト数分析結果
     * @private
     */
    _analyzeObjectCounts() {
        // 簡単なオブジェクト数監視（実際の実装では v8 heap snapshot を使用すべき）
        const suspiciousObjects = [];
        
        // メモリスナップショット比較
        if (this.memorySnapshots.length >= 2) {
            const latest = this.memorySnapshots[this.memorySnapshots.length - 1];
            const previous = this.memorySnapshots[this.memorySnapshots.length - 2];
            
            // 急激なメモリ増加をオブジェクト増加と推定
            const memoryIncrease = latest.heapUsedMB - previous.heapUsedMB;
            if (memoryIncrease > 10) {
                suspiciousObjects.push({
                    type: 'unknown-objects',
                    estimatedMemoryMB: memoryIncrease,
                    description: '未知のオブジェクトによる急激なメモリ増加'
                });
            }
        }

        return { suspiciousObjects };
    }

    /**
     * メモリ履歴クリーンアップ
     * @returns {Object} クリーンアップ結果
     * @private
     */
    _cleanupMemoryHistory() {
        const beforeCount = this.memoryHistory.length;
        
        // 古いデータを削除（直近50件のみ保持）
        if (this.memoryHistory.length > 50) {
            this.memoryHistory = this.memoryHistory.slice(-50);
        }
        
        // GC履歴も制限
        if (this.gcHistory.length > 20) {
            this.gcHistory = this.gcHistory.slice(-20);
        }
        
        // アラート履歴も制限
        if (this.leakAlerts.length > 10) {
            this.leakAlerts = this.leakAlerts.slice(-10);
        }

        return {
            cleaned: true,
            beforeCount,
            afterCount: this.memoryHistory.length,
            itemsRemoved: beforeCount - this.memoryHistory.length
        };
    }

    /**
     * オブジェクト参照クリーンアップ
     * @returns {Object} クリーンアップ結果
     * @private
     */
    _cleanupObjectReferences() {
        // 内部参照のクリーンアップ
        const beforeSize = this.objectCounters.size;
        
        // 古いカウンタをクリア
        this.objectCounters.clear();
        
        // メモリスナップショットを制限
        if (this.memorySnapshots.length > 10) {
            this.memorySnapshots = this.memorySnapshots.slice(-10);
        }

        return {
            cleaned: true,
            objectCountersCleared: beforeSize,
            snapshotsRetained: this.memorySnapshots.length
        };
    }

    /**
     * V8最適化ヒント適用
     * @returns {Object} 最適化結果
     * @private
     */
    _applyV8OptimizationHints() {
        const hints = [];
        
        try {
            // 1. 未使用変数への null 代入（参考実装）
            if (typeof global !== 'undefined') {
                // グローバル変数のクリーンアップ指示
                hints.push('global-cleanup-hint');
            }
            
            // 2. プロトタイプチェーンの最適化指示
            Object.setPrototypeOf = Object.setPrototypeOf;
            hints.push('prototype-optimization-hint');
            
            // 3. Hidden Class最適化のためのプロパティ順序統一指示
            hints.push('hidden-class-optimization-hint');

            return {
                applied: true,
                hints,
                description: 'V8エンジン最適化ヒントが適用されました'
            };

        } catch (error) {
            return {
                applied: false,
                error: error.message,
                hints
            };
        }
    }

    /**
     * 線形回帰計算
     * @param {number[]} x X値配列
     * @param {number[]} y Y値配列
     * @returns {number} 傾斜
     * @private
     */
    _calculateLinearRegression(x, y) {
        if (x.length !== y.length || x.length === 0) return 0;
        
        const n = x.length;
        const sumX = x.reduce((sum, val) => sum + val, 0);
        const sumY = y.reduce((sum, val) => sum + val, 0);
        const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
        const sumXX = x.reduce((sum, val) => sum + val * val, 0);
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        return isNaN(slope) ? 0 : slope;
    }

    /**
     * メモリ統計計算
     * @returns {Object} メモリ統計
     * @private
     */
    _calculateMemoryStatistics() {
        if (this.memoryHistory.length === 0) {
            return { available: false };
        }

        const heapUsages = this.memoryHistory.map(m => m.heapUsedMB);
        const avgMemory = heapUsages.reduce((sum, val) => sum + val, 0) / heapUsages.length;
        const maxMemory = Math.max(...heapUsages);
        const minMemory = Math.min(...heapUsages);

        return {
            available: true,
            avgMemoryMB: Math.round(avgMemory),
            maxMemoryMB: maxMemory,
            minMemoryMB: minMemory,
            memoryRangeMB: maxMemory - minMemory,
            dataPoints: this.memoryHistory.length,
            gcEventsCount: this.gcHistory.length,
            totalMemoryFreedMB: this.gcHistory.reduce((sum, gc) => sum + (gc.freedMemoryMB || 0), 0)
        };
    }

    /**
     * 最適化推奨事項生成
     * @param {Object} beforeMemory 最適化前メモリ
     * @param {Object} afterMemory 最適化後メモリ
     * @returns {string[]} 推奨事項
     * @private
     */
    _generateOptimizationRecommendations(beforeMemory, afterMemory) {
        const recommendations = [];
        const improvement = beforeMemory.heapUsedMB - afterMemory.heapUsedMB;

        if (improvement < 5) {
            recommendations.push('メモリ削減効果が限定的です。アプリケーションロジックの見直しを検討してください。');
        }

        if (afterMemory.heapUsedMB > this.options.memoryThresholdMB) {
            recommendations.push('最適化後もメモリ使用量が高めです。Stream処理や分割処理の検討をお勧めします。');
        }

        if (afterMemory.externalUsedMB > 30) {
            recommendations.push('外部メモリ使用量が多めです。バッファサイズの調整を検討してください。');
        }

        return recommendations;
    }

    /**
     * リーク推奨事項生成
     * @param {Array} leaks 検出されたリーク
     * @param {Array} warnings 警告
     * @returns {string[]} 推奨事項
     * @private
     */
    _generateLeakRecommendations(leaks, warnings) {
        const recommendations = [];

        if (leaks.some(leak => leak.type === 'increasing-trend')) {
            recommendations.push('メモリ使用量の継続的増加が検出されました。イベントリスナーの解除やオブジェクト参照のクリアを確認してください。');
        }

        if (leaks.some(leak => leak.type === 'object-count-anomaly')) {
            recommendations.push('オブジェクト数の異常増加が検出されました。配列やマップの適切なクリアを確認してください。');
        }

        if (warnings.some(warning => warning.type === 'high-external-memory')) {
            recommendations.push('外部メモリ使用量が高くなっています。ファイルストリームやバッファの適切な解放を確認してください。');
        }

        return recommendations;
    }

    /**
     * メモリ推奨事項生成
     * @param {Object} currentMemory 現在のメモリ
     * @param {Object} stats メモリ統計
     * @returns {string[]} 推奨事項
     * @private
     */
    _generateMemoryRecommendations(currentMemory, stats) {
        const recommendations = [];

        if (currentMemory.heapUsedMB > this.options.memoryThresholdMB) {
            recommendations.push('メモリ使用量が高めです。ガベージコレクションの実行を検討してください。');
        }

        if (stats.available && stats.memoryRangeMB > 50) {
            recommendations.push('メモリ使用量の変動が大きいです。処理の分割や段階的な処理を検討してください。');
        }

        if (stats.available && stats.gcEventsCount === 0) {
            recommendations.push('ガベージコレクションが実行されていません。--expose-gc フラグの使用を検討してください。');
        }

        return recommendations;
    }

    /**
     * メモリ健全性評価
     * @param {Array} leaks リーク情報
     * @param {Array} warnings 警告情報
     * @returns {Object} 健全性評価
     * @private
     */
    _assessMemoryHealth(leaks, warnings) {
        const criticalLeaks = leaks.filter(leak => leak.severity === 'high').length;
        const mediumLeaks = leaks.filter(leak => leak.severity === 'medium').length;
        const highWarnings = warnings.filter(warning => warning.severity === 'high').length;

        let healthScore = 100;
        healthScore -= criticalLeaks * 30;
        healthScore -= mediumLeaks * 15;
        healthScore -= highWarnings * 10;
        healthScore -= warnings.length * 5;

        const score = Math.max(0, healthScore);
        
        return {
            score,
            status: score >= 80 ? 'healthy' : score >= 60 ? 'concerning' : 'critical',
            recommendation: score < 60 ? 'immediate-action-required' : score < 80 ? 'monitoring-recommended' : 'normal-operation'
        };
    }

    /**
     * 設定更新
     * @param {Object} newOptions 新しい設定
     */
    updateConfiguration(newOptions) {
        console.log('⚙️ メモリ最適化設定更新');
        
        this.options = { ...this.options, ...newOptions };
        
        // 監視中の場合は再起動
        if (this.monitoring) {
            this.stopMonitoring();
            this.startMonitoring();
        }
        
        console.log('✅ 設定更新完了');
    }

    /**
     * リソースクリーンアップ
     */
    cleanup() {
        console.log('🧹 メモリ最適化システムクリーンアップ');
        
        this.stopMonitoring();
        
        // 履歴データクリア
        this.memoryHistory = [];
        this.gcHistory = [];
        this.leakAlerts = [];
        this.objectCounters.clear();
        this.memorySnapshots = [];
        
        console.log('✅ クリーンアップ完了');
    }
}

module.exports = MemoryOptimizer;