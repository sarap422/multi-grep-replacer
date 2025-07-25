/**
 * Multi Grep Replacer - Renderer Process
 * UIロジック・IPC通信・パフォーマンス監視
 */

class MultiGrepReplacerUI {
  // UI制御基本定数
  static RESPONSE_TARGET_MS = 100; // ms
  static FILE_DISPLAY_LIMIT = 10; // 表示するファイル数上限
  static FILE_LIST_PREVIEW_COUNT = 20; // ファイルリスト表示件数

  // UI制御定数
  static UI_RESPONSE_TARGET = MultiGrepReplacerUI.RESPONSE_TARGET_MS; // ms
  static MAX_DISPLAY_FILES = MultiGrepReplacerUI.FILE_DISPLAY_LIMIT; // 表示するファイル数上限
  static KB_DIVISOR = 1024; // KB変換用
  static SIZE_DECIMAL_PLACES = 2; // サイズ表示小数点桁数
  static FILE_LIST_ITEM_COUNT = MultiGrepReplacerUI.FILE_LIST_PREVIEW_COUNT; // ファイルリスト表示件数

  constructor() {
    this.responseTimeTarget = MultiGrepReplacerUI.UI_RESPONSE_TARGET;
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

    // 設定管理テストボタン
    const configLoadButton = document.getElementById('configLoadButton');
    if (configLoadButton) {
      configLoadButton.addEventListener('click', () => this.handleConfigLoad());
    }

    const configSaveButton = document.getElementById('configSaveButton');
    if (configSaveButton) {
      configSaveButton.addEventListener('click', () => this.handleConfigSave());
    }

    const configRecentButton = document.getElementById('configRecentButton');
    if (configRecentButton) {
      configRecentButton.addEventListener('click', () => this.handleConfigRecent());
    }

    // ファイル操作テストボタン
    const folderSelectButton = document.getElementById('folderSelectButton');
    if (folderSelectButton) {
      folderSelectButton.addEventListener('click', () => this.handleFolderSelect());
    }

    const fileSearchButton = document.getElementById('fileSearchButton');
    if (fileSearchButton) {
      fileSearchButton.addEventListener('click', () => this.handleFileSearch());
    }

    const fileReadButton = document.getElementById('fileReadButton');
    if (fileReadButton) {
      fileReadButton.addEventListener('click', () => this.handleFileRead());
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
      console.log('🔍 Starting version info request...');

      // 基本的な確認
      if (!window.electronAPI) {
        throw new Error('electronAPI is not available');
      }

      if (!window.electronAPI.getVersion) {
        throw new Error('getVersion method is not available');
      }

      console.log('📋 Requesting version info via IPC...');
      const version = await window.electronAPI.getVersion();
      console.log('📋 Version data received:', version);

      // バージョン情報の安全な表示
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      // 安全な文字列構築
      const appName = version?.name || 'Unknown';
      const appVersion = version?.version || 'Unknown';
      const electronVersion = version?.electron || 'Unknown';
      const nodeVersion = version?.node || 'Unknown';
      const chromeVersion = version?.chrome || 'Unknown';

      const resultText = `📋 バージョン情報

アプリケーション: ${appName} v${appVersion}
Electron: ${electronVersion}
Node.js: ${nodeVersion}
Chrome: ${chromeVersion}

応答時間: ${responseTime.toFixed(2)}ms`;

      this.displayResult('versionResult', resultText);
      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Version info failed:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      this.displayResult('versionResult', `❌ エラー: ${errorMessage}`);
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

    if (statusText) {
      statusText.textContent = text;
    }
    if (statusIndicator) {
      statusIndicator.textContent = icon;
    }
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
        monitor.className = `performance-monitor ${this.getPerformanceClass(responseTime)}`;
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
      button.addEventListener('click', event => {
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

  /**
   * 設定読み込みテスト
   */
  async handleConfigLoad() {
    const startTime = performance.now();

    try {
      this.updateStatus('Loading config...', '📖');

      const result = await window.electronAPI.getDefaultConfig();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ 設定読み込み成功!

応答時間: ${responseTime.toFixed(2)}ms
設定内容:
- アプリ名: ${result.config.app_info.name}
- バージョン: ${result.config.app_info.version}
- 置換ルール数: ${result.config.replacements.length}
- 対象拡張子: ${result.config.target_settings.file_extensions.join(', ')}

${JSON.stringify(result.config, null, 2)}`;

        this.displayResult('configResult', resultText);
      } else {
        this.displayResult('configResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Config load test failed:', error);
      this.displayResult('configResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 設定保存テスト
   */
  async handleConfigSave() {
    const startTime = performance.now();

    try {
      this.updateStatus('Saving config...', '💾');

      // テスト用設定作成
      const testConfig = {
        app_info: {
          name: 'Test Configuration',
          version: '1.0.0',
          created_at: new Date().toISOString(),
          description: 'Test config created by UI',
          author: 'Test User',
        },
        replacements: [
          {
            id: 'test_rule_1',
            from: 'test-old',
            to: 'test-new',
            enabled: true,
            description: 'Test replacement rule',
          },
        ],
        target_settings: {
          file_extensions: ['.html', '.css', '.js'],
          exclude_patterns: ['node_modules/**', '.git/**'],
          include_subdirectories: true,
          max_file_size: 104857600,
          encoding: 'utf-8',
        },
        replacement_settings: {
          case_sensitive: true,
          use_regex: false,
          backup_enabled: false,
        },
        ui_settings: {
          theme: 'auto',
          window: { width: 800, height: 700 },
        },
        advanced_settings: {
          max_concurrent_files: 10,
          ui_response_target: 100,
        },
      };

      // 一時ファイルパス作成
      const tempPath = `/tmp/multi-grep-replacer-test-${Date.now()}.json`;

      const result = await window.electronAPI.saveConfig(testConfig, tempPath);
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ 設定保存成功!

応答時間: ${responseTime.toFixed(2)}ms
保存先: ${tempPath}
設定内容: Test Configuration
テストルール: test-old → test-new`;

        this.displayResult('configResult', resultText);
      } else {
        this.displayResult('configResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Config save test failed:', error);
      this.displayResult('configResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * 最近の設定確認テスト
   */
  async handleConfigRecent() {
    const startTime = performance.now();

    try {
      this.updateStatus('Getting recent configs...', '📚');

      const result = await window.electronAPI.getRecentConfigs();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ 最近の設定取得成功!

応答時間: ${responseTime.toFixed(2)}ms
設定ファイル数: ${result.configs.length}

${
  result.configs.length > 0
    ? result.configs
        .map((config, index) => `${index + 1}. ${config.name} (${config.lastUsed})`)
        .join('\n')
    : '最近使用した設定ファイルはありません'
}

詳細:
${JSON.stringify(result.configs, null, 2)}`;

        this.displayResult('configResult', resultText);
      } else {
        this.displayResult('configResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Recent configs test failed:', error);
      this.displayResult('configResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * フォルダ選択テスト
   */
  async handleFolderSelect() {
    const startTime = performance.now();

    try {
      this.updateStatus('Opening folder dialog...', '📂');

      const result = await window.electronAPI.selectFolder();
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const resultText = `✅ フォルダ選択成功!

応答時間: ${responseTime.toFixed(2)}ms
選択されたフォルダ: ${result.folderPath || 'キャンセルされました'}`;

        this.displayResult('fileResult', resultText);

        // 選択されたフォルダがある場合は次のテストボタンを有効化
        if (result.folderPath) {
          this.selectedFolder = result.folderPath;
        }
      } else {
        this.displayResult('fileResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ Folder select test failed:', error);
      this.displayResult('fileResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * ファイル検索テスト
   */
  async handleFileSearch() {
    const startTime = performance.now();

    try {
      this.updateStatus('Searching files...', '🔍');

      // テスト用のディレクトリ（現在のプロジェクトディレクトリ）
      const testDirectory =
        this.selectedFolder || '/Volumes/CT1000P3/pCloud(CT1000P3)/(github)/multi-grep-replacer';
      const testExtensions = ['.js', '.html', '.css', '.md'];
      const testExcludePatterns = ['node_modules/**', 'dist/**'];

      const result = await window.electronAPI.findFiles(
        testDirectory,
        testExtensions,
        testExcludePatterns
      );
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const { files } = result;
        const resultText = `✅ ファイル検索成功!

応答時間: ${responseTime.toFixed(2)}ms
検索ディレクトリ: ${testDirectory}
対象拡張子: ${testExtensions.join(', ')}
見つかったファイル数: ${files.length}

上位${MultiGrepReplacerUI.MAX_DISPLAY_FILES}ファイル:
${files
  .slice(0, MultiGrepReplacerUI.MAX_DISPLAY_FILES)
  .map(
    (file, index) =>
      `${index + 1}. ${file.name} (${(file.size / MultiGrepReplacerUI.KB_DIVISOR).toFixed(
        MultiGrepReplacerUI.SIZE_DECIMAL_PLACES
      )} KB)`
  )
  .join('\n')}

${
  files.length > MultiGrepReplacerUI.MAX_DISPLAY_FILES
    ? `... 他 ${files.length - MultiGrepReplacerUI.MAX_DISPLAY_FILES} ファイル`
    : ''
}`;

        this.displayResult('fileResult', resultText);

        // 最初のファイルを次のテスト用に保存
        if (files.length > 0) {
          this.selectedFile = files[0].path;
        }
      } else {
        this.displayResult('fileResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ File search test failed:', error);
      this.displayResult('fileResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }

  /**
   * ファイル読み込みテスト
   */
  async handleFileRead() {
    const startTime = performance.now();

    try {
      this.updateStatus('Reading file...', '📄');

      // テスト用ファイル（package.jsonを読み込み）
      const testFilePath =
        this.selectedFile ||
        '/Volumes/CT1000P3/pCloud(CT1000P3)/(github)/multi-grep-replacer/package.json';

      const result = await window.electronAPI.readFile(testFilePath);
      const responseTime = performance.now() - startTime;
      this.updateResponseTime(responseTime);

      if (result.success) {
        const { content } = result;
        const lines = content.split('\n').length;
        const size = content.length;

        const resultText = `✅ ファイル読み込み成功!

応答時間: ${responseTime.toFixed(2)}ms
ファイルパス: ${testFilePath}
ファイルサイズ: ${size} 文字
行数: ${lines}

内容プレビュー（最初の${MultiGrepReplacerUI.FILE_LIST_ITEM_COUNT}行）:
${content.split('\n').slice(0, MultiGrepReplacerUI.FILE_LIST_ITEM_COUNT).join('\n')}

${
  lines > MultiGrepReplacerUI.FILE_LIST_ITEM_COUNT
    ? `... 他 ${lines - MultiGrepReplacerUI.FILE_LIST_ITEM_COUNT} 行`
    : ''
}`;

        this.displayResult('fileResult', resultText);
      } else {
        this.displayResult('fileResult', `❌ エラー: ${result.error}`);
      }

      this.updateStatus('Ready', '⚡');
    } catch (error) {
      console.error('❌ File read test failed:', error);
      this.displayResult('fileResult', `❌ エラー: ${error.message}`);
      this.updateStatus('Error', '🚨');
    }
  }
}

// DOM読み込み完了後にアプリケーション開始
const app = new MultiGrepReplacerUI();
console.log('🚀 Multi Grep Replacer UI initialized:', app);
