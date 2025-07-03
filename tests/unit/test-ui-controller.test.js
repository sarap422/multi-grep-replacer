/**
 * UI Controller ユニットテスト
 * レンダラープロセスの主要UI制御コンポーネントのテスト
 */

// DOM環境のシミュレート
const { JSDOM } = require('jsdom');

// テスト環境用のDOM設定
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test</title>
</head>
<body>
    <div id="folder-path"></div>
    <input id="file-extensions" value=".html,.css,.js">
    <div id="replacement-rules-container">
        <div class="replacement-rule" data-rule-id="rule1">
            <input class="from-input" value="old">
            <input class="to-input" value="new">
            <input type="checkbox" class="enabled-checkbox" checked>
        </div>
    </div>
    <button id="add-rule-btn">Add Rule</button>
    <button id="execute-btn">Execute</button>
    <div id="preview-container"></div>
    <div id="status-bar"></div>
</body>
</html>
`, { url: 'file:///test.html' });

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

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

// テスト対象クラス
const UIController = require('../../src/renderer/js/ui-controller');

describe('UIController ユニットテスト', () => {
    let uiController;
    let mockEvents;

    beforeEach(() => {
        // イベント記録用
        mockEvents = [];
        
        // DOM要素のリセット
        document.getElementById('folder-path').textContent = '';
        document.getElementById('file-extensions').value = '.html,.css,.js';
        document.getElementById('preview-container').innerHTML = '';
        
        // electronAPI モックのリセット
        Object.keys(electronAPI).forEach(key => {
            if (typeof electronAPI[key] === 'function') {
                electronAPI[key].mockClear();
            }
        });
        
        // UIController インスタンス作成
        uiController = new UIController();
    });

    afterEach(() => {
        if (uiController) {
            uiController.destroy();
        }
    });

    describe('初期化・基本機能', () => {
        test('UIController が正常に初期化される', () => {
            expect(uiController).toBeDefined();
            expect(uiController.isInitialized).toBe(true);
            expect(uiController.currentConfig).toBeDefined();
        });

        test('DOM要素が正常に取得される', () => {
            expect(uiController.elements.folderPath).toBe(document.getElementById('folder-path'));
            expect(uiController.elements.fileExtensions).toBe(document.getElementById('file-extensions'));
            expect(uiController.elements.executeBtn).toBe(document.getElementById('execute-btn'));
        });

        test('イベントリスナーが適切に設定される', () => {
            const addButton = document.getElementById('add-rule-btn');
            const executeButton = document.getElementById('execute-btn');
            
            // イベントリスナーが設定されていることを確認
            expect(addButton.onclick).toBeDefined();
            expect(executeButton.onclick).toBeDefined();
        });
    });

    describe('フォルダ選択機能', () => {
        test('フォルダ選択が正常に動作する', async () => {
            const mockFolderPath = '/test/folder/path';
            electronAPI.selectFolder.mockResolvedValue({ 
                success: true, 
                folderPath: mockFolderPath 
            });

            await uiController.selectFolder();

            expect(electronAPI.selectFolder).toHaveBeenCalled();
            expect(document.getElementById('folder-path').textContent).toBe(mockFolderPath);
            expect(uiController.currentConfig.folderPath).toBe(mockFolderPath);
        });

        test('フォルダ選択キャンセル時の適切な処理', async () => {
            electronAPI.selectFolder.mockResolvedValue({ 
                success: false, 
                cancelled: true 
            });

            await uiController.selectFolder();

            expect(electronAPI.selectFolder).toHaveBeenCalled();
            expect(document.getElementById('folder-path').textContent).toBe('');
        });

        test('フォルダ選択エラー時の適切な処理', async () => {
            const mockError = new Error('フォルダアクセスエラー');
            electronAPI.selectFolder.mockRejectedValue(mockError);

            await uiController.selectFolder();

            expect(electronAPI.selectFolder).toHaveBeenCalled();
            // エラーハンドリングが適切に動作することを確認
            expect(uiController.lastError).toBeDefined();
        });
    });

    describe('置換ルール管理', () => {
        test('新しいルールが正常に追加される', () => {
            const initialRuleCount = uiController.getReplacementRules().length;
            
            uiController.addReplacementRule();
            
            const newRuleCount = uiController.getReplacementRules().length;
            expect(newRuleCount).toBe(initialRuleCount + 1);
            
            // DOM に新しいルールが追加されることを確認
            const ruleElements = document.querySelectorAll('.replacement-rule');
            expect(ruleElements.length).toBe(newRuleCount);
        });

        test('ルールが正常に削除される', () => {
            const ruleId = 'rule1';
            const initialRuleCount = uiController.getReplacementRules().length;
            
            uiController.removeReplacementRule(ruleId);
            
            const newRuleCount = uiController.getReplacementRules().length;
            expect(newRuleCount).toBe(initialRuleCount - 1);
            
            // DOM からルールが削除されることを確認
            const deletedRule = document.querySelector(`[data-rule-id="${ruleId}"]`);
            expect(deletedRule).toBeNull();
        });

        test('ルールの更新が正常に動作する', () => {
            const ruleId = 'rule1';
            const newFromValue = 'updated-from';
            const newToValue = 'updated-to';
            
            uiController.updateReplacementRule(ruleId, {
                from: newFromValue,
                to: newToValue,
                enabled: false
            });
            
            const updatedRule = uiController.getReplacementRules().find(r => r.id === ruleId);
            expect(updatedRule.from).toBe(newFromValue);
            expect(updatedRule.to).toBe(newToValue);
            expect(updatedRule.enabled).toBe(false);
        });

        test('無効なルールIDでの更新が適切に処理される', () => {
            const invalidRuleId = 'nonexistent';
            
            expect(() => {
                uiController.updateReplacementRule(invalidRuleId, {
                    from: 'test',
                    to: 'test'
                });
            }).not.toThrow();
            
            // ルール数が変わらないことを確認
            const rules = uiController.getReplacementRules();
            expect(rules.length).toBe(1); // 初期ルール1つ
        });
    });

    describe('プレビュー機能', () => {
        test('ファイルプレビューが正常に更新される', async () => {
            const mockFiles = [
                '/test/file1.html',
                '/test/file2.css',
                '/test/file3.js'
            ];
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: mockFiles
            });
            
            await uiController.updatePreview();
            
            expect(electronAPI.findFiles).toHaveBeenCalled();
            
            const previewContainer = document.getElementById('preview-container');
            expect(previewContainer.innerHTML).toContain(`${mockFiles.length} files found`);
        });

        test('ファイルプレビューエラーの適切な処理', async () => {
            electronAPI.findFiles.mockRejectedValue(new Error('ファイル検索エラー'));
            
            await uiController.updatePreview();
            
            const previewContainer = document.getElementById('preview-container');
            expect(previewContainer.innerHTML).toContain('エラー');
        });
    });

    describe('実行制御', () => {
        test('置換実行が正常に開始される', async () => {
            // 事前準備
            uiController.currentConfig.folderPath = '/test/folder';
            
            electronAPI.executeReplacement.mockResolvedValue({
                success: true,
                summary: {
                    totalFiles: 5,
                    modifiedFiles: 3,
                    totalChanges: 10
                }
            });
            
            await uiController.executeReplacement();
            
            expect(electronAPI.executeReplacement).toHaveBeenCalledWith({
                folderPath: '/test/folder',
                fileExtensions: ['.html', '.css', '.js'],
                replacementRules: expect.any(Array)
            });
        });

        test('フォルダが選択されていない場合のエラー処理', async () => {
            // フォルダパスを空にする
            uiController.currentConfig.folderPath = '';
            
            await uiController.executeReplacement();
            
            // electronAPI が呼ばれないことを確認
            expect(electronAPI.executeReplacement).not.toHaveBeenCalled();
            
            // エラーメッセージが表示されることを確認
            expect(uiController.lastError).toContain('フォルダ');
        });

        test('空の置換ルールでのエラー処理', async () => {
            uiController.currentConfig.folderPath = '/test/folder';
            
            // 全ルールを削除
            const rules = uiController.getReplacementRules();
            rules.forEach(rule => {
                uiController.removeReplacementRule(rule.id);
            });
            
            await uiController.executeReplacement();
            
            expect(electronAPI.executeReplacement).not.toHaveBeenCalled();
            expect(uiController.lastError).toContain('ルール');
        });
    });

    describe('設定管理', () => {
        test('設定の保存が正常に動作する', async () => {
            const mockConfigPath = '/test/config.json';
            
            electronAPI.saveConfig.mockResolvedValue({
                success: true,
                path: mockConfigPath
            });
            
            await uiController.saveConfig(mockConfigPath);
            
            expect(electronAPI.saveConfig).toHaveBeenCalledWith(
                expect.objectContaining({
                    replacements: expect.any(Array),
                    target_settings: expect.any(Object)
                }),
                mockConfigPath
            );
        });

        test('設定の読み込みが正常に動作する', async () => {
            const mockConfig = {
                replacements: [
                    { id: 'rule1', from: 'old', to: 'new', enabled: true }
                ],
                target_settings: {
                    file_extensions: ['.html', '.css'],
                    exclude_patterns: []
                }
            };
            
            electronAPI.loadConfig.mockResolvedValue({
                success: true,
                config: mockConfig
            });
            
            await uiController.loadConfig('/test/config.json');
            
            expect(electronAPI.loadConfig).toHaveBeenCalled();
            
            // 設定が UI に反映されることを確認
            expect(uiController.currentConfig.replacements).toEqual(mockConfig.replacements);
            expect(document.getElementById('file-extensions').value).toBe('.html,.css');
        });
    });

    describe('UI応答性要件', () => {
        test('ボタンクリック100ms以内応答', async () => {
            const startTime = performance.now();
            
            const addButton = document.getElementById('add-rule-btn');
            addButton.click();
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            expect(responseTime).toBeLessThan(100); // 100ms以内
        });

        test('入力フィールドのリアルタイム反応', () => {
            const fileExtensionsInput = document.getElementById('file-extensions');
            
            const startTime = performance.now();
            
            // 入力イベントシミュレート
            fileExtensionsInput.value = '.html,.css,.js,.php';
            fileExtensionsInput.dispatchEvent(new Event('input'));
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            expect(responseTime).toBeLessThan(50); // 50ms以内（タイピング要件）
            expect(uiController.currentConfig.fileExtensions).toEqual(['.html', '.css', '.js', '.php']);
        });
    });

    describe('エラーハンドリング', () => {
        test('API エラーの適切な処理', async () => {
            const mockError = new Error('API connection failed');
            electronAPI.selectFolder.mockRejectedValue(mockError);
            
            await uiController.selectFolder();
            
            expect(uiController.lastError).toBeDefined();
            
            // エラーメッセージが status bar に表示される
            const statusBar = document.getElementById('status-bar');
            expect(statusBar.textContent).toContain('エラー');
        });

        test('ネットワークエラーの処理', async () => {
            const networkError = new Error('Network timeout');
            electronAPI.executeReplacement.mockRejectedValue(networkError);
            
            uiController.currentConfig.folderPath = '/test/folder';
            await uiController.executeReplacement();
            
            expect(uiController.lastError).toContain('Network');
        });
    });

    describe('メモリ効率性', () => {
        test('大量ルール管理でのメモリリークなし', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 大量のルールを追加・削除
            for (let i = 0; i < 1000; i++) {
                uiController.addReplacementRule();
            }
            
            const rules = uiController.getReplacementRules();
            rules.forEach(rule => {
                uiController.removeReplacementRule(rule.id);
            });
            
            // ガベージコレクション強制実行
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            // メモリ増加が合理的な範囲内であることを確認
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
        });
    });
});

console.log('✅ UIController ユニットテスト読み込み完了');