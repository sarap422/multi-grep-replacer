const { performance } = require('perf_hooks');

/**
 * タスクスケジューリング最適化システム
 * UI応答性を保証するための非同期処理制御とレスポンス時間管理
 */
class SchedulerOptimizer {
    constructor(options = {}) {
        this.options = {
            maxUIResponseTimeMs: options.maxUIResponseTimeMs || 100,    // UI応答時間目標
            maxBlockingTimeMs: options.maxBlockingTimeMs || 16,        // 最大ブロッキング時間（60fps想定）
            taskSliceTimeMs: options.taskSliceTimeMs || 10,            // タスク分割時間
            highPriorityThreshold: options.highPriorityThreshold || 50, // 高優先度閾値
            maxConcurrentTasks: options.maxConcurrentTasks || 4,       // 最大同時実行タスク数
            enableAdaptiveScheduling: options.enableAdaptiveScheduling !== false,
            enableUIMonitoring: options.enableUIMonitoring !== false,
            ...options
        };

        // スケジューラ状態
        this.running = false;
        this.taskQueue = [];
        this.activeTasks = new Map();
        this.completedTasks = [];
        this.taskCounter = 0;

        // UI応答性監視
        this.uiResponses = [];
        this.currentFrameTime = 0;
        this.frameDrops = 0;
        this.lastFrameTime = performance.now();

        // アダプティブスケジューリング
        this.systemLoad = {
            cpu: 0,
            memory: 0,
            activeTasks: 0,
            responseTime: 0
        };

        // タスク実行統計
        this.executionStats = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            avgExecutionTime: 0,
            maxExecutionTime: 0,
            uiViolations: 0
        };

        console.log('⚡ スケジューラ最適化システム初期化完了');
        console.log(`⚙️ 設定: UI応答性 ${this.options.maxUIResponseTimeMs}ms, タスク分割 ${this.options.taskSliceTimeMs}ms`);
    }

    /**
     * スケジューラ開始
     */
    start() {
        if (this.running) {
            console.warn('⚠️ スケジューラは既に実行中です');
            return;
        }

        console.log('⚡ スケジューラ開始');
        this.running = true;
        this.lastFrameTime = performance.now();

        // メインスケジューリングループ
        this._scheduleNextTick();

        // UI監視開始（有効な場合）
        if (this.options.enableUIMonitoring) {
            this._startUIMonitoring();
        }

        console.log('✅ スケジューラ開始完了');
    }

    /**
     * スケジューラ停止
     */
    stop() {
        if (!this.running) {
            console.warn('⚠️ スケジューラは開始されていません');
            return;
        }

        console.log('⚡ スケジューラ停止');
        this.running = false;

        // 残りのタスクを強制完了
        this._completeRemainingTasks();

        console.log(`✅ スケジューラ停止完了 - 完了タスク: ${this.executionStats.completedTasks}件`);
    }

    /**
     * 高優先度タスクをスケジュール
     * @param {Function} taskFunction タスク関数
     * @param {Object} options タスクオプション
     * @returns {Promise<any>} タスク実行結果
     */
    async scheduleHighPriorityTask(taskFunction, options = {}) {
        return this._scheduleTask(taskFunction, {
            ...options,
            priority: 'high',
            maxExecutionTime: options.maxExecutionTime || 50,
            uiSafe: options.uiSafe !== false
        });
    }

    /**
     * 通常タスクをスケジュール
     * @param {Function} taskFunction タスク関数
     * @param {Object} options タスクオプション
     * @returns {Promise<any>} タスク実行結果
     */
    async scheduleTask(taskFunction, options = {}) {
        return this._scheduleTask(taskFunction, {
            ...options,
            priority: 'normal',
            maxExecutionTime: options.maxExecutionTime || 100,
            uiSafe: options.uiSafe !== false
        });
    }

    /**
     * バックグラウンドタスクをスケジュール
     * @param {Function} taskFunction タスク関数
     * @param {Object} options タスクオプション
     * @returns {Promise<any>} タスク実行結果
     */
    async scheduleBackgroundTask(taskFunction, options = {}) {
        return this._scheduleTask(taskFunction, {
            ...options,
            priority: 'low',
            maxExecutionTime: options.maxExecutionTime || 200,
            uiSafe: true,
            cancellable: options.cancellable !== false
        });
    }

    /**
     * 大容量処理タスクをスケジュール（分割実行）
     * @param {Function} taskFunction タスク関数
     * @param {Array} workItems 作業項目配列
     * @param {Object} options オプション
     * @returns {Promise<Array>} 処理結果配列
     */
    async scheduleBatchTask(taskFunction, workItems, options = {}) {
        console.log(`📦 バッチタスクスケジュール開始: ${workItems.length}項目`);

        const {
            batchSize = 10,
            maxBatchTime = this.options.taskSliceTimeMs,
            priority = 'normal',
            onProgress = null
        } = options;

        const results = [];
        const batches = this._createBatches(workItems, batchSize);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            
            // バッチ処理タスクをスケジュール
            const batchTask = async () => {
                const batchResults = [];
                const startTime = performance.now();

                for (const item of batch) {
                    // UI応答性チェック
                    if (performance.now() - startTime > maxBatchTime) {
                        console.log(`⏰ バッチ時間制限到達 - 残り${batch.length - batchResults.length}項目を次バッチへ`);
                        break;
                    }

                    try {
                        const result = await taskFunction(item, i * batchSize + batchResults.length);
                        batchResults.push(result);
                    } catch (error) {
                        console.error(`❌ バッチ項目処理エラー:`, error);
                        batchResults.push({ error: error.message, item });
                    }
                }

                // 進捗通知
                if (onProgress) {
                    onProgress(results.length + batchResults.length, workItems.length);
                }

                return batchResults;
            };

            // バッチをスケジュール実行
            const batchResults = await this._scheduleTask(batchTask, {
                priority,
                maxExecutionTime: maxBatchTime * 2,
                uiSafe: true,
                taskName: `batch-${i + 1}/${batches.length}`
            });

            results.push(...batchResults);

            // UI応答性確保のため少し待機
            await this._yieldToUI();
        }

        console.log(`✅ バッチタスク完了: ${results.length}/${workItems.length}項目処理`);
        return results;
    }

    /**
     * UI応答時間測定
     * @param {Function} uiOperation UI操作関数
     * @param {string} operationName 操作名
     * @returns {Promise<Object>} 測定結果
     */
    async measureUIResponse(uiOperation, operationName = 'ui-operation') {
        const startTime = performance.now();
        
        try {
            const result = await uiOperation();
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            const measurement = {
                operationName,
                responseTime,
                targetTime: this.options.maxUIResponseTimeMs,
                success: true,
                timestamp: new Date().toISOString(),
                violatesTarget: responseTime > this.options.maxUIResponseTimeMs
            };

            // UI応答履歴に記録
            this.uiResponses.push(measurement);
            if (this.uiResponses.length > 100) {
                this.uiResponses = this.uiResponses.slice(-100);
            }

            // 統計更新
            if (measurement.violatesTarget) {
                this.executionStats.uiViolations++;
                console.warn(`⚠️ UI応答性違反: ${operationName} = ${Math.round(responseTime)}ms (目標: ${this.options.maxUIResponseTimeMs}ms)`);
            }

            console.log(`🖱️ UI応答測定: ${operationName} = ${Math.round(responseTime)}ms`);
            
            return { ...measurement, result };

        } catch (error) {
            const endTime = performance.now();
            const responseTime = endTime - startTime;

            const measurement = {
                operationName,
                responseTime,
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };

            this.uiResponses.push(measurement);
            
            console.error(`❌ UI操作エラー: ${operationName}`, error);
            throw error;
        }
    }

    /**
     * システム負荷に応じたアダプティブ調整
     */
    performAdaptiveOptimization() {
        if (!this.options.enableAdaptiveScheduling) {
            return;
        }

        console.log('🔄 アダプティブスケジューリング調整開始');

        const currentLoad = this._assessSystemLoad();
        const recommendations = this._generateSchedulingRecommendations(currentLoad);

        // 自動調整実行
        recommendations.forEach(rec => {
            switch (rec.action) {
                case 'reduce-concurrency':
                    this.options.maxConcurrentTasks = Math.max(1, this.options.maxConcurrentTasks - 1);
                    console.log(`📉 同時実行数減少: ${this.options.maxConcurrentTasks}`);
                    break;

                case 'increase-concurrency':
                    this.options.maxConcurrentTasks = Math.min(8, this.options.maxConcurrentTasks + 1);
                    console.log(`📈 同時実行数増加: ${this.options.maxConcurrentTasks}`);
                    break;

                case 'reduce-slice-time':
                    this.options.taskSliceTimeMs = Math.max(5, this.options.taskSliceTimeMs - 2);
                    console.log(`⏰ タスク分割時間短縮: ${this.options.taskSliceTimeMs}ms`);
                    break;

                case 'increase-slice-time':
                    this.options.taskSliceTimeMs = Math.min(20, this.options.taskSliceTimeMs + 2);
                    console.log(`⏰ タスク分割時間延長: ${this.options.taskSliceTimeMs}ms`);
                    break;
            }
        });

        console.log('✅ アダプティブ調整完了');
    }

    /**
     * スケジューラ統計取得
     * @returns {Object} スケジューラ統計
     */
    getSchedulerStats() {
        const uiStats = this._calculateUIStats();
        const taskStats = this._calculateTaskStats();

        return {
            timestamp: new Date().toISOString(),
            running: this.running,
            taskQueue: {
                pending: this.taskQueue.length,
                active: this.activeTasks.size,
                completed: this.completedTasks.length
            },
            execution: this.executionStats,
            uiPerformance: uiStats,
            systemLoad: this.systemLoad,
            configuration: {
                maxUIResponseTimeMs: this.options.maxUIResponseTimeMs,
                maxConcurrentTasks: this.options.maxConcurrentTasks,
                taskSliceTimeMs: this.options.taskSliceTimeMs
            },
            recommendations: this._generatePerformanceRecommendations()
        };
    }

    /**
     * タスクをスケジュールキューに追加
     * @param {Function} taskFunction タスク関数
     * @param {Object} options タスクオプション
     * @returns {Promise<any>} タスク実行結果
     * @private
     */
    async _scheduleTask(taskFunction, options = {}) {
        const taskId = ++this.taskCounter;
        const task = {
            id: taskId,
            function: taskFunction,
            priority: options.priority || 'normal',
            maxExecutionTime: options.maxExecutionTime || 100,
            uiSafe: options.uiSafe !== false,
            cancellable: options.cancellable === true,
            taskName: options.taskName || `task-${taskId}`,
            createdAt: performance.now(),
            ...options
        };

        // Promise作成
        return new Promise((resolve, reject) => {
            task.resolve = resolve;
            task.reject = reject;

            // 優先度に応じてキューに挿入
            this._insertTaskByPriority(task);
            
            this.executionStats.totalTasks++;

            console.log(`📋 タスクスケジュール: ${task.taskName} (優先度: ${task.priority})`);

            // スケジューラが停止している場合は自動開始
            if (!this.running) {
                this.start();
            }
        });
    }

    /**
     * 優先度に応じたタスク挿入
     * @param {Object} task タスク
     * @private
     */
    _insertTaskByPriority(task) {
        const priorityValues = { high: 3, normal: 2, low: 1 };
        const taskPriority = priorityValues[task.priority] || 2;

        // 挿入位置を見つける
        let insertIndex = this.taskQueue.length;
        for (let i = 0; i < this.taskQueue.length; i++) {
            const queuePriority = priorityValues[this.taskQueue[i].priority] || 2;
            if (taskPriority > queuePriority) {
                insertIndex = i;
                break;
            }
        }

        this.taskQueue.splice(insertIndex, 0, task);
    }

    /**
     * 次のティック実行スケジュール
     * @private
     */
    _scheduleNextTick() {
        if (!this.running) return;

        // フレーム時間測定
        const currentTime = performance.now();
        this.currentFrameTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;

        // フレームドロップ検出
        if (this.currentFrameTime > this.options.maxBlockingTimeMs * 2) {
            this.frameDrops++;
            console.warn(`⚠️ フレームドロップ検出: ${Math.round(this.currentFrameTime)}ms`);
        }

        // タスク実行
        this._executeTaskSlice();

        // 次のティックをスケジュール
        setImmediate(() => this._scheduleNextTick());
    }

    /**
     * タスクスライス実行
     * @private
     */
    _executeTaskSlice() {
        const sliceStartTime = performance.now();
        const maxSliceTime = this.options.taskSliceTimeMs;

        while (this.taskQueue.length > 0 && 
               this.activeTasks.size < this.options.maxConcurrentTasks &&
               (performance.now() - sliceStartTime) < maxSliceTime) {
            
            const task = this.taskQueue.shift();
            this._executeTask(task);
        }
    }

    /**
     * 単一タスク実行
     * @param {Object} task タスク
     * @private
     */
    async _executeTask(task) {
        const taskStartTime = performance.now();
        this.activeTasks.set(task.id, task);

        try {
            console.log(`▶️ タスク実行開始: ${task.taskName}`);

            // タスク実行（タイムアウト付き）
            const result = await Promise.race([
                task.function(),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Task timeout')), task.maxExecutionTime);
                })
            ]);
            
            const taskEndTime = performance.now();
            const executionTime = taskEndTime - taskStartTime;

            // 実行統計更新
            this.executionStats.completedTasks++;
            this.executionStats.avgExecutionTime = 
                (this.executionStats.avgExecutionTime * (this.executionStats.completedTasks - 1) + executionTime) / 
                this.executionStats.completedTasks;
            this.executionStats.maxExecutionTime = Math.max(this.executionStats.maxExecutionTime, executionTime);

            // UI応答性チェック
            if (executionTime > this.options.maxUIResponseTimeMs) {
                this.executionStats.uiViolations++;
                console.warn(`⚠️ タスクがUI応答性を違反: ${task.taskName} = ${Math.round(executionTime)}ms`);
            }

            // 完了処理
            this.activeTasks.delete(task.id);
            this.completedTasks.push({
                ...task,
                result,
                executionTime,
                completedAt: taskEndTime
            });

            task.resolve(result);
            
            console.log(`✅ タスク完了: ${task.taskName} (${Math.round(executionTime)}ms)`);

        } catch (error) {
            const taskEndTime = performance.now();
            const executionTime = taskEndTime - taskStartTime;

            // エラー統計更新
            this.executionStats.failedTasks++;
            this.activeTasks.delete(task.id);

            task.reject(error);
            
            console.error(`❌ タスクエラー: ${task.taskName} (${Math.round(executionTime)}ms)`, error);
        }
    }

    /**
     * UI監視開始
     * @private
     */
    _startUIMonitoring() {
        // 定期的なUI応答性チェック
        const uiCheckInterval = setInterval(() => {
            if (!this.running) {
                clearInterval(uiCheckInterval);
                return;
            }

            this._performUIHealthCheck();
        }, 1000); // 1秒間隔
    }

    /**
     * UI健全性チェック実行
     * @private
     */
    _performUIHealthCheck() {
        const recentResponses = this.uiResponses.slice(-10);
        
        if (recentResponses.length === 0) return;

        const avgResponseTime = recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length;
        const violations = recentResponses.filter(r => r.violatesTarget).length;

        if (violations > recentResponses.length * 0.3) { // 30%以上が違反
            console.warn(`⚠️ UI応答性低下検出: 平均 ${Math.round(avgResponseTime)}ms, 違反率 ${Math.round(violations / recentResponses.length * 100)}%`);
            
            // 自動調整実行
            if (this.options.enableAdaptiveScheduling) {
                this.performAdaptiveOptimization();
            }
        }
    }

    /**
     * UI処理権を譲る
     * @private
     */
    async _yieldToUI() {
        return new Promise(resolve => setImmediate(resolve));
    }

    /**
     * 配列をバッチに分割
     * @param {Array} items 項目配列
     * @param {number} batchSize バッチサイズ
     * @returns {Array} バッチ配列
     * @private
     */
    _createBatches(items, batchSize) {
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * システム負荷評価
     * @returns {Object} システム負荷情報
     * @private
     */
    _assessSystemLoad() {
        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        const recentUIResponses = this.uiResponses.slice(-20);
        const avgUIResponse = recentUIResponses.length > 0 ?
            recentUIResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentUIResponses.length : 0;

        this.systemLoad = {
            memory: memoryUsage.heapUsed / 1024 / 1024, // MB
            activeTasks: this.activeTasks.size,
            queueLength: this.taskQueue.length,
            avgResponseTime: avgUIResponse,
            frameDrops: this.frameDrops,
            currentFrameTime: this.currentFrameTime
        };

        return this.systemLoad;
    }

    /**
     * スケジューリング推奨事項生成
     * @param {Object} systemLoad システム負荷
     * @returns {Array} 推奨事項
     * @private
     */
    _generateSchedulingRecommendations(systemLoad) {
        const recommendations = [];

        // UI応答性チェック
        if (systemLoad.avgResponseTime > this.options.maxUIResponseTimeMs) {
            if (this.options.maxConcurrentTasks > 2) {
                recommendations.push({ action: 'reduce-concurrency', reason: 'high-ui-response-time' });
            }
            if (this.options.taskSliceTimeMs > 8) {
                recommendations.push({ action: 'reduce-slice-time', reason: 'high-ui-response-time' });
            }
        }

        // フレームドロップチェック
        if (systemLoad.frameDrops > 5) {
            recommendations.push({ action: 'reduce-slice-time', reason: 'frame-drops' });
        }

        // 低負荷時の最適化
        if (systemLoad.avgResponseTime < this.options.maxUIResponseTimeMs * 0.5 &&
            systemLoad.activeTasks < this.options.maxConcurrentTasks * 0.5) {
            recommendations.push({ action: 'increase-concurrency', reason: 'low-system-load' });
        }

        return recommendations;
    }

    /**
     * UI統計計算
     * @returns {Object} UI統計
     * @private
     */
    _calculateUIStats() {
        if (this.uiResponses.length === 0) {
            return { available: false };
        }

        const responses = this.uiResponses;
        const responseTimes = responses.map(r => r.responseTime);
        const violations = responses.filter(r => r.violatesTarget);

        return {
            available: true,
            totalMeasurements: responses.length,
            averageResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
            maxResponseTime: Math.max(...responseTimes),
            minResponseTime: Math.min(...responseTimes),
            violationCount: violations.length,
            violationRate: Math.round((violations.length / responses.length) * 100),
            recentFrameDrops: this.frameDrops
        };
    }

    /**
     * タスク統計計算
     * @returns {Object} タスク統計
     * @private
     */
    _calculateTaskStats() {
        return {
            queueStatus: {
                pending: this.taskQueue.length,
                active: this.activeTasks.size,
                completed: this.completedTasks.length
            },
            performance: {
                totalTasks: this.executionStats.totalTasks,
                completedTasks: this.executionStats.completedTasks,
                failedTasks: this.executionStats.failedTasks,
                successRate: this.executionStats.totalTasks > 0 ? 
                    Math.round((this.executionStats.completedTasks / this.executionStats.totalTasks) * 100) : 0,
                avgExecutionTime: Math.round(this.executionStats.avgExecutionTime),
                maxExecutionTime: Math.round(this.executionStats.maxExecutionTime)
            }
        };
    }

    /**
     * パフォーマンス推奨事項生成
     * @returns {Array} 推奨事項
     * @private
     */
    _generatePerformanceRecommendations() {
        const recommendations = [];

        if (this.executionStats.uiViolations > this.executionStats.completedTasks * 0.1) {
            recommendations.push('UI応答性違反が多発しています。タスクの分割やタイムスライスの調整を検討してください。');
        }

        if (this.executionStats.failedTasks > this.executionStats.totalTasks * 0.05) {
            recommendations.push('タスク失敗率が高くなっています。エラーハンドリングの改善を検討してください。');
        }

        if (this.taskQueue.length > 20) {
            recommendations.push('タスクキューが長くなっています。並行処理数の増加を検討してください。');
        }

        if (this.frameDrops > 10) {
            recommendations.push('フレームドロップが多発しています。タスク実行時間の短縮を検討してください。');
        }

        return recommendations;
    }

    /**
     * 残りタスクの強制完了
     * @private
     */
    _completeRemainingTasks() {
        // 待機中のタスクをキャンセル
        this.taskQueue.forEach(task => {
            if (task.cancellable) {
                task.reject(new Error('Scheduler stopped'));
                this.executionStats.failedTasks++;
            }
        });
        this.taskQueue = [];

        // アクティブタスクの完了を待つ（タイムアウト付き）
        const activeTaskPromises = Array.from(this.activeTasks.values()).map(task => {
            return new Promise(resolve => {
                // 最大1秒待機
                const timeout = setTimeout(() => {
                    console.warn(`⚠️ タスク強制終了: ${task.taskName}`);
                    task.reject(new Error('Force terminated'));
                    resolve();
                }, 1000);

                // タスクが自然完了した場合
                task.resolve = ((originalResolve) => (result) => {
                    clearTimeout(timeout);
                    originalResolve(result);
                    resolve();
                })(task.resolve);

                task.reject = ((originalReject) => (error) => {
                    clearTimeout(timeout);
                    originalReject(error);
                    resolve();
                })(task.reject);
            });
        });

        return Promise.all(activeTaskPromises);
    }

    /**
     * リソースクリーンアップ
     */
    cleanup() {
        console.log('🧹 スケジューラ最適化システムクリーンアップ');
        
        this.stop();
        
        // 履歴データクリア
        this.taskQueue = [];
        this.activeTasks.clear();
        this.completedTasks = [];
        this.uiResponses = [];
        
        console.log('✅ クリーンアップ完了');
    }
}

module.exports = SchedulerOptimizer;