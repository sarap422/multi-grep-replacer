/**
 * Multi Grep Replacer - Preload Script
 * セキュアなIPC API公開
 */

const { contextBridge, ipcRenderer } = require('electron');

console.log('🔧 Preload script loading...');

/**
 * セキュアなElectron APIをレンダラープロセスに公開
 */
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * 基本IPC通信テスト
   * @returns {Promise<Object>} ping結果
   */
  ping: async () => {
    console.log('📡 Sending ping...');
    try {
      const result = await ipcRenderer.invoke('ping');
      console.log('📡 Ping response:', result);
      return result;
    } catch (error) {
      console.error('❌ Ping failed:', error);
      throw error;
    }
  },

  /**
   * アプリケーションバージョン情報取得
   * @returns {Promise<Object>} バージョン情報
   */
  getVersion: async () => {
    console.log('📋 Getting version info...');
    try {
      const result = await ipcRenderer.invoke('get-version');
      console.log('📋 Version info:', result);
      return result;
    } catch (error) {
      console.error('❌ Version info failed:', error);
      throw error;
    }
  },

  /**
   * アプリケーション情報取得
   * @returns {Promise<Object>} アプリ情報
   */
  getAppInfo: async () => {
    console.log('ℹ️ Getting app info...');
    try {
      const result = await ipcRenderer.invoke('get-app-info');
      console.log('ℹ️ App info:', result);
      return result;
    } catch (error) {
      console.error('❌ App info failed:', error);
      throw error;
    }
  },

  /**
   * ログ出力（デバッグ用）
   * @param {string} level - ログレベル
   * @param {string} message - メッセージ
   * @param {Object} context - コンテキスト
   */
  log: (level, message, context = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      source: 'renderer'
    };
    console.log(`[${level.toUpperCase()}] ${message}`, context);
    console.log('📝 Log entry:', logEntry);
    
    // 将来の拡張: メインプロセスにログ送信
    // ipcRenderer.send('log', logEntry);
  },

  /**
   * パフォーマンス測定
   * @param {string} action - アクション名
   * @param {number} duration - 実行時間（ms）
   */
  reportPerformance: (action, duration) => {
    const performanceData = {
      action,
      duration,
      timestamp: Date.now(),
      memory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    };
    
    console.log(`📊 Performance: ${action} took ${duration.toFixed(2)}ms`);
    console.log('📊 Performance data:', performanceData);
    
    // 将来の拡張: パフォーマンスデータ送信
    // ipcRenderer.send('performance-data', performanceData);
  }
});

/**
 * セキュリティ検証
 */
const validateSecurity = () => {
  // Node.js統合が無効であることを確認
  if (typeof require !== 'undefined') {
    console.warn('⚠️ Node.js integration detected in renderer');
  }

  // Context Isolationが有効であることを確認
  if (typeof window.require !== 'undefined') {
    console.warn('⚠️ Potential context isolation bypass detected');
  }

  console.log('🔒 Security validation completed');
};

/**
 * パフォーマンス監視初期化
 */
const initializePerformanceMonitoring = () => {
  // タイミングAPI利用可能性確認
  if (typeof performance !== 'undefined') {
    console.log('📊 Performance API available');
    
    // メモリ監視（Chrome限定）
    if (performance.memory) {
      const memory = performance.memory;
      console.log(`💾 Memory: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB used / ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB total`);
    }
  }
};

/**
 * エラーハンドリング設定
 */
const setupErrorHandling = () => {
  // 未処理のエラーをキャッチ
  window.addEventListener('error', (event) => {
    console.error('🚨 Unhandled error:', event.error);
    
    // 将来の拡張: エラー報告
    // ipcRenderer.send('error-report', {
    //   message: event.error.message,
    //   stack: event.error.stack,
    //   timestamp: Date.now()
    // });
  });

  // 未処理のPromise rejectionをキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    console.error('🚨 Unhandled promise rejection:', event.reason);
    
    // 将来の拡張: Promise rejectionエラー報告
    // ipcRenderer.send('promise-rejection', {
    //   reason: event.reason,
    //   timestamp: Date.now()
    // });
  });
};

// 初期化実行
try {
  validateSecurity();
  initializePerformanceMonitoring();
  setupErrorHandling();
  
  console.log('✅ Preload script initialized successfully');
} catch (error) {
  console.error('❌ Preload script initialization failed:', error);
}

/**
 * デバッグ情報（開発時のみ）
 */
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode detected');
  console.log('📊 Available APIs:', Object.keys(window));
  
  // メッセージ送信テスト用（将来の拡張）
  window.electronAPI.testMessage = (message) => {
    console.log('📨 Test message:', message);
    return Promise.resolve({ status: 'received', message });
  };
}