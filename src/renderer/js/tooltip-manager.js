/**
 * @fileoverview ツールチップ管理クラス
 * 
 * ホバー時のツールチップ表示機能を提供
 * アクセシビリティに配慮した実装
 */

class TooltipManager {
    constructor() {
        this.tooltipElement = null;
        this.hideTimeout = null;
        this.showDelay = 800; // 表示遅延（ms）
        this.hideDelay = 200; // 非表示遅延（ms）
        this.currentTarget = null;
        
        // デバッグ用ログ
        console.log('[TooltipManager] 初期化開始');
        
        this.initialize();
    }
    
    /**
     * ツールチップマネージャーの初期化
     */
    initialize() {
        // ツールチップ要素を作成
        this.createTooltipElement();
        
        // イベントリスナーを設定
        this.setupEventListeners();
        
        console.log('[TooltipManager] 初期化完了');
    }
    
    /**
     * ツールチップ要素を作成
     */
    createTooltipElement() {
        this.tooltipElement = document.createElement('div');
        this.tooltipElement.className = 'tooltip';
        this.tooltipElement.setAttribute('role', 'tooltip');
        this.tooltipElement.style.cssText = `
            position: absolute;
            z-index: 10000;
            max-width: 300px;
            padding: 8px 12px;
            font-size: 14px;
            line-height: 1.4;
            border-radius: 6px;
            pointer-events: none;
            white-space: pre-wrap;
            word-wrap: break-word;
        `;
        
        document.body.appendChild(this.tooltipElement);
    }
    
    /**
     * イベントリスナーを設定
     */
    setupEventListeners() {
        // マウスオーバー・アウトの監視
        document.addEventListener('mouseover', (e) => {
            this.handleMouseOver(e);
        });
        
        document.addEventListener('mouseout', (e) => {
            this.handleMouseOut(e);
        });
        
        // スクロール時にツールチップを隠す
        document.addEventListener('scroll', () => {
            this.hide();
        }, true);
        
        // ウィンドウリサイズ時にツールチップを隠す
        window.addEventListener('resize', () => {
            this.hide();
        });
    }
    
    /**
     * マウスオーバーイベントを処理
     * @param {MouseEvent} event - マウスイベント
     */
    handleMouseOver(event) {
        const target = this.findTooltipTarget(event.target);
        
        if (target && target !== this.currentTarget) {
            this.currentTarget = target;
            
            // 既存のタイマーをクリア
            if (this.hideTimeout) {
                clearTimeout(this.hideTimeout);
                this.hideTimeout = null;
            }
            
            // 遅延表示
            setTimeout(() => {
                if (this.currentTarget === target) {
                    this.showForElement(target);
                }
            }, this.showDelay);
        }
    }
    
    /**
     * マウスアウトイベントを処理
     * @param {MouseEvent} event - マウスイベント
     */
    handleMouseOut(event) {
        const target = this.findTooltipTarget(event.target);
        
        if (target === this.currentTarget) {
            this.currentTarget = null;
            
            // 遅延して隠す
            this.hideTimeout = setTimeout(() => {
                this.hide();
            }, this.hideDelay);
        }
    }
    
    /**
     * ツールチップを表示する要素を検索
     * @param {Element} element - 開始要素
     * @returns {Element|null} ツールチップを持つ要素
     */
    findTooltipTarget(element) {
        let current = element;
        
        while (current && current !== document.body) {
            // data-tooltip属性を持つ要素
            if (current.hasAttribute('data-tooltip')) {
                return current;
            }
            
            // title属性を持つ要素（ただしinput要素以外）
            if (current.hasAttribute('title') && 
                current.tagName !== 'INPUT' && 
                current.tagName !== 'TEXTAREA') {
                return current;
            }
            
            // aria-label属性を持つbutton要素
            if (current.tagName === 'BUTTON' && current.hasAttribute('aria-label')) {
                return current;
            }
            
            current = current.parentElement;
        }
        
        return null;
    }
    
    /**
     * 指定要素のツールチップを表示
     * @param {Element} element - 対象要素
     */
    showForElement(element) {
        const text = this.getTooltipText(element);
        if (!text) return;
        
        const position = this.getTooltipPosition(element);
        if (!position) return;
        
        this.show(text, position.x, position.y, position.placement);
    }
    
    /**
     * ツールチップテキストを取得
     * @param {Element} element - 対象要素
     * @returns {string} ツールチップテキスト
     */
    getTooltipText(element) {
        // data-tooltip属性を優先
        if (element.hasAttribute('data-tooltip')) {
            return element.getAttribute('data-tooltip');
        }
        
        // title属性
        if (element.hasAttribute('title')) {
            const title = element.getAttribute('title');
            // title属性を一時的に削除してブラウザのデフォルトツールチップを無効化
            element.setAttribute('data-original-title', title);
            element.removeAttribute('title');
            return title;
        }
        
        // aria-label属性
        if (element.hasAttribute('aria-label')) {
            return element.getAttribute('aria-label');
        }
        
        return '';
    }
    
    /**
     * ツールチップの表示位置を計算
     * @param {Element} element - 対象要素
     * @returns {Object} 位置情報
     */
    getTooltipPosition(element) {
        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        
        // 要素の中央を基準点とする
        const centerX = rect.left + rect.width / 2 + scrollX;
        const centerY = rect.top + rect.height / 2 + scrollY;
        
        // ツールチップの仮サイズ（実際のサイズを計算するため一時表示）
        this.tooltipElement.style.visibility = 'hidden';
        this.tooltipElement.style.display = 'block';
        this.tooltipElement.style.left = '0px';
        this.tooltipElement.style.top = '0px';
        
        const tooltipRect = this.tooltipElement.getBoundingClientRect();
        this.tooltipElement.style.display = 'none';
        this.tooltipElement.style.visibility = 'visible';
        
        // 配置方向を決定
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 10;
        
        let x, y, placement;
        
        // 上下どちらに配置するか決定
        const spaceAbove = rect.top;
        const spaceBelow = viewportHeight - rect.bottom;
        
        if (spaceBelow >= tooltipRect.height + margin || spaceBelow >= spaceAbove) {
            // 下に配置
            y = rect.bottom + scrollY + margin;
            placement = 'bottom';
        } else {
            // 上に配置
            y = rect.top + scrollY - tooltipRect.height - margin;
            placement = 'top';
        }
        
        // 左右位置を調整
        x = centerX - tooltipRect.width / 2;
        
        // 画面外にはみ出る場合の調整
        if (x < margin) {
            x = margin;
        } else if (x + tooltipRect.width > viewportWidth - margin) {
            x = viewportWidth - tooltipRect.width - margin;
        }
        
        return { x, y, placement };
    }
    
    /**
     * ツールチップを表示
     * @param {string} text - 表示テキスト
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {string} placement - 配置方向
     */
    show(text, x, y, placement = 'bottom') {
        if (!text || !this.tooltipElement) return;
        
        // テキストを設定
        this.tooltipElement.textContent = text;
        
        // 位置を設定
        this.tooltipElement.style.left = `${x}px`;
        this.tooltipElement.style.top = `${y}px`;
        
        // 配置クラスを設定
        this.tooltipElement.className = `tooltip tooltip-${placement}`;
        
        // 表示
        this.tooltipElement.style.display = 'block';
        
        // アニメーション
        requestAnimationFrame(() => {
            this.tooltipElement.classList.add('show');
        });
        
        console.log('[TooltipManager] ツールチップ表示:', text);
    }
    
    /**
     * ツールチップを隠す
     */
    hide() {
        if (!this.tooltipElement) return;
        
        this.tooltipElement.classList.remove('show');
        
        setTimeout(() => {
            if (this.tooltipElement) {
                this.tooltipElement.style.display = 'none';
            }
        }, 200);
        
        // title属性を復元
        if (this.currentTarget && this.currentTarget.hasAttribute('data-original-title')) {
            const originalTitle = this.currentTarget.getAttribute('data-original-title');
            this.currentTarget.setAttribute('title', originalTitle);
            this.currentTarget.removeAttribute('data-original-title');
        }
        
        this.currentTarget = null;
        
        console.log('[TooltipManager] ツールチップ非表示');
    }
    
    /**
     * ツールチップを手動で表示
     * @param {Element} element - 対象要素
     * @param {string} text - 表示テキスト
     * @param {string} placement - 配置方向
     */
    showManual(element, text, placement = 'bottom') {
        const position = this.getTooltipPosition(element);
        if (!position) return;
        
        this.show(text, position.x, position.y, placement);
    }
    
    /**
     * 要素にツールチップを設定
     * @param {Element} element - 対象要素
     * @param {string} text - ツールチップテキスト
     */
    setTooltip(element, text) {
        if (!element) return;
        
        element.setAttribute('data-tooltip', text);
        
        // アクセシビリティ用の属性も設定
        if (!element.hasAttribute('aria-describedby')) {
            element.setAttribute('aria-describedby', 'tooltip');
        }
    }
    
    /**
     * 要素からツールチップを削除
     * @param {Element} element - 対象要素
     */
    removeTooltip(element) {
        if (!element) return;
        
        element.removeAttribute('data-tooltip');
        element.removeAttribute('data-original-title');
        
        if (this.currentTarget === element) {
            this.hide();
        }
    }
    
    /**
     * 表示遅延時間を設定
     * @param {number} delay - 遅延時間（ms）
     */
    setShowDelay(delay) {
        this.showDelay = delay;
    }
    
    /**
     * 非表示遅延時間を設定
     * @param {number} delay - 遅延時間（ms）
     */
    setHideDelay(delay) {
        this.hideDelay = delay;
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        // タイマーをクリア
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        // ツールチップ要素を削除
        if (this.tooltipElement) {
            this.tooltipElement.remove();
            this.tooltipElement = null;
        }
        
        // title属性を復元
        const elementsWithOriginalTitle = document.querySelectorAll('[data-original-title]');
        elementsWithOriginalTitle.forEach(element => {
            const originalTitle = element.getAttribute('data-original-title');
            element.setAttribute('title', originalTitle);
            element.removeAttribute('data-original-title');
        });
        
        this.currentTarget = null;
        
        console.log('[TooltipManager] クリーンアップ完了');
    }
}

// グローバルに公開
window.TooltipManager = TooltipManager;