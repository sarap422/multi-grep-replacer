# 3_debugging.md（デバッグ環境整備）

## 🎯 デバッグ環境整備の目的

### 前回失敗の教訓
```
❌ 前回の問題：
- 最終パッケージングまで実行ファイル作成なし
- 「エラーが発生しました」→ 原因不明
- デバッグをClaude Codeに任せきり
- 段階的動作確認の欠如

✅ 今回の改善：
- 各Task完了時の即座動作確認
- 詳細なエラー情報と解決方法提示
- 早期実行ファイル（.app）作成
- 段階的テスト環境の構築
```

### 目標設定
- **UI応答性**: 100ms以内のボタンクリック反応
- **エラー可視化**: 具体的なエラー内容と解決方法
- **段階的品質保証**: 各Task完了時の動作確認
- **知識蓄積**: 問題解決パターンの記録・再利用

## 🔧 1. Electron特有エラーの予測と対策

### 1.1 IPC通信エラー
```javascript
// 予想される問題
❌ contextBridge.exposeInMainWorld設定ミス
❌ ipcRenderer.invoke()のレスポンス待機タイムアウト
❌ MainプロセスとRendererプロセス間のデータ型不整合

// 対策とテスト方法
✅ IPC通信テスト専用関数の実装
✅ タイムアウト設定とエラーハンドリング
✅ データ型検証とシリアライゼーション確認
```

**IPC通信テストコード例**：
```javascript
// src/main/ipc-test.js
class IPCTestHandler {
    static registerTests() {
        // 基本通信テスト
        ipcMain.handle('test-basic-communication', async () => {
            return { status: 'success', timestamp: Date.now() };
        });
        
        // ファイル操作テスト
        ipcMain.handle('test-file-access', async (event, testPath) => {
            try {
                const fs = require('fs').promises;
                await fs.access(testPath);
                return { status: 'success', path: testPath };
            } catch (error) {
                return { status: 'error', error: error.message };
            }
        });
    }
}
```

### 1.2 Context Isolation設定問題
```javascript
// 予想される問題
❌ nodeIntegration: true の誤設定
❌ contextIsolation: false の危険な設定
❌ preload.jsでのAPI公開ミス

// 対策
✅ セキュリティ設定の強制検証
✅ preload.js API公開の段階的テスト
✅ セキュリティベストプラクティス準拠チェック
```

**セキュリティ検証コード例**：
```javascript
// src/main/security-validator.js
class SecurityValidator {
    static validateWebPreferences(webPreferences) {
        const issues = [];
        
        if (webPreferences.nodeIntegration === true) {
            issues.push('nodeIntegration must be false for security');
        }
        
        if (webPreferences.contextIsolation === false) {
            issues.push('contextIsolation must be true for security');
        }
        
        if (!webPreferences.preload) {
            issues.push('preload script is required for secure API access');
        }
        
        return issues;
    }
}
```

### 1.3 ファイル操作・権限エラー
```javascript
// 予想される問題
❌ ファイル読み書き権限不足
❌ 大容量ファイルでのメモリ不足
❌ 非ASCII文字ファイル名の処理失敗
❌ ネットワークドライブアクセス問題

// 対策
✅ ファイル権限事前チェック
✅ Stream処理による大容量ファイル対応
✅ Unicode文字エンコーディング対応
✅ ローカルファイルシステム限定設計
```

### 1.4 UI応答性問題
```javascript
// 予想される問題
❌ 大容量ファイル処理でのUI フリーズ
❌ 置換処理中のボタン無反応
❌ 進捗表示の更新遅延

// 対策
✅ Worker Threads活用による非同期処理
✅ UI応答性監視とアラート
✅ 進捗表示の適切な更新間隔
```

## 🧪 2. 段階的テスト環境の設計

### 2.1 Task完了時テストフレームワーク

#### Phase 1: プロジェクト基盤構築
```markdown
Task 1.1完了時テスト：
✅ npm start で基本Electronアプリ起動
✅ 空ウィンドウ表示確認
✅ IPC通信基本動作確認
✅ セキュリティ設定検証

Task 1.2完了時テスト：
✅ preload.js API公開確認
✅ Context Isolation動作確認
✅ 設定ファイル読み込み確認

Task 1.3完了時テスト：
✅ ESLint チェック通過
✅ 基本テストスイート実行
✅ 簡易.appファイル作成・起動確認
```

#### Phase 2: コア機能実装
```markdown
Task 2.1完了時テスト：
✅ ファイル検索機能単体テスト
✅ 権限チェック機能確認
✅ 除外パターン動作確認

Task 2.2完了時テスト：
✅ 置換エンジン基本動作確認
✅ 複数ルール順次実行テスト
✅ エラーハンドリング動作確認
✅ 実行ファイルでの置換テスト実行

Task 2.3完了時テスト：
✅ IPC通信統合テスト
✅ 進捗通知機能確認
✅ エラー伝播機能確認
```

#### Phase 3: UI/UX実装
```markdown
Task 3.1完了時テスト：
✅ メインUI表示確認
✅ レスポンシブデザイン確認
✅ ダークモード切り替え確認
✅ 実行ファイルでのUI表示確認

Task 3.2完了時テスト：
✅ 置換ルール追加・削除動作確認
✅ ドラッグ&ドロップ並び替え確認
✅ フォーム入力応答性確認（100ms以内）

Task 3.3完了時テスト：
✅ 一括置換実行確認
✅ 進捗表示リアルタイム更新確認
✅ 結果表示・エクスポート確認
✅ 完全版.appファイルでの全機能テスト
```

### 2.2 テスト自動化スクリプト

#### 基本テスト実行スクリプト
```javascript
// scripts/test-runner.js
const { spawn } = require('child_process');
const fs = require('fs').promises;

class TestRunner {
    static async runPhaseTests(phase) {
        console.log(`🧪 Running Phase ${phase} tests...`);
        
        try {
            // 基本起動テスト
            const startupResult = await this.testElectronStartup();
            if (!startupResult.success) {
                throw new Error(`Startup test failed: ${startupResult.error}`);
            }
            
            // Phase別テスト実行
            switch (phase) {
                case 1:
                    await this.testPhase1();
                    break;
                case 2:
                    await this.testPhase2();
                    break;
                case 3:
                    await this.testPhase3();
                    break;
            }
            
            console.log(`✅ Phase ${phase} tests completed successfully`);
            
        } catch (error) {
            console.error(`❌ Phase ${phase} tests failed:`, error.message);
            throw error;
        }
    }
    
    static async testElectronStartup() {
        return new Promise((resolve) => {
            const electronProcess = spawn('npm', ['start'], {
                stdio: 'pipe'
            });
            
            let output = '';
            electronProcess.stdout.on('data', (data) => {
                output += data.toString();
            });
            
            // 5秒後にプロセス終了
            setTimeout(() => {
                electronProcess.kill();
                
                if (output.includes('App ready')) {
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: 'App startup timeout' });
                }
            }, 5000);
        });
    }
}

module.exports = TestRunner;
```

## 📋 3. デバッグツール設計

### 3.1 統合ログシステム

#### ログレベル定義
```javascript
// src/main/debug-logger.js
class DebugLogger {
    static LOG_LEVELS = {
        ERROR: 1,   // アプリケーション停止を伴う重大エラー
        WARN: 2,    // 処理継続可能だが注意が必要
        INFO: 3,    // 重要な処理の開始・完了
        DEBUG: 4,   // 詳細な処理状況（開発時のみ）
        TRACE: 5    // 非常に詳細な追跡情報
    };
    
    static currentLevel = process.env.NODE_ENV === 'development' ? 4 : 3;
    
    static log(level, message, context = {}) {
        if (level > this.currentLevel) return;
        
        const timestamp = new Date().toISOString();
        const caller = this.getCaller();
        
        const logEntry = {
            timestamp,
            level: Object.keys(this.LOG_LEVELS)[level - 1],
            message,
            caller,
            context,
            memory: process.memoryUsage(),
            pid: process.pid
        };
        
        // コンソール出力
        console.log(JSON.stringify(logEntry, null, 2));
        
        // ファイル出力
        this.writeToFile(logEntry);
    }
    
    static error(message, context) { this.log(1, message, context); }
    static warn(message, context) { this.log(2, message, context); }
    static info(message, context) { this.log(3, message, context); }
    static debug(message, context) { this.log(4, message, context); }
    static trace(message, context) { this.log(5, message, context); }
}
```

### 3.2 パフォーマンス監視

#### UI応答性監視
```javascript
// src/renderer/js/performance-monitor.js
class PerformanceMonitor {
    static UI_RESPONSE_TARGET = 100; // ms
    
    static monitorButtonResponse(buttonElement, actionName) {
        buttonElement.addEventListener('click', (event) => {
            const startTime = performance.now();
            
            // 実際のクリック処理
            setTimeout(() => {
                const responseTime = performance.now() - startTime;
                
                if (responseTime > this.UI_RESPONSE_TARGET) {
                    this.reportSlowResponse(actionName, responseTime);
                } else {
                    this.reportGoodResponse(actionName, responseTime);
                }
            }, 0);
        });
    }
    
    static reportSlowResponse(actionName, responseTime) {
        const error = {
            type: 'UI_PERFORMANCE_ISSUE',
            action: actionName,
            responseTime: responseTime,
            target: this.UI_RESPONSE_TARGET,
            timestamp: Date.now()
        };
        
        window.electronAPI.logError('UI応答性低下', error);
        
        // ユーザーに警告表示
        this.showPerformanceWarning(actionName, responseTime);
    }
    
    static showPerformanceWarning(actionName, responseTime) {
        const warning = document.createElement('div');
        warning.className = 'performance-warning';
        warning.innerHTML = `
            ⚠️ UI応答性低下検出: ${actionName} (${responseTime.toFixed(2)}ms)
            目標値: ${this.UI_RESPONSE_TARGET}ms以内
        `;
        document.body.appendChild(warning);
        
        setTimeout(() => warning.remove(), 3000);
    }
}
```

### 3.3 エラー表示改善システム

#### ユーザーフレンドリーエラー表示
```javascript
// src/renderer/js/error-display.js
class ErrorDisplay {
    static ERROR_SOLUTIONS = {
        'IPC_TIMEOUT': {
            message: 'アプリケーションの通信がタイムアウトしました',
            causes: [
                '大容量ファイルの処理中',
                'システムリソース不足',
                'ウィルス対策ソフトの干渉'
            ],
            solutions: [
                'しばらく待ってから再試行',
                '対象ファイル数を減らす',
                'アプリケーションを再起動'
            ]
        },
        
        'FILE_PERMISSION_DENIED': {
            message: 'ファイルアクセス権限がありません',
            causes: [
                'ファイルが他のアプリケーションで使用中',
                'システムファイル・保護されたファイル',
                'ファイル属性が読み取り専用'
            ],
            solutions: [
                'ファイルを使用している他のアプリを終了',
                '管理者権限でアプリケーションを起動',
                'ファイル属性を確認・変更'
            ]
        },
        
        'MEMORY_EXCEEDED': {
            message: 'メモリ使用量が上限を超えました',
            causes: [
                '大容量ファイルの一括処理',
                'メモリリークの発生',
                'システムメモリ不足'
            ],
            solutions: [
                '処理対象ファイルを分割',
                'アプリケーションを再起動',
                '他のアプリケーションを終了してメモリを開放'
            ]
        }
    };
    
    static showError(errorCode, technicalDetails = {}) {
        const errorInfo = this.ERROR_SOLUTIONS[errorCode];
        if (!errorInfo) {
            return this.showGenericError(errorCode, technicalDetails);
        }
        
        const modal = document.createElement('div');
        modal.className = 'error-modal';
        modal.innerHTML = `
            <div class="error-modal-content">
                <div class="error-header">
                    <h3>🚨 ${errorInfo.message}</h3>
                    <button class="error-close">&times;</button>
                </div>
                
                <div class="error-body">
                    <div class="error-causes">
                        <h4>考えられる原因：</h4>
                        <ul>
                            ${errorInfo.causes.map(cause => `<li>${cause}</li>`).join('')}
                        </ul>
                    </div>
                    
                    <div class="error-solutions">
                        <h4>解決方法：</h4>
                        <ol>
                            ${errorInfo.solutions.map(solution => `<li>${solution}</li>`).join('')}
                        </ol>
                    </div>
                    
                    ${process.env.NODE_ENV === 'development' ? `
                        <details class="error-technical">
                            <summary>技術的詳細</summary>
                            <pre>${JSON.stringify(technicalDetails, null, 2)}</pre>
                        </details>
                    ` : ''}
                </div>
                
                <div class="error-actions">
                    <button class="btn-primary" onclick="location.reload()">再試行</button>
                    <button class="btn-secondary" onclick="this.closest('.error-modal').remove()">閉じる</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // 閉じるボタンのイベント
        modal.querySelector('.error-close').onclick = () => modal.remove();
    }
}
```

## 🔄 4. 継続的品質保証プロセス

### 4.1 Task完了チェックリスト
```markdown
各Task完了時の必須確認項目：

### 基本動作確認
- [ ] npm start でアプリケーション正常起動
- [ ] ESLint チェック通過（警告0件）
- [ ] 基本テストスイート全項目PASS
- [ ] メモリ使用量が200MB以下

### UI応答性確認（Phase 3以降）
- [ ] ボタンクリック100ms以内反応
- [ ] フォーム入力遅延なし
- [ ] ページ読み込み2秒以内

### 機能動作確認
- [ ] 実装した機能の基本操作確認
- [ ] エラーケース動作確認
- [ ] 境界値テスト実行

### 実行ファイル確認（適用可能な場合）
- [ ] npm run build で.appファイル作成成功
- [ ] .appファイル単体起動確認
- [ ] パッケージ版での機能動作確認
```

### 4.2 問題発生時のトリアージ

#### 重要度レベル定義
```markdown
🔴 Critical（即座対応）:
- アプリケーションが起動しない
- 基本機能が全く動作しない
- データ破損・ファイル削除が発生

🟡 High（当日対応）:
- UI応答性が目標値（100ms）を大幅超過
- エラーメッセージが不適切・無意味
- 特定条件下での機能不全

🟢 Medium（翌日対応）:
- 軽微なUI表示不具合
- 非重要機能の動作不安定
- パフォーマンス軽微劣化

🔵 Low（時間あるとき対応）:
- UIデザイン微調整
- ログメッセージ改善
- コードリファクタリング
```

### 4.3 成功指標（KPI）

#### 開発効率指標
```markdown
Task完了時間目標：
- Task 1.1-1.3: 各半日以内
- Task 2.1-2.3: 各1日以内
- Task 3.1-3.4: 各1日以内

品質指標：
- Critical問題発生: 0件
- UI応答性目標達成率: 100%
- テスト成功率: 95%以上
- 実行ファイル作成成功率: 100%
```

## 📚 5. デバッグ知識ベース

### 5.1 よくある問題と解決パターン

#### Electronプロセス間通信問題
```markdown
問題: ipcRenderer.invoke() が応答しない
原因: MainプロセスでipcMain.handle()未登録
解決: IPC通信ルーティング確認、ハンドラー登録確認

問題: contextBridge経由のAPI呼び出し失敗
原因: preload.jsでのAPI公開設定ミス
解決: exposeInMainWorld()構文確認、セキュリティ設定確認
```

#### ファイル操作問題
```markdown
問題: 日本語ファイル名の処理失敗
原因: 文字エンコーディング設定不適切
解決: UTF-8エンコーディング強制、パス正規化処理

問題: 大容量ファイルでメモリ不足
原因: ファイル全体の同期読み込み
解決: Stream処理実装、チャンク分割処理
```

### 5.2 パフォーマンス最適化パターン

#### UI応答性最適化
```javascript
// ❌ 悪い例：UI フリーズ
function processFiles(files) {
    files.forEach(file => {
        // 重い処理（同期）
        processFileSync(file);
    });
}

// ✅ 良い例：非同期処理
async function processFiles(files) {
    for (const file of files) {
        await processFileAsync(file);
        
        // UI更新の機会を与える
        await new Promise(resolve => setTimeout(resolve, 0));
    }
}
```

## 🎯 まとめ：デバッグ環境の期待効果

### Before（デバッグ環境なし）
```
問題発生 → 「エラーが発生しました」 → 原因不明 → 作り直し
```

### After（デバッグ環境あり）
```
問題発生 → 詳細ログ確認 → 原因特定 → パターン適用 → 迅速解決
```

### 期待される成果
1. **開発効率**: 問題解決時間50%短縮
2. **品質向上**: Critical問題0件、UI応答性100%達成
3. **知識蓄積**: 解決パターンの再利用による継続的改善
4. **安心感**: 段階的テストによる確実な機能実装

この包括的なデバッグ環境により、前回の失敗を繰り返すことなく、Python版を大幅に上回るElectronアプリケーションを確実に開発できます。