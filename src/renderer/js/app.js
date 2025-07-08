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

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
  displaySystemInfo();
  displayAppInfo();
  
  pingButton.addEventListener('click', performPingTest);
  
  // 起動確認メッセージ
  console.log('Renderer process started');
  console.log('electronAPI available:', !!window.electronAPI);
  
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