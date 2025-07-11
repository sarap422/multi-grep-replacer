const { createFileLogger } = require('vibelogger');
const path = require('path');

/**
 * Debug Logger with Vibe Logger Integration
 * AI可読な構造化ログとパフォーマンス監視
 */
class DebugLogger {
  constructor() {
    // Vibe Logger インスタンス作成
    this.vibeLogger = createFileLogger('multi_grep_replacer', {
      logDir: path.join(process.cwd(), 'logs', 'vibe'),
      maxFiles: 10,
      maxSize: '10mb'
    });
    
    // パフォーマンス監視設定
    this.performanceTargets = {
      UI_RESPONSE_TIME: 100,      // ms
      IPC_RESPONSE_TIME: 50,      // ms
      FILE_SEARCH_TIME: 5000,     // ms per 1000 files
      MEMORY_LIMIT: 200 * 1024 * 1024  // 200MB
    };
    
    // エラー統計
    this.errorStats = {
      total: 0,
      byType: {},
      recent: []
    };
    
    this.initializeLogger();
  }
  
  /**
   * Logger初期化
   */
  initializeLogger() {
    this.vibeLogger.info({
      operation: 'debug_logger_initialization',
      message: 'Debug Logger with Vibe Logger Integration 初期化',
      context: {
        node_version: process.version,
        electron_version: process.versions.electron,
        platform: process.platform,
        architecture: process.arch,
        working_directory: process.cwd(),
        performance_targets: this.performanceTargets,
        log_directory: path.join(process.cwd(), 'logs', 'vibe')
      },
      human_note: 'Multi Grep Replacer デバッグ環境が正常に初期化されました',
      ai_todo: 'パフォーマンス監視とエラー追跡が有効化されました'
    });
  }
  
  /**
   * Electron特有のエラーを構造化記録
   */
  logElectronError(operation, error, context = {}) {
    this.errorStats.total++;
    this.errorStats.byType[error.code || 'unknown'] = 
      (this.errorStats.byType[error.code || 'unknown'] || 0) + 1;
    
    const errorInfo = {
      operation,
      message: error.message,
      context: {
        ...context,
        error_code: error.code,
        error_name: error.name,
        error_stack: error.stack,
        process_type: process.type,
        node_version: process.version,
        electron_version: process.versions.electron,
        platform: process.platform,
        memory_usage: process.memoryUsage(),
        timestamp: new Date().toISOString(),
        error_stats: this.errorStats
      },
      human_note: `Electronエラー発生: ${operation} - ${error.message}`,
      ai_todo: 'エラーパターンを分析して解決方法を提案してください'
    };
    
    this.vibeLogger.error(errorInfo);
    
    // 最近のエラーに追加（最大10件）
    this.errorStats.recent.unshift({
      operation,
      error: error.message,
      timestamp: Date.now()
    });
    if (this.errorStats.recent.length > 10) {
      this.errorStats.recent.pop();
    }
  }
  
  /**
   * Task完了記録
   */
  logTaskCompletion(taskId, details) {
    this.vibeLogger.info({
      operation: 'task_completion',
      message: `Task ${taskId} 完了`,
      context: {
        task_id: taskId,
        completion_time: new Date().toISOString(),
        memory_usage: process.memoryUsage(),
        ...details
      },
      human_note: `Task ${taskId} が正常に完了しました`,
      ai_todo: 'Task完了状況をCHANGELOG.mdに記録してください'
    });
  }
  
  /**
   * パフォーマンス問題記録
   */
  logPerformanceIssue(operation, metrics) {
    const severity = this.calculatePerformanceSeverity(operation, metrics);
    
    const performanceInfo = {
      operation: 'performance_issue',
      message: `パフォーマンス問題検出: ${operation}`,
      context: {
        operation,
        metrics,
        severity,
        targets: this.performanceTargets,
        memory_usage: process.memoryUsage(),
        timestamp: Date.now(),
        suggestions: this.getPerformanceSuggestions(operation, metrics)
      },
      human_note: `性能問題: ${operation} - ${JSON.stringify(metrics)}`,
      ai_todo: 'パフォーマンス最適化方法を提案してください'
    };
    
    if (severity === 'critical') {
      this.vibeLogger.error(performanceInfo);
    } else if (severity === 'warning') {
      this.vibeLogger.warn(performanceInfo);
    } else {
      this.vibeLogger.info(performanceInfo);
    }
  }
  
  /**
   * パフォーマンス成功記録
   */
  logPerformanceSuccess(operation, metrics) {
    this.vibeLogger.info({
      operation: 'performance_success',
      message: `パフォーマンス目標達成: ${operation}`,
      context: {
        operation,
        metrics,
        targets: this.performanceTargets,
        achievement_rate: this.calculateAchievementRate(operation, metrics)
      },
      human_note: `性能目標達成: ${operation}`,
      ai_todo: null
    });
  }
  
  /**
   * IPC通信監視
   */
  logIPCCommunication(channel, direction, data, duration) {
    const isSlowResponse = duration > this.performanceTargets.IPC_RESPONSE_TIME;
    
    const ipcInfo = {
      operation: 'ipc_communication',
      message: `IPC通信: ${channel} (${direction})`,
      context: {
        channel,
        direction,
        duration_ms: duration,
        target_ms: this.performanceTargets.IPC_RESPONSE_TIME,
        data_size: JSON.stringify(data).length,
        is_slow: isSlowResponse,
        timestamp: Date.now()
      },
      human_note: `IPC: ${channel} (${duration}ms)`,
      ai_todo: isSlowResponse ? 'IPC通信の最適化を検討してください' : null
    };
    
    if (isSlowResponse) {
      this.vibeLogger.warn(ipcInfo);
    } else {
      this.vibeLogger.debug(ipcInfo);
    }
  }
  
  /**
   * ファイル操作監視
   */
  logFileOperation(operation, filePath, duration, fileCount = 1) {
    const expectedTime = this.calculateExpectedFileTime(operation, fileCount);
    const isSlowOperation = duration > expectedTime * 1.5; // 1.5倍の余裕
    
    this.vibeLogger.info({
      operation: 'file_operation',
      message: `ファイル操作: ${operation}`,
      context: {
        operation,
        file_path: filePath,
        file_count: fileCount,
        duration_ms: duration,
        expected_ms: expectedTime,
        performance_ratio: duration / expectedTime,
        is_slow: isSlowOperation,
        memory_usage: process.memoryUsage()
      },
      human_note: `ファイル操作: ${operation} (${duration}ms, ${fileCount}件)`,
      ai_todo: isSlowOperation ? 'ファイル操作の最適化を検討してください' : null
    });
  }
  
  /**
   * UI応答性監視
   */
  logUIResponse(elementId, action, responseTime) {
    const isSlowResponse = responseTime > this.performanceTargets.UI_RESPONSE_TIME;
    
    const uiInfo = {
      operation: 'ui_response',
      message: `UI応答性: ${elementId} ${action}`,
      context: {
        element_id: elementId,
        action,
        response_time_ms: responseTime,
        target_ms: this.performanceTargets.UI_RESPONSE_TIME,
        performance_rating: this.getUIPerformanceRating(responseTime),
        is_slow: isSlowResponse,
        timestamp: Date.now()
      },
      human_note: `UI応答: ${elementId} (${responseTime}ms)`,
      ai_todo: isSlowResponse ? 'UI応答性の改善を検討してください' : null
    };
    
    if (isSlowResponse) {
      this.vibeLogger.warn(uiInfo);
    } else {
      this.vibeLogger.debug(uiInfo);
    }
  }
  
  /**
   * 自動分析レポート生成
   */
  generateAnalysisReport() {
    const memoryUsage = process.memoryUsage();
    const isHighMemory = memoryUsage.heapUsed > this.performanceTargets.MEMORY_LIMIT;
    
    this.vibeLogger.info({
      operation: 'analysis_report',
      message: 'システム状態分析レポート',
      context: {
        memory_usage: memoryUsage,
        memory_limit: this.performanceTargets.MEMORY_LIMIT,
        is_high_memory: isHighMemory,
        error_stats: this.errorStats,
        uptime_seconds: process.uptime(),
        performance_targets: this.performanceTargets,
        recommendations: this.generateRecommendations()
      },
      human_note: 'システム状態の自動分析が完了しました',
      ai_todo: `
        システム分析結果に基づいて以下を検討してください：
        1. メモリ使用量の最適化
        2. エラー頻度の削減
        3. パフォーマンス改善
        
        分析結果をlogs/PATTERNS.mdに記録してください
      `
    });
  }
  
  /**
   * パフォーマンス重要度計算
   * @private
   */
  calculatePerformanceSeverity(operation, metrics) {
    if (operation === 'ui_response' && metrics.response_time_ms > this.performanceTargets.UI_RESPONSE_TIME * 2) {
      return 'critical';
    }
    if (operation === 'memory_usage' && metrics.memory_mb > this.performanceTargets.MEMORY_LIMIT / 1024 / 1024) {
      return 'critical';
    }
    if (metrics.performance_ratio > 1.5) {
      return 'warning';
    }
    return 'info';
  }
  
  /**
   * パフォーマンス改善提案生成
   * @private
   */
  getPerformanceSuggestions(operation, _metrics) {
    const suggestions = [];
    
    if (operation === 'ui_response') {
      suggestions.push('非同期処理への移行');
      suggestions.push('DOM操作の最適化');
      suggestions.push('イベントハンドラーの軽量化');
    }
    
    if (operation === 'file_search') {
      suggestions.push('Worker Threadsの使用');
      suggestions.push('ファイル検索の並行処理');
      suggestions.push('除外パターンの最適化');
    }
    
    if (operation === 'ipc_communication') {
      suggestions.push('データ転送量の削減');
      suggestions.push('IPC呼び出し頻度の最適化');
      suggestions.push('レスポンスキャッシュの実装');
    }
    
    return suggestions;
  }
  
  /**
   * 達成率計算
   * @private
   */
  calculateAchievementRate(operation, metrics) {
    if (operation === 'ui_response') {
      return Math.min(100, (this.performanceTargets.UI_RESPONSE_TIME / metrics.response_time_ms) * 100);
    }
    return 100;
  }
  
  /**
   * 期待ファイル処理時間計算
   * @private
   */
  calculateExpectedFileTime(operation, fileCount) {
    const baseTime = {
      'find_files': 5,      // ms per file
      'read_content': 2,    // ms per file
      'write_content': 3    // ms per file
    };
    
    return (baseTime[operation] || 1) * fileCount;
  }
  
  /**
   * UI性能評価
   * @private
   */
  getUIPerformanceRating(responseTime) {
    if (responseTime <= 50) {return 'excellent';}
    if (responseTime <= 100) {return 'good';}
    if (responseTime <= 200) {return 'acceptable';}
    return 'poor';
  }
  
  /**
   * システム改善提案生成
   * @private
   */
  generateRecommendations() {
    const recommendations = [];
    const memoryUsage = process.memoryUsage();
    
    if (memoryUsage.heapUsed > this.performanceTargets.MEMORY_LIMIT * 0.8) {
      recommendations.push('メモリ使用量が高いため、不要なオブジェクトの解放を検討');
    }
    
    if (this.errorStats.total > 10) {
      recommendations.push('エラー発生頻度が高いため、根本原因の調査が必要');
    }
    
    const recentErrors = this.errorStats.recent.filter((e) => Date.now() - e.timestamp < 60000);
    if (recentErrors.length > 3) {
      recommendations.push('直近1分間でエラーが多発しています');
    }
    
    return recommendations;
  }
}

module.exports = new DebugLogger();