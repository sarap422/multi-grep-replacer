/**
 * Multi Grep Replacer - Renderer Process
 * UIロジック・IPC通信・パフォーマンス監視
 */

class MultiGrepReplacerUI {
  constructor() {
    this.responseTimeTarget = 100; // ms
    this.startTime = performance.now();
    
    console.log('🖥️ Renderer process initializing...');
    this.initialize();
  }

  /**
   * UI初期化
   */
  async initialize() {
    // DOM読み込み完了確認
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupUI());
    } else {
      this.setupUI();
    }
  }

  /**
   * UI設定
   */
  setupUI() {
    console.log('🎨 Setting up UI...');
    
    // イベントリスナー設定
    this.setupEventListeners();
    
    // パフォーマンス監視開始
    this.initializePerformanceMonitoring();
    
    // ElectronAPI利用可能性確認
    this.verifyElectronAPI();
    
    // 初期化完了
    this.updateStatus('Ready', '⚡');
    console.log('✅ UI initialization completed');
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // Ping テストボタン
    const pingButton = document.getElementById('pingButton');
    if (pingButton) {
      pingButton.addEventListener('click', () => this.handlePingTest());
    }

    // アプリ情報ボタン
    const infoButton = document.getElementById('infoButton');
    if (infoButton) {
      infoButton.addEventListener('click', () => this.handleAppInfo());
    }

    // バージョン情報ボタン
    const versionButton = document.getElementById('versionButton');
    if (versionButton) {
      versionButton.addEventListener('click', () => this.handleVersionInfo());
    }

    console.log('👂 Event listeners attached');
  }

  /**
   * Ping テスト実行
   */
  async handlePingTest() {
    const startTime = performance.now();
    
    try {
      this.updateStatus('Testing IPC...', '📡');
      
      // ElectronAPI経由でIPC通信
      const result = await window.electronAPI.ping();
      
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);
      
      // 結果表示
      const resultText = `✅ IPC通信成功!

応答時間: ${responseTime.toFixed(2)}ms
結果: ${JSON.stringify(result, null, 2)}
目標値: ${this.responseTimeTarget}ms以内
評価: ${this.getPerformanceRating(responseTime)}`;

      this.displayResult('pingResult', resultText);
      this.updateStatus('Ready', '⚡');
      
      console.log(`📡 Ping test completed in ${responseTime.toFixed(2)}ms`);
      
    } catch (error) {
      console.error('❌ Ping test failed:', error);
      this.displayResult('pingResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * アプリ情報取得
   */
  async handleAppInfo() {
    const startTime = performance.now();
    
    try {
      this.updateStatus('Getting app info...', 'ℹ️');
      
      const info = await window.electronAPI.getAppInfo();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);
      
      const resultText = `💻 アプリケーション情報

プラットフォーム: ${info.platform}
アーキテクチャ: ${info.arch}
プロセスID: ${info.pid}

メモリ使用量:
- RSS: ${(info.memory.rss / 1024 / 1024).toFixed(2)} MB
- Heap使用: ${(info.memory.heapUsed / 1024 / 1024).toFixed(2)} MB
- Heap総量: ${(info.memory.heapTotal / 1024 / 1024).toFixed(2)} MB
- 外部: ${(info.memory.external / 1024 / 1024).toFixed(2)} MB

応答時間: ${responseTime.toFixed(2)}ms`;

      this.displayResult('infoResult', resultText);
      this.updateStatus('Ready', '⚡');
      
    } catch (error) {
      console.error('❌ App info failed:', error);
      this.displayResult('infoResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * バージョン情報取得
   */
  async handleVersionInfo() {
    const startTime = performance.now();
    
    try {
      this.updateStatus('Getting version info...', '📋');
      
      const version = await window.electronAPI.getVersion();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);
      
      const resultText = `📋 バージョン情報

アプリケーション: ${version.name} v${version.version}
Electron: ${version.electron}
Node.js: ${version.node}
Chrome: ${process.versions.chrome || 'N/A'}

ビルド日時: ${new Date().toISOString()}
応答時間: ${responseTime.toFixed(2)}ms`;

      this.displayResult('versionResult', resultText);
      this.updateStatus('Ready', '⚡');
      
    } catch (error) {
      console.error('❌ Version info failed:', error);
      this.displayResult('versionResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 結果表示
   */
  displayResult(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = text;
      element.classList.add('fade-in');
    }
  }

  /**
   * ステータス更新
   */
  updateStatus(text, icon) {
    const statusText = document.getElementById('statusText');
    const statusIndicator = document.getElementById('statusIndicator');
    
    if (statusText) statusText.textContent = text;
    if (statusIndicator) statusIndicator.textContent = icon;
  }

  /**
   * 応答時間更新
   */
  updateResponseTime(responseTime) {
    const element = document.getElementById('responseTime');
    if (element) {
      element.textContent = `${responseTime.toFixed(2)}ms`;
      
      // パフォーマンス監視
      const monitor = document.getElementById('performanceMonitor');
      if (monitor) {
        monitor.className = 'performance-monitor ' + this.getPerformanceClass(responseTime);
      }
    }
  }

  /**
   * パフォーマンス評価
   */
  getPerformanceRating(responseTime) {
    if (responseTime <= this.responseTimeTarget) {
      return '🟢 優秀 (目標値以内)';
    } else if (responseTime <= this.responseTimeTarget * 2) {
      return '🟡 注意 (目標値の2倍以内)';
    } else {
      return '🔴 警告 (目標値を大幅に超過)';
    }
  }

  /**
   * パフォーマンスCSSクラス
   */
  getPerformanceClass(responseTime) {
    if (responseTime <= this.responseTimeTarget) {
      return 'response-fast';
    } else if (responseTime <= this.responseTimeTarget * 2) {
      return 'response-medium';
    } else {
      return 'response-slow';
    }
  }

  /**
   * ElectronAPI利用可能性確認
   */
  verifyElectronAPI() {
    if (typeof window.electronAPI === 'undefined') {
      console.error('❌ ElectronAPI not available');
      this.updateStatus('ElectronAPI Error', '🚨');
      
      // エラーメッセージ表示
      const errorMsg = '❌ ElectronAPIが利用できません。preload.jsの設定を確認してください。';
      document.querySelectorAll('.test-result').forEach(el => {
        el.textContent = errorMsg;
      });
      
      return false;
    }
    
    console.log('✅ ElectronAPI available');
    return true;
  }

  /**
   * パフォーマンス監視初期化
   */
  initializePerformanceMonitoring() {
    // ボタンクリック応答性監視
    document.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', (event) => {
        const actionName = button.textContent.trim();
        this.monitorButtonResponse(event, actionName);
      });
    });
    
    console.log('📊 Performance monitoring initialized');
  }

  /**
   * ボタン応答性監視
   */
  monitorButtonResponse(event, actionName) {
    const startTime = performance.now();
    
    // 次のフレームで測定
    requestAnimationFrame(() => {
      const responseTime = performance.now() - startTime;
      
      if (responseTime > this.responseTimeTarget) {
        console.warn(`⚠️ UI応答性低下: ${actionName} (${responseTime.toFixed(2)}ms)`);
      } else {
        console.log(`✅ UI応答性良好: ${actionName} (${responseTime.toFixed(2)}ms)`);
      }
    });
  }
}

// DOM読み込み完了後にアプリケーション開始
const app = new MultiGrepReplacerUI();
console.log('🚀 Multi Grep Replacer UI initialized:', app);