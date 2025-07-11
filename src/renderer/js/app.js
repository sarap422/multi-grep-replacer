// DOM要素の取得
const systemInfoDiv = document.getElementById('system-info');
const pingButton = document.getElementById('ping-button');
const pingResult = document.getElementById('ping-result');

// システム情報の表示
function displaySystemInfo() {
  if (window.electronAPI) {
    const versions = window.electronAPI.versions;
    const platform = window.electronAPI.platform;
    
    systemInfoDiv.innerHTML = `
      <p><strong>プラットフォーム:</strong> ${platform}</p>
      <p><strong>Node.js:</strong> ${versions.node}</p>
      <p><strong>Chrome:</strong> ${versions.chrome}</p>
      <p><strong>Electron:</strong> ${versions.electron}</p>
    `;
  } else {
    systemInfoDiv.innerHTML = '<p class="error">Electron APIが利用できません</p>';
  }
}

// Pingテストの実行
async function performPingTest() {
  pingButton.disabled = true;
  pingResult.className = 'result-box show';
  pingResult.textContent = 'Ping送信中...';
  
  try {
    const startTime = performance.now();
    
    // 実際のIPC通信を実行
    const response = await window.electronAPI.ping();
    
    const responseTime = performance.now() - startTime;
    
    pingResult.className = 'result-box show success';
    pingResult.innerHTML = `
      <strong>✅ IPC通信テスト成功</strong><br>
      メッセージ: ${response.message}<br>
      応答時間: ${responseTime.toFixed(2)}ms (目標: 100ms以内)<br>
      タイムスタンプ: ${new Date(response.timestamp).toLocaleTimeString()}<br>
      プロセスID: ${response.processInfo.pid}<br>
      プラットフォーム: ${response.processInfo.platform}<br>
      バージョン: ${response.processInfo.version}<br>
      <br>
      Context Isolation経由でのAPI呼び出しが正常に動作しています。
    `;
    
    // UI応答性の確認
    if (responseTime <= 100) {
      console.log(`✅ UI応答性: ${responseTime.toFixed(2)}ms (目標達成)`);;
    } else {
      console.warn(`⚠️ UI応答性: ${responseTime.toFixed(2)}ms (目標: 100ms以内)`);
    }
  } catch (error) {
    pingResult.className = 'result-box show error';
    pingResult.innerHTML = `
      <strong>❌ IPC通信テスト失敗</strong><br>
      エラー: ${error.message}
    `;
  } finally {
    pingButton.disabled = false;
  }
}

// アプリケーション情報の表示
async function displayAppInfo() {
  if (window.electronAPI && window.electronAPI.getAppInfo) {
    try {
      const appInfo = await window.electronAPI.getAppInfo();
      console.log('App Info:', appInfo);
    } catch (error) {
      console.error('Failed to get app info:', error);
    }
  }
}

// 設定管理のテスト
async function testConfigManager() {
  console.log('\n=== 設定管理テスト開始 ===');
  
  try {
    // デフォルト設定の取得テスト
    console.log('1. デフォルト設定取得テスト...');
    const defaultConfigResult = await window.electronAPI.config.getDefault();
    if (defaultConfigResult.success) {
      console.log('✅ デフォルト設定取得成功');
      console.log('設定内容:', defaultConfigResult.config);
    } else {
      console.error('❌ デフォルト設定取得失敗:', defaultConfigResult.error);
    }
    
    // 設定検証テスト
    console.log('2. 設定検証テスト...');
    const validationResult = await window.electronAPI.config.validate(defaultConfigResult.config);
    if (validationResult.success && validationResult.validation.valid) {
      console.log('✅ 設定検証成功');
    } else {
      console.error('❌ 設定検証失敗:', validationResult.validation?.errors);
    }
    
    // デフォルト設定ファイル読み込みテスト
    console.log('3. デフォルト設定ファイル読み込みテスト...');
    const loadResult = await window.electronAPI.config.load('./config/default.json');
    if (loadResult.success) {
      console.log('✅ デフォルト設定ファイル読み込み成功');
      console.log('読み込み設定:', loadResult.config);
    } else {
      console.error('❌ デフォルト設定ファイル読み込み失敗:', loadResult.error);
    }
    
  } catch (error) {
    console.error('❌ 設定管理テスト中にエラー:', error);
  }
  
  console.log('=== 設定管理テスト完了 ===\n');
}

// ファイル操作のテスト
async function testFileOperations() {
  console.log('\n=== ファイル操作テスト開始 ===');
  
  try {
    // 現在のディレクトリでのファイル検索テスト
    console.log('1. ファイル検索テスト（現在のディレクトリ）...');
    const searchResult = await window.electronAPI.file.findFiles(
      '.', 
      ['.js', '.json', '.md'], 
      ['node_modules/**', '.git/**', 'dist/**']
    );
    
    if (searchResult.success) {
      console.log('✅ ファイル検索成功');
      console.log(`見つかったファイル数: ${searchResult.files.length}`);
      console.log('ファイル一覧（最初の10件）:');
      searchResult.files.slice(0, 10).forEach(file => {
        console.log(`  - ${file}`);
      });
    } else {
      console.error('❌ ファイル検索失敗:', searchResult.error);
    }
    
    // package.jsonファイル読み込みテスト
    console.log('2. ファイル読み込みテスト（package.json）...');
    const readResult = await window.electronAPI.file.readContent('./package.json');
    if (readResult.success) {
      console.log('✅ ファイル読み込み成功');
      try {
        const packageInfo = JSON.parse(readResult.content);
        console.log('プロジェクト名:', packageInfo.name);
        console.log('バージョン:', packageInfo.version);
      } catch (parseError) {
        console.log('ファイル内容:', readResult.content.substring(0, 200) + '...');
      }
    } else {
      console.error('❌ ファイル読み込み失敗:', readResult.error);
    }
    
  } catch (error) {
    console.error('❌ ファイル操作テスト中にエラー:', error);
  }
  
  console.log('=== ファイル操作テスト完了 ===\n');
}

// フォルダ選択ダイアログのテスト（手動テスト用）
async function testFolderSelection() {
  console.log('\n=== フォルダ選択ダイアログテスト開始 ===');
  
  try {
    const result = await window.electronAPI.file.selectFolder();
    
    if (result.success) {
      console.log('✅ フォルダ選択成功');
      console.log('選択されたフォルダ:', result.path);
      
      // 選択されたフォルダ内のファイル検索テスト
      const searchResult = await window.electronAPI.file.findFiles(
        result.path,
        ['.js', '.json', '.md', '.html', '.css'],
        ['node_modules/**', '.git/**', 'dist/**']
      );
      
      if (searchResult.success) {
        console.log(`選択フォルダ内のファイル数: ${searchResult.files.length}`);
      }
    } else if (result.canceled) {
      console.log('🔄 フォルダ選択がキャンセルされました');
    } else {
      console.error('❌ フォルダ選択失敗:', result.error);
    }
  } catch (error) {
    console.error('❌ フォルダ選択テスト中にエラー:', error);
  }
  
  console.log('=== フォルダ選択ダイアログテスト完了 ===\n');
}

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
  displaySystemInfo();
  displayAppInfo();
  
  pingButton.addEventListener('click', performPingTest);
  
  // 新しい機能のテストボタンのイベントリスナー
  const configTestButton = document.getElementById('config-test-button');
  const fileTestButton = document.getElementById('file-test-button');
  const folderSelectButton = document.getElementById('folder-select-button');
  
  if (configTestButton) {
    configTestButton.addEventListener('click', testConfigManager);
  }
  
  if (fileTestButton) {
    fileTestButton.addEventListener('click', testFileOperations);
  }
  
  if (folderSelectButton) {
    folderSelectButton.addEventListener('click', testFolderSelection);
  }
  
  // 起動確認メッセージ
  console.log('Renderer process started');
  console.log('electronAPI available:', !!window.electronAPI);
  
  // 新しいAPI機能の確認
  console.log('New API features available:');
  console.log('- config:', !!window.electronAPI?.config);
  console.log('- file:', !!window.electronAPI?.file);
  
  // セキュリティ確認
  console.log('Security check:');
  console.log('- window.require:', typeof window.require);
  console.log('- window.process:', typeof window.process);
  console.log('- window.electronAPI:', typeof window.electronAPI);
  
  if (typeof window.require !== 'undefined' || typeof window.process !== 'undefined') {
    console.error('⚠️ Security issue: Node.js APIs are exposed!');
  } else {
    console.log('✅ Security: Node.js APIs are properly isolated');
  }
  
  // 自動テスト実行（基本機能）
  setTimeout(() => {
    console.log('\n🚀 自動テスト開始...');
    testConfigManager();
    setTimeout(() => testFileOperations(), 2000);
  }, 1000);
});

// UI応答性の確認（100ms以内の反応を目指す）
let lastClickTime = 0;
document.addEventListener('click', (event) => {
  const currentTime = performance.now();
  if (lastClickTime > 0) {
    const responseTime = currentTime - lastClickTime;
    if (responseTime > 100) {
      console.warn(`UI応答性低下検出: ${responseTime.toFixed(2)}ms`);
    }
  }
  lastClickTime = currentTime;
});