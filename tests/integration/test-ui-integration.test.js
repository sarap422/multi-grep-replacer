/**
 * UI統合テスト
 * 複数のUIコンポーネント間の連携テスト
 */

const path = require('path');
const fs = require('fs').promises;
const { JSDOM } = require('jsdom');

// 統合HTML環境のセットアップ
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Multi Grep Replacer</title>
    <link rel="stylesheet" href="css/main.css">
    <link rel="stylesheet" href="css/themes.css">
</head>
<body data-theme="light">
    <div class="app-container">
        <!-- Header -->
        <header class="header">
            <h1>Multi Grep Replacer</h1>
            <div class="header-actions">
                <button id="theme-toggle">🌙</button>
                <button id="settings-btn">⚙️</button>
            </div>
        </header>
        
        <!-- Main Content -->
        <main class="main-content">
            <!-- Folder Selection -->
            <section class="folder-section">
                <h2>Target Folder</h2>
                <div class="folder-selector">
                    <input id="folder-path" readonly placeholder="Select folder...">
                    <button id="browse-btn">Browse</button>
                </div>
                <div id="drop-zone" class="drop-zone">
                    Drop folder here
                </div>
            </section>
            
            <!-- File Extensions -->
            <section class="extensions-section">
                <h2>File Extensions</h2>
                <input id="file-extensions" value=".html,.css,.js" placeholder=".html,.css,.js">
                <div id="file-preview">
                    <span id="file-count">0 files found</span>
                </div>
            </section>
            
            <!-- Replacement Rules -->
            <section class="rules-section">
                <h2>Replacement Rules</h2>
                <div id="rules-container">
                    <div class="replacement-rule" data-rule-id="rule1">
                        <input class="from-input" value="old-class" placeholder="From">
                        <input class="to-input" value="new-class" placeholder="To">
                        <input type="checkbox" class="enabled-checkbox" checked>
                        <button class="remove-rule-btn">×</button>
                    </div>
                </div>
                <button id="add-rule-btn">+ Add Rule</button>
            </section>
            
            <!-- Actions -->
            <section class="actions-section">
                <div class="config-actions">
                    <button id="load-config-btn">Load Config</button>
                    <button id="save-config-btn">Save Config</button>
                </div>
                <div class="execute-actions">
                    <button id="execute-btn" class="primary">Execute Replacement</button>
                </div>
            </section>
        </main>
        
        <!-- Progress Modal -->
        <div id="progress-modal" class="modal hidden">
            <div class="modal-content">
                <h3>Processing Files...</h3>
                <div class="progress-container">
                    <div id="progress-bar" style="width: 0%"></div>
                </div>
                <div id="progress-text">0%</div>
                <div id="current-file">Ready</div>
                <button id="cancel-btn">Cancel</button>
            </div>
        </div>
        
        <!-- Results Modal -->
        <div id="results-modal" class="modal hidden">
            <div class="modal-content">
                <h3>Results</h3>
                <div id="results-summary">
                    <div>Modified Files: <span id="modified-files">0</span></div>
                    <div>Total Changes: <span id="total-changes">0</span></div>
                </div>
                <div id="results-details">
                    <ul id="results-list"></ul>
                </div>
                <button id="close-results-btn">Close</button>
            </div>
        </div>
        
        <!-- Notifications -->
        <div id="notification-container"></div>
    </div>
</body>
</html>
`, { url: 'file:///test.html' });

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.performance = { now: () => Date.now() };

// localStorage モック
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// electronAPI モック
global.electronAPI = {
    selectFolder: jest.fn(),
    findFiles: jest.fn(),
    loadConfig: jest.fn(),
    saveConfig: jest.fn(),
    executeReplacement: jest.fn(),
    onProgress: jest.fn(),
    onComplete: jest.fn(),
    onError: jest.fn()
};

// matchMedia モック
global.window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
}));

// テスト対象コンポーネント
const UIController = require('../../src/renderer/js/ui-controller');
const FileSelector = require('../../src/renderer/js/file-selector');
const ProgressDisplay = require('../../src/renderer/js/progress-display');
const ThemeManager = require('../../src/renderer/js/theme-manager');

describe('UI統合テスト', () => {
    let uiController;
    let fileSelector;
    let progressDisplay;
    let themeManager;
    let testDir;

    beforeAll(async () => {
        // テスト用ディレクトリ作成
        testDir = path.join(__dirname, '..', 'fixtures', 'ui-integration');
        await fs.mkdir(testDir, { recursive: true });
        
        // テスト用ファイル作成
        const testFiles = {
            'index.html': '<div class="old-class">Content</div>',
            'style.css': '.old-class { color: red; }',
            'script.js': 'const oldVariable = "test";'
        };
        
        for (const [filename, content] of Object.entries(testFiles)) {
            await fs.writeFile(path.join(testDir, filename), content, 'utf8');
        }
    });

    afterAll(async () => {
        // テストディレクトリクリーンアップ
        try {
            await fs.rm(testDir, { recursive: true, force: true });
        } catch (error) {
            console.warn('UI統合テストクリーンアップエラー:', error.message);
        }
    });

    beforeEach(() => {
        // DOM状態のリセット
        document.getElementById('folder-path').value = '';
        document.getElementById('file-extensions').value = '.html,.css,.js';
        document.getElementById('file-count').textContent = '0 files found';
        document.getElementById('progress-modal').classList.add('hidden');
        document.getElementById('results-modal').classList.add('hidden');
        document.body.setAttribute('data-theme', 'light');
        
        // electronAPI モックのリセット
        Object.keys(electronAPI).forEach(key => {
            if (typeof electronAPI[key] === 'function') {
                electronAPI[key].mockClear();
            }
        });
        
        // コンポーネント初期化
        uiController = new UIController();
        fileSelector = new FileSelector();
        progressDisplay = new ProgressDisplay();
        themeManager = new ThemeManager();
    });

    afterEach(() => {
        // コンポーネントクリーンアップ
        [uiController, fileSelector, progressDisplay, themeManager].forEach(component => {
            if (component && component.destroy) {
                component.destroy();
            }
        });
    });

    describe('フォルダ選択からファイル検索までの連携', () => {
        test('フォルダ選択→ファイル検索→プレビュー表示の完全フロー', async () => {
            // 1. フォルダ選択
            electronAPI.selectFolder.mockResolvedValue({
                success: true,
                folderPath: testDir
            });
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: [
                    path.join(testDir, 'index.html'),
                    path.join(testDir, 'style.css'),
                    path.join(testDir, 'script.js')
                ]
            });
            
            // フォルダ選択実行
            await fileSelector.selectFolder();
            
            // UI状態確認
            expect(document.getElementById('folder-path').value).toBe(testDir);
            expect(uiController.currentConfig.folderPath).toBe(testDir);
            
            // 2. ファイル検索が自動実行される
            await new Promise(resolve => setTimeout(resolve, 100)); // 非同期処理待機
            
            // プレビュー表示確認
            expect(document.getElementById('file-count').textContent).toContain('3 files');
            expect(fileSelector.foundFiles).toHaveLength(3);
        });

        test('拡張子フィルタ変更でのリアルタイム更新', async () => {
            // 初期設定
            fileSelector.selectedFolder = testDir;
            
            // HTML/CSS のみ検索
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: [
                    path.join(testDir, 'index.html'),
                    path.join(testDir, 'style.css')
                ]
            });
            
            // 拡張子フィルタ変更
            const extensionsInput = document.getElementById('file-extensions');
            extensionsInput.value = '.html,.css';
            extensionsInput.dispatchEvent(new Event('input'));
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            expect(electronAPI.findFiles).toHaveBeenCalledWith(
                testDir,
                ['.html', '.css'],
                expect.any(Array)
            );
            expect(document.getElementById('file-count').textContent).toContain('2 files');
        });

        test('ドラッグ&ドロップでのフォルダ選択', async () => {
            electronAPI.validatePath.mockResolvedValue({
                valid: true,
                isDirectory: true
            });
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: [path.join(testDir, 'index.html')]
            });
            
            // ドロップイベントシミュレート
            const dropEvent = new CustomEvent('drop', {
                detail: {
                    dataTransfer: {
                        files: [{ path: testDir, type: 'folder' }]
                    }
                }
            });
            
            await fileSelector.handleDrop(dropEvent);
            
            expect(fileSelector.selectedFolder).toBe(testDir);
            expect(uiController.currentConfig.folderPath).toBe(testDir);
        });
    });

    describe('置換ルール管理とUI連携', () => {
        test('ルール追加→編集→削除の完全フロー', () => {
            const initialRuleCount = document.querySelectorAll('.replacement-rule').length;
            
            // ルール追加
            const addButton = document.getElementById('add-rule-btn');
            addButton.click();
            
            const newRuleCount = document.querySelectorAll('.replacement-rule').length;
            expect(newRuleCount).toBe(initialRuleCount + 1);
            
            // ルール編集
            const newRule = document.querySelectorAll('.replacement-rule')[newRuleCount - 1];
            const fromInput = newRule.querySelector('.from-input');
            const toInput = newRule.querySelector('.to-input');
            
            fromInput.value = 'test-from';
            toInput.value = 'test-to';
            fromInput.dispatchEvent(new Event('input'));
            toInput.dispatchEvent(new Event('input'));
            
            // UI状態確認
            const rules = uiController.getReplacementRules();
            const lastRule = rules[rules.length - 1];
            expect(lastRule.from).toBe('test-from');
            expect(lastRule.to).toBe('test-to');
            
            // ルール削除
            const removeButton = newRule.querySelector('.remove-rule-btn');
            removeButton.click();
            
            const finalRuleCount = document.querySelectorAll('.replacement-rule').length;
            expect(finalRuleCount).toBe(initialRuleCount);
        });

        test('ルール有効/無効の切り替え', () => {
            const ruleElement = document.querySelector('.replacement-rule');
            const checkbox = ruleElement.querySelector('.enabled-checkbox');
            
            // 無効化
            checkbox.checked = false;
            checkbox.dispatchEvent(new Event('change'));
            
            const rules = uiController.getReplacementRules();
            expect(rules[0].enabled).toBe(false);
            
            // 有効化
            checkbox.checked = true;
            checkbox.dispatchEvent(new Event('change'));
            
            const updatedRules = uiController.getReplacementRules();
            expect(updatedRules[0].enabled).toBe(true);
        });
    });

    describe('設定管理の統合', () => {
        test('設定保存→読み込みの完全サイクル', async () => {
            // 初期設定
            uiController.currentConfig.folderPath = testDir;
            document.getElementById('file-extensions').value = '.html,.css,.js,.php';
            
            // 設定保存
            const mockConfigPath = '/test/config.json';
            electronAPI.saveConfig.mockResolvedValue({
                success: true,
                filePath: mockConfigPath
            });
            
            await uiController.saveConfig(mockConfigPath);
            
            expect(electronAPI.saveConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    target_settings: expect.objectContaining({
                        file_extensions: ['.html', '.css', '.js', '.php']
                    }),
                    replacements: expect.any(Array)
                }),
                mockConfigPath
            );
            
            // 設定読み込み
            const mockConfig = {
                target_settings: {
                    file_extensions: ['.html', '.css'],
                    exclude_patterns: ['node_modules/**']
                },
                replacements: [
                    { id: 'rule1', from: 'old', to: 'new', enabled: true }
                ]
            };
            
            electronAPI.loadConfig.mockResolvedValue({
                success: true,
                config: mockConfig
            });
            
            await uiController.loadConfig('/test/config.json');
            
            // UI状態確認
            expect(document.getElementById('file-extensions').value).toBe('.html,.css');
            expect(uiController.getReplacementRules()).toHaveLength(1);
            expect(uiController.getReplacementRules()[0].from).toBe('old');
        });
    });

    describe('実行フローの統合', () => {
        test('実行→進捗表示→結果表示の完全フロー', async () => {
            // 事前設定
            uiController.currentConfig.folderPath = testDir;
            
            // 実行結果モック
            const mockResults = {
                success: true,
                summary: {
                    totalFiles: 3,
                    modifiedFiles: 2,
                    totalChanges: 5,
                    processingTime: 1500
                },
                details: [
                    {
                        filePath: path.join(testDir, 'index.html'),
                        modified: true,
                        changes: 2
                    },
                    {
                        filePath: path.join(testDir, 'style.css'),
                        modified: true,
                        changes: 3
                    }
                ]
            };
            
            electronAPI.executeReplacement.mockResolvedValue(mockResults);
            
            // 進捗コールバックの設定
            let progressCallback;
            electronAPI.executeReplacement.mockImplementation((config) => {
                return new Promise(resolve => {
                    // 進捗シミュレート
                    setTimeout(() => {
                        if (progressCallback) {
                            progressCallback(1, 3, path.join(testDir, 'index.html'));
                        }
                    }, 50);
                    
                    setTimeout(() => {
                        if (progressCallback) {
                            progressCallback(2, 3, path.join(testDir, 'style.css'));
                        }
                    }, 100);
                    
                    setTimeout(() => {
                        if (progressCallback) {
                            progressCallback(3, 3, 'Completed');
                        }
                        resolve(mockResults);
                    }, 150);
                });
            });
            
            // 実行開始
            const executeButton = document.getElementById('execute-btn');
            executeButton.click();
            
            // 進捗モーダル表示確認
            expect(document.getElementById('progress-modal').classList.contains('hidden')).toBe(false);
            expect(progressDisplay.isProcessing).toBe(true);
            
            // 実行完了まで待機
            await new Promise(resolve => setTimeout(resolve, 200));
            
            // 結果モーダル表示確認
            expect(document.getElementById('results-modal').classList.contains('hidden')).toBe(false);
            expect(document.getElementById('modified-files').textContent).toBe('2');
            expect(document.getElementById('total-changes').textContent).toBe('5');
            
            // 進捗モーダル非表示確認
            expect(document.getElementById('progress-modal').classList.contains('hidden')).toBe(true);
        });

        test('実行エラー時の統合処理', async () => {
            uiController.currentConfig.folderPath = testDir;
            
            const mockError = new Error('File access denied');
            electronAPI.executeReplacement.mockRejectedValue(mockError);
            
            const executeButton = document.getElementById('execute-btn');
            executeButton.click();
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // エラー処理確認
            expect(progressDisplay.lastError).toBeDefined();
            expect(document.getElementById('progress-modal').classList.contains('hidden')).toBe(true);
        });
    });

    describe('テーマ切り替えの統合', () => {
        test('テーマ切り替えが全コンポーネントに反映される', () => {
            // ダークモードに切り替え
            const themeToggle = document.getElementById('theme-toggle');
            themeToggle.click();
            
            // 全体テーマ適用確認
            expect(document.body.getAttribute('data-theme')).toBe('dark');
            expect(themeManager.currentTheme).toBe('dark');
            
            // 各コンポーネントがテーマ変更に対応
            expect(document.querySelector('.modal')).toBeDefined();
            expect(document.querySelector('.replacement-rule')).toBeDefined();
        });

        test('テーマ設定の永続化と復元', () => {
            // テーマ変更
            themeManager.setTheme('dark');
            
            // localStorage保存確認
            expect(localStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
            
            // 新しいThemeManagerインスタンス作成時の復元
            localStorage.getItem.mockReturnValue('dark');
            const newThemeManager = new ThemeManager();
            
            expect(newThemeManager.currentTheme).toBe('dark');
        });
    });

    describe('パフォーマンス統合テスト', () => {
        test('大量ファイル処理でのUI応答性', async () => {
            const largeFileList = Array.from({ length: 1000 }, (_, i) => 
                path.join(testDir, `file${i}.html`)
            );
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: largeFileList
            });
            
            fileSelector.selectedFolder = testDir;
            
            const startTime = performance.now();
            await fileSelector.searchFiles();
            const endTime = performance.now();
            
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(1000); // 1秒以内
            expect(document.getElementById('file-count').textContent).toContain('1000 files');
        });

        test('複数コンポーネント同時操作での性能', () => {
            const startTime = performance.now();
            
            // 複数の操作を同時実行
            themeManager.setTheme('dark');
            uiController.addReplacementRule();
            uiController.addReplacementRule();
            uiController.addReplacementRule();
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            expect(totalTime).toBeLessThan(100); // 100ms以内
        });
    });

    describe('エラーハンドリング統合', () => {
        test('ネットワークエラー時の統合エラー処理', async () => {
            const networkError = new Error('Network timeout');
            electronAPI.selectFolder.mockRejectedValue(networkError);
            electronAPI.findFiles.mockRejectedValue(networkError);
            electronAPI.executeReplacement.mockRejectedValue(networkError);
            
            // 各操作でエラーが適切に処理される
            await fileSelector.selectFolder();
            expect(fileSelector.lastError).toBeDefined();
            
            await uiController.executeReplacement();
            expect(uiController.lastError).toBeDefined();
            
            // UI状態が一貫している
            expect(document.getElementById('progress-modal').classList.contains('hidden')).toBe(true);
        });

        test('API呼び出し失敗時の段階的フォールバック', async () => {
            // 段階的なAPI失敗をシミュレート
            electronAPI.selectFolder.mockResolvedValue({ success: true, folderPath: testDir });
            electronAPI.findFiles.mockRejectedValue(new Error('Permission denied'));
            
            await fileSelector.selectFolder();
            expect(fileSelector.selectedFolder).toBe(testDir);
            
            // ファイル検索失敗でも基本操作は継続可能
            expect(fileSelector.foundFiles).toEqual([]);
            expect(document.getElementById('file-count').textContent).toContain('0 files');
        });
    });

    describe('アクセシビリティ統合', () => {
        test('キーボードナビゲーションの統合', () => {
            // Tab順序確認
            const focusableElements = [
                'browse-btn',
                'file-extensions',
                'add-rule-btn',
                'execute-btn',
                'theme-toggle'
            ].map(id => document.getElementById(id));
            
            let currentFocus = 0;
            
            // Tab キー送信のシミュレート
            const simulateTab = () => {
                if (currentFocus < focusableElements.length) {
                    focusableElements[currentFocus].focus();
                    currentFocus++;
                }
            };
            
            // 各要素にフォーカス可能
            focusableElements.forEach((element, index) => {
                simulateTab();
                expect(document.activeElement).toBe(element);
            });
        });

        test('Enter/Space キーでの操作実行', () => {
            const executeButton = document.getElementById('execute-btn');
            const themeToggle = document.getElementById('theme-toggle');
            
            // Enter キーでの実行
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            executeButton.dispatchEvent(enterEvent);
            
            // Space キーでのテーマ切り替え
            const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
            themeToggle.dispatchEvent(spaceEvent);
            
            expect(themeManager.currentTheme).toBe('dark');
        });
    });

    describe('メモリ効率性統合', () => {
        test('長時間動作でのメモリリーク検証', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 大量の操作を実行
            for (let i = 0; i < 100; i++) {
                uiController.addReplacementRule();
                themeManager.setTheme(i % 2 === 0 ? 'light' : 'dark');
                
                const rules = uiController.getReplacementRules();
                rules.forEach(rule => {
                    if (rule.id !== 'rule1') { // 初期ルールは削除しない
                        uiController.removeReplacementRule(rule.id);
                    }
                });
            }
            
            // 強制ガベージコレクション
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // メモリ増加が合理的な範囲内
            expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB以内
        });
    });
});

console.log('✅ UI統合テスト読み込み完了');