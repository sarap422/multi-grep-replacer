/**
 * セキュリティ設定の検証
 */
class SecurityValidator {
  /**
   * WebPreferencesのセキュリティ設定を検証
   * @param {Object} webPreferences - BrowserWindowのwebPreferences設定
   * @returns {Array} 検出された問題のリスト
   */
  static validateWebPreferences(webPreferences) {
    const issues = [];
    
    // nodeIntegrationのチェック
    if (webPreferences.nodeIntegration === true) {
      issues.push({
        level: 'critical',
        message: 'nodeIntegration must be false for security',
        setting: 'nodeIntegration',
        current: true,
        expected: false
      });
    }
    
    // contextIsolationのチェック
    if (webPreferences.contextIsolation === false) {
      issues.push({
        level: 'critical',
        message: 'contextIsolation must be true for security',
        setting: 'contextIsolation',
        current: false,
        expected: true
      });
    }
    
    // preloadスクリプトのチェック
    if (!webPreferences.preload) {
      issues.push({
        level: 'critical',
        message: 'preload script is required for secure API access',
        setting: 'preload',
        current: null,
        expected: 'path to preload script'
      });
    }
    
    // webSecurityのチェック
    if (webPreferences.webSecurity === false) {
      issues.push({
        level: 'warning',
        message: 'webSecurity should be true in production',
        setting: 'webSecurity',
        current: false,
        expected: true
      });
    }
    
    // enableRemoteModuleのチェック
    if (webPreferences.enableRemoteModule === true) {
      issues.push({
        level: 'critical',
        message: 'enableRemoteModule must be false for security',
        setting: 'enableRemoteModule',
        current: true,
        expected: false
      });
    }
    
    return issues;
  }
  
  /**
   * セキュリティ検証結果をログに出力
   * @param {Array} issues - 検出された問題のリスト
   */
  static logValidationResults(issues) {
    if (issues.length === 0) {
      console.log('✅ Security validation passed: All settings are secure');
      return;
    }
    
    console.error('⚠️ Security validation failed:');
    issues.forEach((issue, index) => {
      console.error(`  ${index + 1}. [${issue.level.toUpperCase()}] ${issue.message}`);
      console.error(`     Setting: ${issue.setting}`);
      console.error(`     Current: ${issue.current}`);
      console.error(`     Expected: ${issue.expected}`);
    });
  }
  
  /**
   * 推奨されるセキュアな設定を返す
   * @returns {Object} セキュアなwebPreferences設定
   */
  static getSecureWebPreferences() {
    return {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      webviewTag: false,
      navigateOnDragDrop: false
    };
  }
}

module.exports = SecurityValidator;