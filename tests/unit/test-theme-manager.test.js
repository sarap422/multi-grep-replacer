/**
 * ThemeManager ユニットテスト
 * テーマ管理・ダークモード機能のテスト
 */

const { JSDOM } = require('jsdom');

// DOM環境のシミュレート
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Test</title>
    <link id="theme-stylesheet" rel="stylesheet" href="css/themes.css">
</head>
<body data-theme="light">
    <div class="app-container">
        <header class="header">
            <button id="theme-toggle" class="theme-toggle" title="Toggle Theme">
                <span class="theme-icon">🌙</span>
            </button>
        </header>
        <main class="main-content">
            <div class="card">Sample content</div>
        </main>
    </div>
    
    <div id="theme-settings" class="settings-panel">
        <h3>Theme Settings</h3>
        <div class="theme-options">
            <label>
                <input type="radio" name="theme" value="light" checked>
                Light Mode
            </label>
            <label>
                <input type="radio" name="theme" value="dark">
                Dark Mode
            </label>
            <label>
                <input type="radio" name="theme" value="auto">
                Auto (System)
            </label>
        </div>
        <div class="theme-customization">
            <div class="color-picker">
                <label>Accent Color:</label>
                <input type="color" id="accent-color" value="#007acc">
            </div>
            <div class="font-size-control">
                <label>Font Size:</label>
                <input type="range" id="font-size" min="12" max="18" value="14">
                <span id="font-size-value">14px</span>
            </div>
        </div>
    </div>
</body>
</html>
`, { url: 'file:///test.html' });

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// matchMedia モック
global.window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: query.includes('dark'),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
}));

// localStorage モック
const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = localStorageMock;

// CSS カスタムプロパティ操作モック
global.getComputedStyle = jest.fn().mockReturnValue({
    getPropertyValue: jest.fn().mockReturnValue('#007acc')
});

// テスト対象クラス
const ThemeManager = require('../../src/renderer/js/theme-manager');

describe('ThemeManager ユニットテスト', () => {
    let themeManager;
    let systemThemeQuery;

    beforeEach(() => {
        // DOM要素のリセット
        document.body.setAttribute('data-theme', 'light');
        document.getElementById('theme-toggle').innerHTML = '<span class="theme-icon">🌙</span>';
        document.querySelector('input[value="light"]').checked = true;
        document.querySelector('input[value="dark"]').checked = false;
        document.querySelector('input[value="auto"]').checked = false;
        
        // localStorage モックのリセット
        Object.keys(localStorageMock).forEach(key => {
            if (typeof localStorageMock[key] === 'function') {
                localStorageMock[key].mockClear();
            }
        });
        
        // システムテーマクエリモック
        systemThemeQuery = {
            matches: false,
            addEventListener: jest.fn(),
            removeEventListener: jest.fn()
        };
        
        window.matchMedia = jest.fn().mockReturnValue(systemThemeQuery);
        
        // ThemeManager インスタンス作成
        themeManager = new ThemeManager({
            enableTransitions: true,
            savePreferences: true,
            autoDetectSystem: true,
            transitionDuration: 100
        });
    });

    afterEach(() => {
        if (themeManager) {
            themeManager.destroy();
        }
    });

    describe('初期化・基本機能', () => {
        test('ThemeManager が正常に初期化される', () => {
            expect(themeManager).toBeDefined();
            expect(themeManager.isInitialized).toBe(true);
            expect(themeManager.currentTheme).toBe('light');
            expect(themeManager.options.enableTransitions).toBe(true);
        });

        test('DOM要素が正常に取得される', () => {
            expect(themeManager.elements.body).toBe(document.body);
            expect(themeManager.elements.toggleButton).toBe(document.getElementById('theme-toggle'));
            expect(themeManager.elements.themeInputs).toHaveLength(3);
        });

        test('初期テーマが正しく設定される', () => {
            expect(document.body.getAttribute('data-theme')).toBe('light');
            expect(themeManager.currentTheme).toBe('light');
        });

        test('保存されたテーマ設定の復元', () => {
            localStorageMock.getItem.mockReturnValue('dark');
            
            const newThemeManager = new ThemeManager();
            
            expect(newThemeManager.currentTheme).toBe('dark');
            expect(document.body.getAttribute('data-theme')).toBe('dark');
        });
    });

    describe('テーマ切り替え機能', () => {
        test('ライトからダークへの切り替え', () => {
            themeManager.setTheme('dark');
            
            expect(themeManager.currentTheme).toBe('dark');
            expect(document.body.getAttribute('data-theme')).toBe('dark');
            expect(document.querySelector('input[value="dark"]').checked).toBe(true);
            expect(localStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
        });

        test('ダークからライトへの切り替え', () => {
            themeManager.setTheme('dark');
            themeManager.setTheme('light');
            
            expect(themeManager.currentTheme).toBe('light');
            expect(document.body.getAttribute('data-theme')).toBe('light');
            expect(document.querySelector('input[value="light"]').checked).toBe(true);
        });

        test('トグルボタンでの切り替え', () => {
            const toggleButton = document.getElementById('theme-toggle');
            
            // ライト → ダーク
            toggleButton.click();
            expect(themeManager.currentTheme).toBe('dark');
            
            // ダーク → ライト
            toggleButton.click();
            expect(themeManager.currentTheme).toBe('light');
        });

        test('無効なテーマ名でのエラー処理', () => {
            expect(() => {
                themeManager.setTheme('invalid-theme');
            }).toThrow('Invalid theme');
        });

        test('テーマ切り替えイベントの発火', () => {
            const eventSpy = jest.fn();
            themeManager.on('themeChanged', eventSpy);
            
            themeManager.setTheme('dark');
            
            expect(eventSpy).toHaveBeenCalledWith({
                previousTheme: 'light',
                currentTheme: 'dark',
                timestamp: expect.any(Number)
            });
        });
    });

    describe('自動テーマ検出', () => {
        test('システムテーマの検出（ダーク）', () => {
            systemThemeQuery.matches = true;
            
            themeManager.setTheme('auto');
            
            expect(themeManager.effectiveTheme).toBe('dark');
            expect(document.body.getAttribute('data-theme')).toBe('dark');
        });

        test('システムテーマの検出（ライト）', () => {
            systemThemeQuery.matches = false;
            
            themeManager.setTheme('auto');
            
            expect(themeManager.effectiveTheme).toBe('light');
            expect(document.body.getAttribute('data-theme')).toBe('light');
        });

        test('システムテーマ変更の監視', () => {
            themeManager.setTheme('auto');
            
            // システムテーマ変更をシミュレート
            systemThemeQuery.matches = true;
            const changeHandler = systemThemeQuery.addEventListener.mock.calls
                .find(call => call[0] === 'change')[1];
            
            changeHandler({ matches: true });
            
            expect(document.body.getAttribute('data-theme')).toBe('dark');
        });

        test('autoモードでのトグル動作', () => {
            themeManager.setTheme('auto');
            systemThemeQuery.matches = false; // システムはライト
            
            // トグルでダークに切り替え
            const toggleButton = document.getElementById('theme-toggle');
            toggleButton.click();
            
            expect(themeManager.currentTheme).toBe('dark');
            expect(themeManager.effectiveTheme).toBe('dark');
        });
    });

    describe('カスタマイゼーション機能', () => {
        test('アクセントカラーの変更', () => {
            const newColor = '#ff6b35';
            const colorInput = document.getElementById('accent-color');
            
            colorInput.value = newColor;
            colorInput.dispatchEvent(new Event('change'));
            
            expect(themeManager.customizations.accentColor).toBe(newColor);
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'theme-customizations',
                expect.stringContaining(newColor)
            );
        });

        test('フォントサイズの変更', () => {
            const newSize = 16;
            const fontSizeInput = document.getElementById('font-size');
            const fontSizeValue = document.getElementById('font-size-value');
            
            fontSizeInput.value = newSize;
            fontSizeInput.dispatchEvent(new Event('input'));
            
            expect(themeManager.customizations.fontSize).toBe(newSize);
            expect(fontSizeValue.textContent).toBe('16px');
        });

        test('カスタマイゼーションの保存・復元', () => {
            const customizations = {
                accentColor: '#ff6b35',
                fontSize: 16
            };
            
            localStorageMock.getItem.mockReturnValue(JSON.stringify(customizations));
            
            themeManager.loadCustomizations();
            
            expect(themeManager.customizations.accentColor).toBe('#ff6b35');
            expect(themeManager.customizations.fontSize).toBe(16);
        });

        test('CSS カスタムプロパティの適用', () => {
            const setPropertySpy = jest.fn();
            document.documentElement.style.setProperty = setPropertySpy;
            
            themeManager.applyCustomizations({
                accentColor: '#ff6b35',
                fontSize: 16
            });
            
            expect(setPropertySpy).toHaveBeenCalledWith('--accent-color', '#ff6b35');
            expect(setPropertySpy).toHaveBeenCalledWith('--base-font-size', '16px');
        });
    });

    describe('アニメーション・トランジション', () => {
        test('テーマ切り替えトランジション', (done) => {
            themeManager.options.enableTransitions = true;
            themeManager.options.transitionDuration = 50;
            
            const initialTheme = themeManager.currentTheme;
            
            themeManager.setTheme('dark');
            
            // トランジション中はクラスが追加される
            expect(document.body.classList.contains('theme-transitioning')).toBe(true);
            
            // トランジション完了後
            setTimeout(() => {
                expect(document.body.classList.contains('theme-transitioning')).toBe(false);
                expect(themeManager.currentTheme).toBe('dark');
                done();
            }, themeManager.options.transitionDuration + 10);
        });

        test('トランジション無効時の即座切り替え', () => {
            themeManager.options.enableTransitions = false;
            
            themeManager.setTheme('dark');
            
            expect(document.body.classList.contains('theme-transitioning')).toBe(false);
            expect(themeManager.currentTheme).toBe('dark');
        });

        test('アニメーションの中断・重複防止', () => {
            themeManager.options.enableTransitions = true;
            themeManager.options.transitionDuration = 200;
            
            // 連続でテーマ切り替え
            themeManager.setTheme('dark');
            themeManager.setTheme('light');
            themeManager.setTheme('dark');
            
            // 最終的なテーマが正しく設定される
            expect(themeManager.currentTheme).toBe('dark');
        });
    });

    describe('UI応答性・パフォーマンス', () => {
        test('テーマ切り替えの応答時間（100ms以内）', () => {
            const startTime = performance.now();
            
            themeManager.setTheme('dark');
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            expect(responseTime).toBeLessThan(100);
        });

        test('大量DOM要素でのテーマ適用性能', () => {
            // 大量の要素を追加
            const container = document.createElement('div');
            for (let i = 0; i < 1000; i++) {
                const element = document.createElement('div');
                element.className = 'test-element';
                container.appendChild(element);
            }
            document.body.appendChild(container);
            
            const startTime = performance.now();
            
            themeManager.setTheme('dark');
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            expect(responseTime).toBeLessThan(200); // 200ms以内
            
            // クリーンアップ
            document.body.removeChild(container);
        });

        test('カスタマイゼーション適用の性能', () => {
            const customizations = {
                accentColor: '#ff6b35',
                fontSize: 16,
                primaryColor: '#007acc',
                backgroundColor: '#f5f5f5',
                textColor: '#333333'
            };
            
            const startTime = performance.now();
            
            themeManager.applyCustomizations(customizations);
            
            const endTime = performance.now();
            const responseTime = endTime - startTime;
            
            expect(responseTime).toBeLessThan(50);
        });
    });

    describe('イベントシステム', () => {
        test('テーマ変更イベントリスナー', () => {
            const listeners = {
                beforeChange: jest.fn(),
                afterChange: jest.fn(),
                customizationChange: jest.fn()
            };
            
            themeManager.on('beforeThemeChange', listeners.beforeChange);
            themeManager.on('afterThemeChange', listeners.afterChange);
            themeManager.on('customizationChange', listeners.customizationChange);
            
            themeManager.setTheme('dark');
            
            expect(listeners.beforeChange).toHaveBeenCalledWith({
                from: 'light',
                to: 'dark'
            });
            expect(listeners.afterChange).toHaveBeenCalledWith({
                theme: 'dark'
            });
        });

        test('イベントリスナーの削除', () => {
            const listener = jest.fn();
            
            themeManager.on('themeChanged', listener);
            themeManager.off('themeChanged', listener);
            
            themeManager.setTheme('dark');
            
            expect(listener).not.toHaveBeenCalled();
        });

        test('一度だけ実行されるイベントリスナー', () => {
            const listener = jest.fn();
            
            themeManager.once('themeChanged', listener);
            
            themeManager.setTheme('dark');
            themeManager.setTheme('light');
            
            expect(listener).toHaveBeenCalledTimes(1);
        });
    });

    describe('設定の永続化', () => {
        test('テーマ設定の保存', () => {
            themeManager.setTheme('dark');
            
            expect(localStorage.setItem).toHaveBeenCalledWith('theme-preference', 'dark');
        });

        test('カスタマイゼーションの保存', () => {
            const customizations = {
                accentColor: '#ff6b35',
                fontSize: 16
            };
            
            themeManager.saveCustomizations(customizations);
            
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'theme-customizations',
                JSON.stringify(customizations)
            );
        });

        test('設定の読み込みエラー処理', () => {
            localStorageMock.getItem.mockImplementation(() => {
                throw new Error('Storage access denied');
            });
            
            // エラーが発生してもクラッシュしない
            expect(() => {
                themeManager.loadCustomizations();
            }).not.toThrow();
            
            // デフォルト設定が使用される
            expect(themeManager.customizations.accentColor).toBeDefined();
        });

        test('無効なJSON設定の処理', () => {
            localStorageMock.getItem.mockReturnValue('invalid-json{');
            
            expect(() => {
                themeManager.loadCustomizations();
            }).not.toThrow();
            
            // デフォルト設定が使用される
            expect(themeManager.customizations).toBeDefined();
        });
    });

    describe('アクセシビリティ', () => {
        test('高コントラストモードの検出', () => {
            // 高コントラストモードをシミュレート
            window.matchMedia = jest.fn().mockImplementation(query => {
                if (query.includes('high-contrast')) {
                    return { matches: true, addEventListener: jest.fn() };
                }
                return { matches: false, addEventListener: jest.fn() };
            });
            
            themeManager.checkAccessibilityFeatures();
            
            expect(themeManager.isHighContrast).toBe(true);
            expect(document.body.classList.contains('high-contrast')).toBe(true);
        });

        test('動画削減設定の考慮', () => {
            window.matchMedia = jest.fn().mockImplementation(query => {
                if (query.includes('reduced-motion')) {
                    return { matches: true, addEventListener: jest.fn() };
                }
                return { matches: false, addEventListener: jest.fn() };
            });
            
            themeManager.checkAccessibilityFeatures();
            
            expect(themeManager.options.enableTransitions).toBe(false);
        });

        test('キーボードナビゲーション対応', () => {
            const toggleButton = document.getElementById('theme-toggle');
            
            // Enter キーでテーマ切り替え
            const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
            toggleButton.dispatchEvent(enterEvent);
            
            expect(themeManager.currentTheme).toBe('dark');
            
            // Space キーでテーマ切り替え
            const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
            toggleButton.dispatchEvent(spaceEvent);
            
            expect(themeManager.currentTheme).toBe('light');
        });
    });

    describe('メモリ効率性・クリーンアップ', () => {
        test('イベントリスナーのクリーンアップ', () => {
            const removeEventListenerSpy = jest.fn();
            systemThemeQuery.removeEventListener = removeEventListenerSpy;
            
            themeManager.destroy();
            
            expect(removeEventListenerSpy).toHaveBeenCalled();
        });

        test('DOMイベントのクリーンアップ', () => {
            const toggleButton = document.getElementById('theme-toggle');
            const originalListener = toggleButton.onclick;
            
            themeManager.destroy();
            
            // イベントリスナーが削除される
            expect(toggleButton.onclick).toBe(null);
        });

        test('メモリリーク防止', () => {
            const initialMemory = process.memoryUsage().heapUsed;
            
            // 大量のイベントリスナーを追加
            for (let i = 0; i < 1000; i++) {
                themeManager.on(`test-event-${i}`, () => {});
            }
            
            // 大量のカスタマイゼーションを適用
            for (let i = 0; i < 100; i++) {
                themeManager.applyCustomizations({
                    [`custom-property-${i}`]: `value-${i}`
                });
            }
            
            themeManager.destroy();
            
            if (global.gc) {
                global.gc();
            }
            
            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = finalMemory - initialMemory;
            
            expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB以内
        });
    });

    describe('エラーハンドリング・エッジケース', () => {
        test('DOM要素が存在しない場合の処理', () => {
            // 必要なDOM要素を削除
            document.getElementById('theme-toggle').remove();
            
            expect(() => {
                new ThemeManager();
            }).not.toThrow();
        });

        test('CSS変数が設定できない環境での処理', () => {
            document.documentElement.style.setProperty = jest.fn().mockImplementation(() => {
                throw new Error('CSS property access denied');
            });
            
            expect(() => {
                themeManager.applyCustomizations({ accentColor: '#ff6b35' });
            }).not.toThrow();
        });

        test('localStorage が使用できない環境での処理', () => {
            const originalLocalStorage = global.localStorage;
            global.localStorage = undefined;
            
            expect(() => {
                themeManager.setTheme('dark');
            }).not.toThrow();
            
            global.localStorage = originalLocalStorage;
        });

        test('matchMedia が使用できない環境での処理', () => {
            const originalMatchMedia = window.matchMedia;
            window.matchMedia = undefined;
            
            expect(() => {
                const newThemeManager = new ThemeManager({ autoDetectSystem: true });
                newThemeManager.setTheme('auto');
            }).not.toThrow();
            
            window.matchMedia = originalMatchMedia;
        });
    });
});

console.log('✅ ThemeManager ユニットテスト読み込み完了');