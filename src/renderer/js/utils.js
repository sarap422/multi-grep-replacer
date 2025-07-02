/**
 * 共通ユーティリティ関数
 * UI応答性・パフォーマンス・操作性向上のためのヘルパー関数
 */

/**
 * DOM操作ヘルパー
 */
class DOMUtils {
    /**
     * 要素の安全な取得
     * @param {string} selector セレクター
     * @param {Element} context 検索コンテキスト
     * @returns {Element|null} 要素
     */
    static getElement(selector, context = document) {
        try {
            return context.querySelector(selector);
        } catch (error) {
            console.warn(`Invalid selector: ${selector}`, error);
            return null;
        }
    }

    /**
     * 複数要素の安全な取得
     * @param {string} selector セレクター
     * @param {Element} context 検索コンテキスト
     * @returns {NodeList} 要素リスト
     */
    static getElements(selector, context = document) {
        try {
            return context.querySelectorAll(selector);
        } catch (error) {
            console.warn(`Invalid selector: ${selector}`, error);
            return [];
        }
    }

    /**
     * 要素作成ヘルパー
     * @param {string} tagName タグ名
     * @param {Object} attributes 属性オブジェクト
     * @param {string} textContent テキスト内容
     * @returns {Element} 作成された要素
     */
    static createElement(tagName, attributes = {}, textContent = '') {
        const element = document.createElement(tagName);
        
        Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else {
                element.setAttribute(key, value);
            }
        });

        if (textContent) {
            element.textContent = textContent;
        }

        return element;
    }

    /**
     * 要素の表示/非表示切り替え
     * @param {Element} element 対象要素
     * @param {boolean} visible 表示フラグ
     * @param {string} displayType 表示タイプ
     */
    static setVisible(element, visible, displayType = 'block') {
        if (!element) return;
        element.style.display = visible ? displayType : 'none';
    }

    /**
     * クラスの安全な追加/削除
     * @param {Element} element 対象要素
     * @param {string} className クラス名
     * @param {boolean} add 追加フラグ
     */
    static toggleClass(element, className, add) {
        if (!element || !className) return;
        
        if (add) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
}

/**
 * パフォーマンス最適化ユーティリティ
 */
class PerformanceUtils {
    /**
     * デバウンス関数（UI応答性向上）
     * @param {Function} func 実行する関数
     * @param {number} delay 遅延時間（ミリ秒）
     * @returns {Function} デバウンスされた関数
     */
    static debounce(func, delay = 300) {
        let timeoutId;
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    }

    /**
     * スロットル関数（イベント制限）
     * @param {Function} func 実行する関数
     * @param {number} limit 制限時間（ミリ秒）
     * @returns {Function} スロットルされた関数
     */
    static throttle(func, limit = 100) {
        let inThrottle;
        return function (...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * パフォーマンス測定
     * @param {string} label 測定ラベル
     * @param {Function} func 測定する関数
     * @returns {Promise<any>} 関数の結果
     */
    static async measurePerformance(label, func) {
        const startTime = performance.now();
        try {
            const result = await func();
            const endTime = performance.now();
            const duration = endTime - startTime;
            
            console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
            
            // UI応答性チェック（100ms目標）
            if (duration > 100) {
                console.warn(`⚠️ UI応答性警告: ${label} - ${duration.toFixed(2)}ms (目標: 100ms以内)`);
            }
            
            return result;
        } catch (error) {
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.error(`❌ ${label} エラー (${duration.toFixed(2)}ms):`, error);
            throw error;
        }
    }

    /**
     * 次のフレームで実行
     * @param {Function} func 実行する関数
     * @returns {Promise} フレーム完了Promise
     */
    static nextFrame(func) {
        return new Promise(resolve => {
            requestAnimationFrame(() => {
                if (func) func();
                resolve();
            });
        });
    }
}

/**
 * バリデーションユーティリティ
 */
class ValidationUtils {
    /**
     * 文字列の空チェック
     * @param {string} value 値
     * @returns {boolean} 空でないかどうか
     */
    static isNotEmpty(value) {
        return typeof value === 'string' && value.trim().length > 0;
    }

    /**
     * ファイルパスの妥当性チェック
     * @param {string} path ファイルパス
     * @returns {boolean} 妥当かどうか
     */
    static isValidPath(path) {
        if (!this.isNotEmpty(path)) return false;
        
        // 危険な文字列をチェック
        const dangerousPatterns = [
            /\.\./,           // 親ディレクトリ参照
            /[<>:"|?*]/,      // Windows不正文字
            /^\/+$/,          // ルートディレクトリのみ
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(path));
    }

    /**
     * ファイル拡張子の妥当性チェック
     * @param {string} extension 拡張子
     * @returns {boolean} 妥当かどうか
     */
    static isValidExtension(extension) {
        if (!extension) return true; // 空は許可（全ファイル対象）
        
        // 拡張子形式のチェック
        const extensionPattern = /^\.[a-zA-Z0-9]+$/;
        return extensionPattern.test(extension.trim());
    }

    /**
     * 置換ルールの妥当性チェック
     * @param {Object} rule 置換ルール
     * @returns {Object} バリデーション結果
     */
    static validateReplacementRule(rule) {
        const errors = [];
        
        if (!rule || typeof rule !== 'object') {
            errors.push('ルールオブジェクトが無効です');
            return { isValid: false, errors };
        }

        if (!this.isNotEmpty(rule.from)) {
            errors.push('検索文字列が空です');
        }

        if (rule.from && rule.to && rule.from === rule.to) {
            errors.push('検索文字列と置換文字列が同じです');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

/**
 * イベントユーティリティ
 */
class EventUtils {
    /**
     * 安全なイベントリスナー追加
     * @param {Element} element 対象要素
     * @param {string} event イベント名
     * @param {Function} handler ハンドラー関数
     * @param {Object} options オプション
     * @returns {Function} 削除関数
     */
    static addListener(element, event, handler, options = {}) {
        if (!element || !event || typeof handler !== 'function') {
            console.warn('Invalid event listener parameters');
            return () => {};
        }

        element.addEventListener(event, handler, options);
        
        // 削除関数を返す
        return () => element.removeEventListener(event, handler, options);
    }

    /**
     * イベント委譲
     * @param {Element} container コンテナ要素
     * @param {string} event イベント名
     * @param {string} selector 対象セレクター
     * @param {Function} handler ハンドラー関数
     * @returns {Function} 削除関数
     */
    static delegate(container, event, selector, handler) {
        const delegateHandler = (e) => {
            const target = e.target.closest(selector);
            if (target && container.contains(target)) {
                handler.call(target, e);
            }
        };

        return this.addListener(container, event, delegateHandler);
    }

    /**
     * カスタムイベント発火
     * @param {Element} element 対象要素
     * @param {string} eventName イベント名
     * @param {any} detail 詳細データ
     */
    static trigger(element, eventName, detail = null) {
        if (!element || !eventName) return;

        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true,
            cancelable: true
        });

        element.dispatchEvent(event);
    }
}

/**
 * アニメーションユーティリティ
 */
class AnimationUtils {
    /**
     * CSS アニメーション適用
     * @param {Element} element 対象要素
     * @param {string} animationClass アニメーションクラス
     * @param {number} duration 継続時間
     * @returns {Promise} アニメーション完了Promise
     */
    static animate(element, animationClass, duration = 300) {
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            element.classList.add(animationClass);

            const handleAnimationEnd = () => {
                element.classList.remove(animationClass);
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };

            element.addEventListener('animationend', handleAnimationEnd);
            
            // フォールバック タイマー
            setTimeout(() => {
                if (element.classList.contains(animationClass)) {
                    handleAnimationEnd();
                }
            }, duration + 100);
        });
    }

    /**
     * フェードイン
     * @param {Element} element 対象要素
     * @param {number} duration 継続時間
     * @returns {Promise} アニメーション完了Promise
     */
    static fadeIn(element, duration = 300) {
        if (!element) return Promise.resolve();

        element.style.opacity = '0';
        element.style.display = 'block';
        
        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms ease-in-out`;
            
            // 次フレームで実行（ブラウザレンダリング最適化）
            requestAnimationFrame(() => {
                element.style.opacity = '1';
                
                setTimeout(() => {
                    element.style.transition = '';
                    resolve();
                }, duration);
            });
        });
    }

    /**
     * フェードアウト
     * @param {Element} element 対象要素
     * @param {number} duration 継続時間
     * @returns {Promise} アニメーション完了Promise
     */
    static fadeOut(element, duration = 300) {
        if (!element) return Promise.resolve();

        return new Promise(resolve => {
            element.style.transition = `opacity ${duration}ms ease-in-out`;
            element.style.opacity = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
                element.style.transition = '';
                resolve();
            }, duration);
        });
    }
}

/**
 * ストレージユーティリティ
 */
class StorageUtils {
    /**
     * ローカルストレージへの安全な保存
     * @param {string} key キー
     * @param {any} value 値
     * @returns {boolean} 成功フラグ
     */
    static setItem(key, value) {
        try {
            const serialized = JSON.stringify(value);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.warn(`Storage save failed for key: ${key}`, error);
            return false;
        }
    }

    /**
     * ローカルストレージからの安全な読み込み
     * @param {string} key キー
     * @param {any} defaultValue デフォルト値
     * @returns {any} 値
     */
    static getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(`Storage read failed for key: ${key}`, error);
            return defaultValue;
        }
    }

    /**
     * ローカルストレージからの削除
     * @param {string} key キー
     * @returns {boolean} 成功フラグ
     */
    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn(`Storage remove failed for key: ${key}`, error);
            return false;
        }
    }
}

// グローバル公開
window.DOMUtils = DOMUtils;
window.PerformanceUtils = PerformanceUtils;
window.ValidationUtils = ValidationUtils;
window.EventUtils = EventUtils;
window.AnimationUtils = AnimationUtils;
window.StorageUtils = StorageUtils;

console.log('🛠️ Utils モジュール読み込み完了');