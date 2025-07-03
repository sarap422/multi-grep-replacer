/**
 * ProgressDisplay ユニットテスト
 * 進捗表示・結果表示コンポーネントのテスト
 */

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
    <div id="progress-modal" class="modal hidden">
        <div class="modal-content">
            <div class="progress-header">
                <h3 id="progress-title">Processing...</h3>
                <button id="cancel-btn">Cancel</button>
            </div>
            <div class="progress-body">
                <div id="progress-bar-container">
                    <div id="progress-bar" style="width: 0%"></div>
                </div>
                <div id="progress-text">0%</div>
                <div id="current-file">Ready</div>
                <div id="stats-display">
                    <span id="processed-count">0</span> / 
                    <span id="total-count">0</span> files
                </div>
                <div id="time-display">
                    <span>Elapsed: </span>
                    <span id="elapsed-time">00:00</span>
                    <span>ETA: </span>
                    <span id="eta-time">--:--</span>
                </div>
            </div>
        </div>
    </div>
    
    <div id="results-modal" class="modal hidden">
        <div class="modal-content">
            <div class="results-header">
                <h3 id="results-title">Results</h3>
                <button id="close-results-btn">Close</button>
            </div>
            <div class="results-body">
                <div id="results-summary">
                    <div class="stat-item">
                        <span class="label">Files Modified:</span>
                        <span id="modified-files-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">Total Changes:</span>
                        <span id="total-changes-count">0</span>
                    </div>
                    <div class="stat-item">
                        <span class="label">Processing Time:</span>
                        <span id="processing-time">0s</span>
                    </div>
                </div>
                <div id="results-details">
                    <ul id="file-results-list"></ul>
                </div>
                <div class="results-actions">
                    <button id="export-csv-btn">Export CSV</button>
                    <button id="export-json-btn">Export JSON</button>
                    <button id="copy-summary-btn">Copy Summary</button>
                </div>
            </div>
        </div>
    </div>
    
    <div id="notification-container"></div>
</body>
</html>
`, { url: 'file:///test.html' });

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;
global.performance = {
    now: () => Date.now()
};

// Clipboard API モック
global.navigator = {
    clipboard: {
        writeText: jest.fn().mockResolvedValue()
    }
};

// electronAPI モック
global.electronAPI = {
    saveFile: jest.fn(),
    showNotification: jest.fn(),
    onCancel: jest.fn()
};

// テスト対象クラス
const ProgressDisplay = require('../../src/renderer/js/progress-display');

describe('ProgressDisplay ユニットテスト', () => {
    let progressDisplay;
    let mockProgressData;

    beforeEach(() => {
        // DOM要素のリセット
        document.getElementById('progress-modal').classList.add('hidden');
        document.getElementById('results-modal').classList.add('hidden');
        document.getElementById('progress-bar').style.width = '0%';
        document.getElementById('progress-text').textContent = '0%';
        document.getElementById('current-file').textContent = 'Ready';
        document.getElementById('processed-count').textContent = '0';
        document.getElementById('total-count').textContent = '0';
        document.getElementById('file-results-list').innerHTML = '';
        document.getElementById('notification-container').innerHTML = '';
        
        // モックデータ
        mockProgressData = {
            current: 0,
            total: 100,
            currentFile: '',
            percentage: 0,
            startTime: Date.now(),
            estimatedTime: 0
        };
        
        // electronAPI モックのリセット
        Object.keys(electronAPI).forEach(key => {
            if (typeof electronAPI[key] === 'function') {
                electronAPI[key].mockClear();
            }
        });
        
        navigator.clipboard.writeText.mockClear();
        
        // ProgressDisplay インスタンス作成
        progressDisplay = new ProgressDisplay({
            animationDuration: 100,
            showETA: true,
            showCurrentFile: true,
            enableSounds: false // テスト中は音無効
        });
    });

    afterEach(() => {
        if (progressDisplay) {
            progressDisplay.destroy();
        }
    });

    describe('初期化・基本機能', () => {
        test('ProgressDisplay が正常に初期化される', () => {
            expect(progressDisplay).toBeDefined();
            expect(progressDisplay.isInitialized).toBe(true);
            expect(progressDisplay.options.animationDuration).toBe(100);
            expect(progressDisplay.options.showETA).toBe(true);
        });

        test('DOM要素が正常に取得される', () => {
            expect(progressDisplay.elements.progressModal).toBe(document.getElementById('progress-modal'));
            expect(progressDisplay.elements.progressBar).toBe(document.getElementById('progress-bar'));
            expect(progressDisplay.elements.resultsModal).toBe(document.getElementById('results-modal'));
        });

        test('初期状態が正しく設定される', () => {
            expect(progressDisplay.isVisible).toBe(false);
            expect(progressDisplay.currentProgress).toBe(0);
            expect(progressDisplay.isProcessing).toBe(false);
        });
    });

    describe('進捗表示機能', () => {
        test('進捗表示開始が正常に動作する', () => {
            const totalFiles = 50;
            
            progressDisplay.startProgress(totalFiles);
            
            expect(progressDisplay.isVisible).toBe(true);
            expect(progressDisplay.isProcessing).toBe(true);
            expect(progressDisplay.totalFiles).toBe(totalFiles);
            
            // DOM要素の確認
            expect(document.getElementById('progress-modal').classList.contains('hidden')).toBe(false);
            expect(document.getElementById('total-count').textContent).toBe('50');
        });

        test('進捗更新が正常に動作する', () => {
            progressDisplay.startProgress(100);
            
            progressDisplay.updateProgress(25, 100, '/test/file25.html');
            
            expect(progressDisplay.currentProgress).toBe(25);
            expect(document.getElementById('progress-text').textContent).toBe('25%');
            expect(document.getElementById('progress-bar').style.width).toBe('25%');
            expect(document.getElementById('current-file').textContent).toBe('/test/file25.html');
            expect(document.getElementById('processed-count').textContent).toBe('25');
        });

        test('進捗バーアニメーションが動作する', (done) => {
            progressDisplay.startProgress(100);
            
            progressDisplay.updateProgress(50, 100);
            
            // アニメーション完了後の確認
            setTimeout(() => {
                expect(document.getElementById('progress-bar').style.width).toBe('50%');
                done();
            }, progressDisplay.options.animationDuration + 10);
        });

        test('100%完了時の処理', () => {
            progressDisplay.startProgress(10);
            
            progressDisplay.updateProgress(10, 10, '/test/final.html');
            
            expect(progressDisplay.currentProgress).toBe(10);
            expect(document.getElementById('progress-text').textContent).toBe('100%');
            expect(document.getElementById('progress-bar').style.width).toBe('100%');
        });
    });

    describe('時間表示・ETA計算', () => {
        test('経過時間が正常に表示される', () => {
            progressDisplay.startProgress(100);
            
            // 3秒経過をシミュレート
            progressDisplay.startTime = Date.now() - 3000;
            progressDisplay.updateElapsedTime();
            
            expect(document.getElementById('elapsed-time').textContent).toBe('00:03');
        });

        test('ETA計算が正常に動作する', () => {
            progressDisplay.startProgress(100);
            
            // 10秒で25%完了をシミュレート
            progressDisplay.startTime = Date.now() - 10000;
            progressDisplay.updateProgress(25, 100);
            
            progressDisplay.updateETA();
            
            // ETA: 残り75%なので約30秒
            const etaText = document.getElementById('eta-time').textContent;
            expect(etaText).toMatch(/\d{2}:\d{2}/);
        });

        test('進捗が非常に遅い場合のETA処理', () => {
            progressDisplay.startProgress(1000);
            
            // 60秒で1%のみ完了
            progressDisplay.startTime = Date.now() - 60000;
            progressDisplay.updateProgress(10, 1000);
            
            progressDisplay.updateETA();
            
            // 極端に長い時間の場合は適切な表示
            const etaText = document.getElementById('eta-time').textContent;
            expect(etaText).not.toBe('--:--');
        });

        test('時間フォーマットが正確である', () => {
            expect(progressDisplay.formatTime(0)).toBe('00:00');
            expect(progressDisplay.formatTime(65)).toBe('01:05');
            expect(progressDisplay.formatTime(3661)).toBe('61:01'); // 1時間1分1秒
        });
    });

    describe('結果表示機能', () => {
        test('成功結果の表示が正常に動作する', () => {
            const results = {
                success: true,
                summary: {
                    totalFiles: 50,
                    modifiedFiles: 35,
                    totalChanges: 142,
                    processingTime: 12500
                },
                details: [
                    {
                        filePath: '/test/file1.html',
                        modified: true,
                        changes: 3,
                        rules: ['rule1', 'rule2']
                    },
                    {
                        filePath: '/test/file2.css',
                        modified: true,
                        changes: 7,
                        rules: ['rule1']
                    }
                ]
            };
            
            progressDisplay.showResults(results);
            
            expect(progressDisplay.isProcessing).toBe(false);
            expect(document.getElementById('results-modal').classList.contains('hidden')).toBe(false);
            expect(document.getElementById('modified-files-count').textContent).toBe('35');
            expect(document.getElementById('total-changes-count').textContent).toBe('142');
            expect(document.getElementById('processing-time').textContent).toBe('12.5s');
            
            // 詳細リストの確認
            const listItems = document.querySelectorAll('#file-results-list li');
            expect(listItems.length).toBe(2);
            expect(listItems[0].textContent).toContain('file1.html');
            expect(listItems[0].textContent).toContain('3 changes');
        });

        test('エラー結果の表示が正常に動作する', () => {
            const results = {
                success: false,
                error: 'Permission denied',
                summary: {
                    totalFiles: 10,
                    modifiedFiles: 3,
                    errorFiles: 7
                },
                errors: [
                    {
                        filePath: '/test/protected.txt',
                        error: 'EACCES: permission denied'
                    }
                ]
            };
            
            progressDisplay.showResults(results);
            
            expect(document.getElementById('results-title').textContent).toContain('Error');
            expect(document.getElementById('modified-files-count').textContent).toBe('3');
            
            // エラーファイルの表示確認
            const errorItems = document.querySelectorAll('#file-results-list .error-item');
            expect(errorItems.length).toBeGreaterThan(0);
        });

        test('空の結果での表示', () => {
            const emptyResults = {
                success: true,
                summary: {
                    totalFiles: 0,
                    modifiedFiles: 0,
                    totalChanges: 0
                },
                details: []
            };
            
            progressDisplay.showResults(emptyResults);
            
            expect(document.getElementById('modified-files-count').textContent).toBe('0');
            expect(document.getElementById('total-changes-count').textContent).toBe('0');
            expect(document.getElementById('file-results-list').innerHTML).toContain('No files processed');
        });
    });

    describe('エクスポート機能', () => {
        test('CSV エクスポートが正常に動作する', async () => {
            const results = {
                success: true,
                summary: {
                    totalFiles: 2,
                    modifiedFiles: 2,
                    totalChanges: 5
                },
                details: [
                    {
                        filePath: '/test/file1.html',
                        modified: true,
                        changes: 3,
                        rules: ['rule1', 'rule2']
                    },
                    {
                        filePath: '/test/file2.css',
                        modified: true,
                        changes: 2,
                        rules: ['rule1']
                    }
                ]
            };
            
            progressDisplay.showResults(results);
            
            electronAPI.saveFile.mockResolvedValue({
                success: true,
                filePath: '/test/export.csv'
            });
            
            await progressDisplay.exportToCSV();
            
            expect(electronAPI.saveFile).toHaveBeenCalledWith(
                expect.stringContaining('File Path,Modified,Changes,Rules'),
                'results.csv',
                'csv'
            );
        });

        test('JSON エクスポートが正常に動作する', async () => {
            const results = {
                success: true,
                summary: { totalFiles: 1, modifiedFiles: 1, totalChanges: 2 },
                details: [{ filePath: '/test/file.html', modified: true, changes: 2 }]
            };
            
            progressDisplay.showResults(results);
            
            electronAPI.saveFile.mockResolvedValue({
                success: true,
                filePath: '/test/export.json'
            });
            
            await progressDisplay.exportToJSON();
            
            expect(electronAPI.saveFile).toHaveBeenCalledWith(
                expect.stringContaining('"totalFiles":1'),
                'results.json',
                'json'
            );
        });

        test('サマリーのクリップボードコピー', async () => {
            const results = {
                success: true,
                summary: {
                    totalFiles: 10,
                    modifiedFiles: 8,
                    totalChanges: 25,
                    processingTime: 5000
                }
            };
            
            progressDisplay.showResults(results);
            
            await progressDisplay.copySummary();
            
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('Files Modified: 8')
            );
            expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
                expect.stringContaining('Total Changes: 25')
            );
        });
    });

    describe('キャンセル・中断機能', () => {
        test('処理キャンセルが正常に動作する', () => {
            const cancelSpy = jest.fn();
            progressDisplay.on('cancel', cancelSpy);
            
            progressDisplay.startProgress(100);
            progressDisplay.updateProgress(30, 100);
            
            const cancelButton = document.getElementById('cancel-btn');
            cancelButton.click();
            
            expect(cancelSpy).toHaveBeenCalled();
            expect(progressDisplay.isProcessing).toBe(false);
        });

        test('キャンセル確認ダイアログ', () => {
            global.confirm = jest.fn().mockReturnValue(true);
            
            progressDisplay.startProgress(100);
            progressDisplay.updateProgress(50, 100);
            
            const result = progressDisplay.confirmCancel();
            
            expect(global.confirm).toHaveBeenCalledWith(
                expect.stringContaining('50% completed')
            );
            expect(result).toBe(true);
            
            global.confirm.mockRestore();
        });
    });

    describe('通知システム', () => {
        test('成功通知の表示', () => {
            progressDisplay.showNotification('Operation completed successfully', 'success');
            
            const notifications = document.querySelectorAll('#notification-container .notification');
            expect(notifications.length).toBe(1);
            expect(notifications[0].classList.contains('success')).toBe(true);
            expect(notifications[0].textContent).toContain('Operation completed successfully');
        });

        test('エラー通知の表示', () => {
            progressDisplay.showNotification('Operation failed', 'error');
            
            const notifications = document.querySelectorAll('#notification-container .notification');
            expect(notifications.length).toBe(1);
            expect(notifications[0].classList.contains('error')).toBe(true);
        });

        test('通知の自動消去', (done) => {
            progressDisplay.showNotification('Test message', 'info', 100); // 100ms後に消去
            
            setTimeout(() => {
                const notifications = document.querySelectorAll('#notification-container .notification');
                expect(notifications.length).toBe(0);
                done();
            }, 150);
        });

        test('複数通知の管理', () => {
            progressDisplay.showNotification('Message 1', 'info');
            progressDisplay.showNotification('Message 2', 'warning');
            progressDisplay.showNotification('Message 3', 'error');
            
            const notifications = document.querySelectorAll('#notification-container .notification');
            expect(notifications.length).toBe(3);
            
            // 最新が上に表示される
            expect(notifications[0].textContent).toContain('Message 3');
        });
    });

    describe('UI応答性・アニメーション', () => {
        test('進捗更新の応答時間（50ms以内）', async () => {
            progressDisplay.startProgress(100);
            
            const startTime = performance.now();
            
            progressDisplay.updateProgress(50, 100, '/test/file.html');
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            expect(responseTime).toBeLessThan(50);
        });

        test('大量データでの描画パフォーマンス', () => {
            const results = {
                success: true,
                summary: {
                    totalFiles: 5000,
                    modifiedFiles: 4500,
                    totalChanges: 15000
                },
                details: Array.from({ length: 5000 }, (_, i) => ({
                    filePath: `/test/file${i}.html`,
                    modified: true,
                    changes: 3
                }))
            };
            
            const startTime = performance.now();
            
            progressDisplay.showResults(results);
            
            const endTime = performance.now();
            const renderTime = endTime - startTime;
            
            // 大量データでも500ms以内で描画
            expect(renderTime).toBeLessThan(500);
        });

        test('スムーズな進捗バーアニメーション', (done) => {
            progressDisplay.startProgress(100);
            
            let progressValues = [];
            
            // 進捗を段階的に更新
            const intervals = [10, 25, 50, 75, 100];
            let index = 0;
            
            const updateNext = () => {
                if (index < intervals.length) {
                    progressDisplay.updateProgress(intervals[index], 100);
                    progressValues.push(parseInt(document.getElementById('progress-bar').style.width));
                    index++;
                    setTimeout(updateNext, 50);
                } else {
                    // 進捗が単調増加していることを確認
                    for (let i = 1; i < progressValues.length; i++) {
                        expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i-1]);
                    }
                    done();
                }
            };
            
            updateNext();
        });
    });

    describe('エラーハンドリング・エッジケース', () => {
        test('不正な進捗値でのエラー処理', () => {
            progressDisplay.startProgress(100);
            
            // 負の値
            progressDisplay.updateProgress(-5, 100);
            expect(document.getElementById('progress-text').textContent).toBe('0%');
            
            // 100%超過
            progressDisplay.updateProgress(150, 100);
            expect(document.getElementById('progress-text').textContent).toBe('100%');
        });

        test('totalが0の場合の処理', () => {
            progressDisplay.startProgress(0);
            
            progressDisplay.updateProgress(0, 0);
            
            expect(document.getElementById('progress-text').textContent).toBe('100%');
            expect(document.getElementById('progress-bar').style.width).toBe('100%');
        });

        test('極端に長いファイルパスの表示', () => {
            const longPath = '/very/long/path/to/file/'.repeat(10) + 'filename.html';
            
            progressDisplay.startProgress(1);
            progressDisplay.updateProgress(1, 1, longPath);
            
            const currentFileElement = document.getElementById('current-file');
            const displayedPath = currentFileElement.textContent;
            
            // パスが適切に短縮されて表示される
            expect(displayedPath.length).toBeLessThan(longPath.length);
            expect(displayedPath).toContain('...');
        });

        test('結果データが undefined の場合の処理', () => {
            expect(() => {
                progressDisplay.showResults(undefined);
            }).not.toThrow();
            
            expect(document.getElementById('modified-files-count').textContent).toBe('0');
        });
    });

    describe('メモリ効率性', () => {
        test('大量結果データでのメモリ効率', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            const hugeResults = {
                success: true,
                summary: {
                    totalFiles: 50000,
                    modifiedFiles: 45000,
                    totalChanges: 150000
                },
                details: Array.from({ length: 50000 }, (_, i) => ({
                    filePath: `/project/src/components/feature${i}/SubComponent${i}.tsx`,
                    modified: true,
                    changes: Math.floor(Math.random() * 10),
                    rules: [`rule${i % 5}`]
                }))
            };
            
            progressDisplay.showResults(hugeResults);
            
            const afterMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = afterMemory - initialMemory;
            
            // メモリ増加が合理的な範囲内
            expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB以内
        });

        test('コンポーネント破棄時のメモリクリーンアップ', () => {
            progressDisplay.startProgress(100);
            progressDisplay.updateProgress(50, 100);
            
            // 大量の通知を作成
            for (let i = 0; i < 1000; i++) {
                progressDisplay.showNotification(`Test notification ${i}`, 'info');
            }
            
            const beforeDestroy = process.memoryUsage().heapUsed;
            
            progressDisplay.destroy();
            
            if (global.gc) {
                global.gc();
            }
            
            const afterDestroy = process.memoryUsage().heapUsed;
            
            // メモリが適切に解放される
            expect(afterDestroy).toBeLessThanOrEqual(beforeDestroy);
        });
    });
});

console.log('✅ ProgressDisplay ユニットテスト読み込み完了');