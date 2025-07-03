/**
 * FileSelector ユニットテスト
 * ファイル・フォルダ選択コンポーネントのテスト
 */

const path = require('path');
const { JSDOM } = require('jsdom');

// DOM環境のシミュレート
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test</title>
</head>
<body>
    <div id="folder-selector">
        <input id="folder-path" readonly>
        <button id="browse-button">Browse</button>
        <div id="drop-zone" class="drop-zone">Drop folder here</div>
    </div>
    <div id="file-preview">
        <div id="file-count">0 files found</div>
        <ul id="file-list"></ul>
    </div>
    <div id="extension-filter">
        <input id="extensions-input" value=".html,.css,.js">
        <button id="clear-filter">Clear</button>
    </div>
</body>
</html>
`, { url: 'file:///test.html' });

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.DragEvent = dom.window.DragEvent;
global.DataTransfer = dom.window.DataTransfer;

// electronAPI モック
global.electronAPI = {
    selectFolder: jest.fn(),
    findFiles: jest.fn(),
    getFileStats: jest.fn(),
    validatePath: jest.fn()
};

// テスト対象クラス
const FileSelector = require('../../src/renderer/js/file-selector');

describe('FileSelector ユニットテスト', () => {
    let fileSelector;
    let mockEventData;

    beforeEach(() => {
        // テスト用データ
        mockEventData = {
            selectedFolder: null,
            foundFiles: [],
            filterExtensions: ['.html', '.css', '.js']
        };
        
        // DOM要素のリセット
        document.getElementById('folder-path').value = '';
        document.getElementById('extensions-input').value = '.html,.css,.js';
        document.getElementById('file-count').textContent = '0 files found';
        document.getElementById('file-list').innerHTML = '';
        
        // electronAPI モックのリセット
        Object.keys(electronAPI).forEach(key => {
            if (typeof electronAPI[key] === 'function') {
                electronAPI[key].mockClear();
            }
        });
        
        // FileSelector インスタンス作成
        fileSelector = new FileSelector({
            maxPreviewFiles: 100,
            enableDragDrop: true,
            autoRefresh: true
        });
    });

    afterEach(() => {
        if (fileSelector) {
            fileSelector.destroy();
        }
    });

    describe('初期化・基本機能', () => {
        test('FileSelector が正常に初期化される', () => {
            expect(fileSelector).toBeDefined();
            expect(fileSelector.isInitialized).toBe(true);
            expect(fileSelector.options.maxPreviewFiles).toBe(100);
            expect(fileSelector.options.enableDragDrop).toBe(true);
        });

        test('DOM要素が正常に取得される', () => {
            expect(fileSelector.elements.folderPath).toBe(document.getElementById('folder-path'));
            expect(fileSelector.elements.browseButton).toBe(document.getElementById('browse-button'));
            expect(fileSelector.elements.dropZone).toBe(document.getElementById('drop-zone'));
            expect(fileSelector.elements.extensionsInput).toBe(document.getElementById('extensions-input'));
        });

        test('初期状態が正しく設定される', () => {
            expect(fileSelector.selectedFolder).toBeNull();
            expect(fileSelector.foundFiles).toEqual([]);
            expect(fileSelector.currentExtensions).toEqual(['.html', '.css', '.js']);
        });
    });

    describe('フォルダ選択機能', () => {
        test('フォルダ選択ダイアログが正常に動作する', async () => {
            const mockFolderPath = '/Users/test/project';
            
            electronAPI.selectFolder.mockResolvedValue({
                success: true,
                folderPath: mockFolderPath,
                cancelled: false
            });
            
            const result = await fileSelector.selectFolder();
            
            expect(electronAPI.selectFolder).toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.folderPath).toBe(mockFolderPath);
            expect(fileSelector.selectedFolder).toBe(mockFolderPath);
            expect(document.getElementById('folder-path').value).toBe(mockFolderPath);
        });

        test('フォルダ選択キャンセル時の処理', async () => {
            electronAPI.selectFolder.mockResolvedValue({
                success: false,
                cancelled: true
            });
            
            const result = await fileSelector.selectFolder();
            
            expect(result.success).toBe(false);
            expect(result.cancelled).toBe(true);
            expect(fileSelector.selectedFolder).toBeNull();
        });

        test('無効なフォルダパス時のエラー処理', async () => {
            const invalidPath = '/nonexistent/folder';
            
            electronAPI.selectFolder.mockResolvedValue({
                success: true,
                folderPath: invalidPath
            });
            
            electronAPI.validatePath.mockResolvedValue({
                valid: false,
                error: 'Folder does not exist'
            });
            
            const result = await fileSelector.selectFolder();
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('exist');
        });
    });

    describe('ドラッグ&ドロップ機能', () => {
        test('フォルダドロップが正常に処理される', async () => {
            const mockFolderPath = '/Users/test/dropped-folder';
            
            // ドロップイベントのシミュレート
            const mockDataTransfer = {
                files: [{
                    path: mockFolderPath,
                    type: 'folder'
                }]
            };
            
            electronAPI.validatePath.mockResolvedValue({
                valid: true,
                isDirectory: true
            });
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: ['/test/file1.html', '/test/file2.css']
            });
            
            const dropEvent = new CustomEvent('drop', {
                detail: { dataTransfer: mockDataTransfer }
            });
            
            await fileSelector.handleDrop(dropEvent);
            
            expect(fileSelector.selectedFolder).toBe(mockFolderPath);
            expect(electronAPI.findFiles).toHaveBeenCalled();
        });

        test('無効なドロップアイテムの処理', async () => {
            // ファイル（フォルダではない）をドロップ
            const mockDataTransfer = {
                files: [{
                    path: '/test/file.txt',
                    type: 'file'
                }]
            };
            
            electronAPI.validatePath.mockResolvedValue({
                valid: true,
                isDirectory: false
            });
            
            const dropEvent = new CustomEvent('drop', {
                detail: { dataTransfer: mockDataTransfer }
            });
            
            const result = await fileSelector.handleDrop(dropEvent);
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('フォルダ');
        });

        test('ドラッグオーバー視覚効果が動作する', () => {
            const dropZone = document.getElementById('drop-zone');
            
            const dragOverEvent = new CustomEvent('dragover');
            fileSelector.handleDragOver(dragOverEvent);
            
            expect(dropZone.classList.contains('drag-over')).toBe(true);
        });

        test('ドラッグリーブ時の視覚効果解除', () => {
            const dropZone = document.getElementById('drop-zone');
            dropZone.classList.add('drag-over');
            
            const dragLeaveEvent = new CustomEvent('dragleave');
            fileSelector.handleDragLeave(dragLeaveEvent);
            
            expect(dropZone.classList.contains('drag-over')).toBe(false);
        });
    });

    describe('ファイル拡張子フィルタ', () => {
        test('拡張子フィルタの更新が正常に動作する', async () => {
            const newExtensions = ['.html', '.css', '.js', '.php', '.md'];
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: [
                    '/test/file1.html',
                    '/test/file2.php',
                    '/test/file3.md'
                ]
            });
            
            fileSelector.selectedFolder = '/test/folder';
            
            await fileSelector.updateExtensions(newExtensions);
            
            expect(fileSelector.currentExtensions).toEqual(newExtensions);
            expect(electronAPI.findFiles).toHaveBeenCalledWith(
                '/test/folder',
                newExtensions,
                expect.any(Array)
            );
        });

        test('空の拡張子フィルタ（全ファイル対象）', async () => {
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: [
                    '/test/file1.html',
                    '/test/file2.txt',
                    '/test/file3.json'
                ]
            });
            
            fileSelector.selectedFolder = '/test/folder';
            
            await fileSelector.updateExtensions([]);
            
            expect(fileSelector.currentExtensions).toEqual([]);
            expect(electronAPI.findFiles).toHaveBeenCalledWith(
                '/test/folder',
                [], // 空配列 = 全ファイル
                expect.any(Array)
            );
        });

        test('無効な拡張子形式のバリデーション', () => {
            const invalidExtensions = ['html', 'css', 'js']; // ドットなし
            
            const result = fileSelector.validateExtensions(invalidExtensions);
            
            expect(result.valid).toBe(false);
            expect(result.errors).toContain('拡張子にはドット（.）が必要です');
        });

        test('拡張子の正規化処理', () => {
            const inputExtensions = [' .HTML ', '.CSS', '.js ', 'php']; // 空白、大文字、ドットなし混在
            
            const normalized = fileSelector.normalizeExtensions(inputExtensions);
            
            expect(normalized).toEqual(['.html', '.css', '.js', '.php']);
        });
    });

    describe('ファイル検索・プレビュー', () => {
        test('ファイル検索が正常に実行される', async () => {
            const mockFiles = [
                '/test/index.html',
                '/test/style.css',
                '/test/script.js',
                '/test/readme.md'
            ];
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: mockFiles,
                stats: {
                    totalFiles: 4,
                    totalSize: 12345
                }
            });
            
            fileSelector.selectedFolder = '/test/folder';
            
            const result = await fileSelector.searchFiles();
            
            expect(result.success).toBe(true);
            expect(result.files).toEqual(mockFiles);
            expect(fileSelector.foundFiles).toEqual(mockFiles);
            expect(document.getElementById('file-count').textContent).toContain('4 files');
        });

        test('大量ファイルのプレビュー制限', async () => {
            const manyFiles = Array.from({ length: 500 }, (_, i) => `/test/file${i}.html`);
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: manyFiles
            });
            
            fileSelector.selectedFolder = '/test/folder';
            fileSelector.options.maxPreviewFiles = 100;
            
            await fileSelector.searchFiles();
            
            const fileListItems = document.querySelectorAll('#file-list li');
            expect(fileListItems.length).toBeLessThanOrEqual(100);
            
            // 「さらに表示」リンクが表示される
            const showMoreLink = document.querySelector('#file-list .show-more');
            expect(showMoreLink).toBeDefined();
        });

        test('ファイル検索エラーの処理', async () => {
            electronAPI.findFiles.mockRejectedValue(new Error('Permission denied'));
            
            fileSelector.selectedFolder = '/restricted/folder';
            
            const result = await fileSelector.searchFiles();
            
            expect(result.success).toBe(false);
            expect(result.error).toContain('Permission');
            expect(fileSelector.lastError).toBeDefined();
        });
    });

    describe('除外パターン機能', () => {
        test('除外パターンが正常に適用される', async () => {
            const allFiles = [
                '/test/src/main.js',
                '/test/node_modules/package.js',
                '/test/.git/config',
                '/test/dist/bundle.js'
            ];
            
            const filteredFiles = ['/test/src/main.js'];
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: filteredFiles // 除外パターン適用済み
            });
            
            fileSelector.selectedFolder = '/test';
            fileSelector.excludePatterns = ['node_modules/**', '.git/**', 'dist/**'];
            
            await fileSelector.searchFiles();
            
            expect(electronAPI.findFiles).toHaveBeenCalledWith(
                '/test',
                expect.any(Array),
                ['node_modules/**', '.git/**', 'dist/**']
            );
            expect(fileSelector.foundFiles).toEqual(filteredFiles);
        });

        test('カスタム除外パターンの追加', () => {
            const customPattern = 'build/**';
            
            fileSelector.addExcludePattern(customPattern);
            
            expect(fileSelector.excludePatterns).toContain(customPattern);
        });

        test('除外パターンの削除', () => {
            fileSelector.excludePatterns = ['node_modules/**', '.git/**', 'dist/**'];
            
            fileSelector.removeExcludePattern('.git/**');
            
            expect(fileSelector.excludePatterns).not.toContain('.git/**');
            expect(fileSelector.excludePatterns).toContain('node_modules/**');
        });
    });

    describe('パフォーマンス・UI応答性', () => {
        test('フォルダ選択の応答時間（200ms以内）', async () => {
            electronAPI.selectFolder.mockResolvedValue({
                success: true,
                folderPath: '/test/folder'
            });
            
            const startTime = performance.now();
            await fileSelector.selectFolder();
            const endTime = performance.now();
            
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(200);
        });

        test('拡張子フィルタ更新の応答時間（100ms以内）', async () => {
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: ['/test/file1.html']
            });
            
            fileSelector.selectedFolder = '/test/folder';
            
            const startTime = performance.now();
            await fileSelector.updateExtensions(['.html', '.css']);
            const endTime = performance.now();
            
            const responseTime = endTime - startTime;
            expect(responseTime).toBeLessThan(100);
        });

        test('大量ファイル処理での安定性', async () => {
            const largeFileList = Array.from({ length: 10000 }, (_, i) => `/test/file${i}.html`);
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: largeFileList
            });
            
            fileSelector.selectedFolder = '/test/folder';
            
            const startTime = performance.now();
            const result = await fileSelector.searchFiles();
            const endTime = performance.now();
            
            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
        });
    });

    describe('イベント通知システム', () => {
        test('フォルダ選択イベントが発火される', async () => {
            const eventSpy = jest.fn();
            fileSelector.on('folderSelected', eventSpy);
            
            electronAPI.selectFolder.mockResolvedValue({
                success: true,
                folderPath: '/test/folder'
            });
            
            await fileSelector.selectFolder();
            
            expect(eventSpy).toHaveBeenCalledWith({
                folderPath: '/test/folder',
                timestamp: expect.any(Number)
            });
        });

        test('ファイル検索完了イベントが発火される', async () => {
            const eventSpy = jest.fn();
            fileSelector.on('filesFound', eventSpy);
            
            const mockFiles = ['/test/file1.html', '/test/file2.css'];
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: mockFiles
            });
            
            fileSelector.selectedFolder = '/test/folder';
            await fileSelector.searchFiles();
            
            expect(eventSpy).toHaveBeenCalledWith({
                files: mockFiles,
                count: 2,
                timestamp: expect.any(Number)
            });
        });

        test('エラーイベントが適切に発火される', async () => {
            const errorSpy = jest.fn();
            fileSelector.on('error', errorSpy);
            
            electronAPI.findFiles.mockRejectedValue(new Error('Test error'));
            
            fileSelector.selectedFolder = '/test/folder';
            await fileSelector.searchFiles();
            
            expect(errorSpy).toHaveBeenCalledWith({
                error: expect.any(Error),
                operation: 'searchFiles',
                timestamp: expect.any(Number)
            });
        });
    });

    describe('メモリ効率性', () => {
        test('大量ファイルリストでのメモリ使用量', async () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 大量のファイルリストを処理
            const hugeFileList = Array.from({ length: 50000 }, (_, i) => 
                `/very/long/path/to/test/file${i}.with.very.long.extension.html`
            );
            
            electronAPI.findFiles.mockResolvedValue({
                success: true,
                files: hugeFileList
            });
            
            fileSelector.selectedFolder = '/test/folder';
            await fileSelector.searchFiles();
            
            const afterMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = afterMemory - initialMemory;
            
            // メモリ増加が合理的な範囲内
            expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB以内
        });

        test('コンポーネント破棄時のメモリクリーンアップ', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // イベントリスナーとデータを大量設定
            for (let i = 0; i < 1000; i++) {
                fileSelector.on(`test${i}`, () => {});
            }
            
            fileSelector.foundFiles = Array.from({ length: 10000 }, (_, i) => `/test${i}.html`);
            
            fileSelector.destroy();
            
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
        });
    });
});

console.log('✅ FileSelector ユニットテスト読み込み完了');