/**
 * Performance Monitor for Renderer Process
 * UI応答性とパフォーマンス監視（100ms目標）
 */
class PerformanceMonitor {
  constructor() {
    // パフォーマンス目標設定
    this.targets = {
      UI_RESPONSE_TIME: 100,    // ms
      FORM_INPUT_DELAY: 50,     // ms
      PAGE_LOAD_TIME: 2000,     // ms
      MEMORY_CHECK_INTERVAL: 30000  // 30秒
    };
    
    // 監視統計
    this.stats = {
      uiResponses: [],
      slowResponses: 0,
      totalInteractions: 0,
      memoryWarnings: 0
    };
    
    // 警告表示用コンテナ
    this.warningContainer = null;
    
    this.initialize();
  }
  
  /**
   * パフォーマンス監視初期化
   */
  initialize() {
    this.createWarningContainer();
    this.startMemoryMonitoring();
    this.setupGlobalEventListeners();
    
    console.log('🚀 Performance Monitor initialized - Target: 100ms UI response');
  }
  
  /**
   * 警告表示用コンテナ作成
   */
  createWarningContainer() {
    this.warningContainer = document.createElement('div');
    this.warningContainer.id = 'performance-warnings';
    this.warningContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      max-width: 400px;
      pointer-events: none;
    `;
    document.body.appendChild(this.warningContainer);
  }
  
  /**
   * UI要素の応答性監視
   */
  monitorButtonResponse(buttonElement, actionName) {
    if (!buttonElement) return;
    
    const originalHandler = buttonElement.onclick;
    
    buttonElement.addEventListener('click', (event) => {
      const startTime = performance.now();
      this.stats.totalInteractions++;
      
      // 元のハンドラーを実行
      if (originalHandler) {
        originalHandler.call(buttonElement, event);
      }
      
      // 応答時間測定（次のフレームで測定）
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        this.recordUIResponse(actionName, responseTime, buttonElement.id);
      });
    });
  }
  
  /**
   * フォーム入力監視
   */
  monitorFormInput(inputElement, fieldName) {
    if (!inputElement) return;
    
    let lastInputTime = 0;
    
    inputElement.addEventListener('input', () => {
      const inputTime = performance.now();
      
      if (lastInputTime > 0) {
        const delay = inputTime - lastInputTime;
        
        if (delay > this.targets.FORM_INPUT_DELAY) {
          this.logPerformanceIssue('form_input_delay', {
            field_name: fieldName,
            delay_ms: delay,
            target_ms: this.targets.FORM_INPUT_DELAY
          });
        }
      }
      
      lastInputTime = inputTime;
    });
  }
  
  /**
   * 非同期操作監視
   */
  async monitorAsyncOperation(operationName, asyncFunction, ...args) {
    const startTime = performance.now();
    
    try {
      const result = await asyncFunction(...args);
      const duration = performance.now() - startTime;
      
      this.logPerformanceSuccess(operationName, {
        duration_ms: duration,
        operation: operationName,
        success: true
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.logPerformanceIssue('async_operation_error', {
        operation: operationName,
        duration_ms: duration,
        error_message: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * ページ読み込み時間監視
   */
  monitorPageLoad() {
    const startTime = performance.now();
    
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      
      if (loadTime > this.targets.PAGE_LOAD_TIME) {
        this.logPerformanceIssue('page_load_slow', {
          load_time_ms: loadTime,
          target_ms: this.targets.PAGE_LOAD_TIME
        });
      } else {
        this.logPerformanceSuccess('page_load', {
          load_time_ms: loadTime
        });
      }
    });
  }
  
  /**
   * メモリ使用量監視
   */
  startMemoryMonitoring() {
    setInterval(() => {
      if (performance.memory) {
        const memoryInfo = {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        };
        
        const usageRatio = memoryInfo.used / memoryInfo.limit;
        
        if (usageRatio > 0.8) { // 80%以上
          this.stats.memoryWarnings++;
          this.logPerformanceIssue('high_memory_usage', {
            memory_info: memoryInfo,
            usage_ratio: usageRatio,
            warning_count: this.stats.memoryWarnings
          });
        }
      }
    }, this.targets.MEMORY_CHECK_INTERVAL);
  }
  
  /**
   * グローバルイベントリスナー設定
   */
  setupGlobalEventListeners() {
    // 全ボタンの自動監視
    document.addEventListener('DOMContentLoaded', () => {
      const buttons = document.querySelectorAll('button');
      buttons.forEach((button, index) => {
        const actionName = button.id || button.textContent.trim() || `button_${index}`;
        this.monitorButtonResponse(button, actionName);
      });
      
      // 全入力フィールドの自動監視
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach((input, index) => {
        const fieldName = input.id || input.name || `input_${index}`;
        this.monitorFormInput(input, fieldName);
      });
    });
    
    // 動的に追加された要素の監視
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // 新しいボタンの監視
            if (node.tagName === 'BUTTON') {
              const actionName = node.id || node.textContent.trim() || 'dynamic_button';
              this.monitorButtonResponse(node, actionName);
            }
            
            // 新しい入力フィールドの監視
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName)) {
              const fieldName = node.id || node.name || 'dynamic_input';
              this.monitorFormInput(node, fieldName);
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  /**
   * UI応答記録
   * @private
   */
  recordUIResponse(actionName, responseTime, elementId) {
    this.stats.uiResponses.push({
      action: actionName,
      responseTime,
      elementId,
      timestamp: Date.now()
    });
    
    // 最新50件のみ保持
    if (this.stats.uiResponses.length > 50) {
      this.stats.uiResponses.shift();
    }
    
    if (responseTime > this.targets.UI_RESPONSE_TIME) {
      this.stats.slowResponses++;
      
      this.logPerformanceIssue('ui_response_slow', {
        action_name: actionName,
        element_id: elementId,
        response_time_ms: responseTime,
        target_ms: this.targets.UI_RESPONSE_TIME,
        slow_response_count: this.stats.slowResponses
      });
      
      this.showPerformanceWarning(actionName, responseTime);
    } else {
      this.logPerformanceSuccess('ui_response', {
        action_name: actionName,
        element_id: elementId,
        response_time_ms: responseTime,
        target_ms: this.targets.UI_RESPONSE_TIME
      });
    }
  }
  
  /**
   * パフォーマンス警告表示
   */
  showPerformanceWarning(actionName, responseTime) {
    const warning = document.createElement('div');
    warning.style.cssText = `
      background: linear-gradient(135deg, #ff6b6b, #ff8e8e);
      color: white;
      padding: 12px 16px;
      margin-bottom: 8px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(255, 107, 107, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      pointer-events: auto;
      transform: translateX(100%);
      transition: transform 0.3s ease-out;
      border-left: 4px solid #ff4757;
    `;
    
    warning.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div style="font-weight: 600; margin-bottom: 2px;">⚠️ UI応答性低下</div>
          <div style="opacity: 0.9;">
            ${actionName}: ${responseTime.toFixed(1)}ms<br>
            目標: ${this.targets.UI_RESPONSE_TIME}ms以内
          </div>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: white; cursor: pointer; 
                       font-size: 18px; line-height: 1; padding: 0; margin-left: 12px;">×</button>
      </div>
    `;
    
    this.warningContainer.appendChild(warning);
    
    // アニメーション表示
    requestAnimationFrame(() => {
      warning.style.transform = 'translateX(0)';
    });
    
    // 5秒後に自動削除
    setTimeout(() => {
      if (warning.parentNode) {
        warning.style.transform = 'translateX(100%)';
        setTimeout(() => warning.remove(), 300);
      }
    }, 5000);
  }
  
  /**
   * パフォーマンス問題記録（Electronへ送信）
   */
  logPerformanceIssue(operation, metrics) {
    if (window.electronAPI && window.electronAPI.debug) {
      window.electronAPI.debug.logPerformanceIssue(operation, metrics);
    }
    
    console.warn('🐌 Performance Issue:', operation, metrics);
  }
  
  /**
   * パフォーマンス成功記録（Electronへ送信）
   */
  logPerformanceSuccess(operation, metrics) {
    if (window.electronAPI && window.electronAPI.debug) {
      window.electronAPI.debug.logPerformanceSuccess(operation, metrics);
    }
    
    console.debug('🚀 Performance Success:', operation, metrics);
  }
  
  /**
   * 統計情報取得
   */
  getStats() {
    const recentResponses = this.stats.uiResponses.slice(-10);
    const averageResponseTime = recentResponses.length > 0 
      ? recentResponses.reduce((sum, r) => sum + r.responseTime, 0) / recentResponses.length 
      : 0;
    
    return {
      totalInteractions: this.stats.totalInteractions,
      slowResponses: this.stats.slowResponses,
      slowResponseRatio: this.stats.totalInteractions > 0 
        ? (this.stats.slowResponses / this.stats.totalInteractions * 100).toFixed(1)
        : 0,
      averageResponseTime: averageResponseTime.toFixed(1),
      memoryWarnings: this.stats.memoryWarnings,
      recentResponses: recentResponses
    };
  }
  
  /**
   * 統計リセット
   */
  resetStats() {
    this.stats = {
      uiResponses: [],
      slowResponses: 0,
      totalInteractions: 0,
      memoryWarnings: 0
    };
    
    console.log('📊 Performance stats reset');
  }
  
  /**
   * パフォーマンス統計表示
   */
  showStats() {
    const stats = this.getStats();
    console.table(stats);
    return stats;
  }
}

// グローバルインスタンス作成
window.performanceMonitor = new PerformanceMonitor();

// デバッグ用グローバル関数
window.showPerformanceStats = () => window.performanceMonitor.showStats();
window.resetPerformanceStats = () => window.performanceMonitor.resetStats();