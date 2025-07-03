/**
 * @fileoverview ドラッグ&ドロップハンドラークラス
 * 
 * フォルダおよび設定ファイルのドラッグ&ドロップ機能を提供
 * セキュリティを考慮したファイル検証も実装
 */

class DragDropHandler {
    constructor(uiController) {
        this.uiController = uiController;
        this.dropZones = new Map();
        this.isDragging = false;
        this.dragCounter = 0;
        
        // デバッグ用ログ
        console.log('[DragDropHandler] 初期化開始');
        
        this.initialize();
    }
    
    /**
     * ドラッグ&ドロップハンドラーの初期化
     */
    initialize() {
        // グローバルドラッグイベントを設定
        this.setupGlobalDragEvents();
        
        // 基本ドロップゾーンを登録
        this.registerDefaultDropZones();
        
        console.log('[DragDropHandler] 初期化完了');
    }
    
    /**
     * グローバルドラッグイベントを設定
     */
    setupGlobalDragEvents() {
        // ドラッグエンター
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            this.dragCounter++;
            
            if (this.dragCounter === 1) {
                this.isDragging = true;
                this.showDropOverlay();
            }
        });
        
        // ドラッグリーブ
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.dragCounter--;
            
            if (this.dragCounter === 0) {
                this.isDragging = false;
                this.hideDropOverlay();
            }
        });
        
        // ドラッグオーバー
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        // ドロップ
        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.dragCounter = 0;
            this.isDragging = false;
            this.hideDropOverlay();
            
            this.handleGlobalDrop(e);
        });
    }
    
    /**
     * デフォルトドロップゾーンを登録
     */
    registerDefaultDropZones() {
        // フォルダ入力フィールド
        const folderInput = document.getElementById('target-folder');
        if (folderInput) {
            this.registerDropZone(folderInput.parentElement, 'folder', {
                handler: (files) => this.handleFolderDrop(files),
                highlight: true
            });
        }
        
        // 設定ファイル読み込みエリア
        const configSection = document.querySelector('.config-section');
        if (configSection) {
            this.registerDropZone(configSection, 'config', {
                handler: (files) => this.handleConfigDrop(files),
                highlight: true
            });
        }
        
        // メイン作業エリア
        const mainContainer = document.querySelector('.container');
        if (mainContainer) {
            this.registerDropZone(mainContainer, 'general', {
                handler: (files) => this.handleGeneralDrop(files),
                highlight: false
            });
        }
    }
    
    /**
     * ドロップゾーンを登録
     * @param {Element} element - ドロップゾーン要素
     * @param {string} type - ドロップゾーンタイプ
     * @param {Object} options - オプション
     */
    registerDropZone(element, type, options = {}) {
        if (!element) return;
        
        const config = {
            type,
            handler: options.handler || (() => {}),
            highlight: options.highlight !== false,
            accept: options.accept || ['folder', 'json'],
            ...options
        };
        
        this.dropZones.set(element, config);
        
        // 要素固有のイベントリスナー
        element.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (config.highlight) {
                element.classList.add('drag-over');
            }
        });
        
        element.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 子要素への移動は無視
            if (!element.contains(e.relatedTarget)) {
                element.classList.remove('drag-over');
            }
        });
        
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'copy';
        });
        
        element.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            element.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                config.handler(files);
            }
        });
        
        console.log('[DragDropHandler] ドロップゾーン登録:', type, element);
    }
    
    /**
     * ドロップオーバーレイを表示
     */
    showDropOverlay() {
        let overlay = document.getElementById('drop-overlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'drop-overlay';
            overlay.className = 'drop-overlay';
            overlay.innerHTML = `
                <div class="drop-message">
                    <div class="drop-icon">📁</div>
                    <div class="drop-text">
                        <div class="drop-title">ファイルをドロップしてください</div>
                        <div class="drop-subtitle">
                            フォルダまたはJSON設定ファイルが利用できます
                        </div>
                    </div>
                </div>
            `;
            
            // スタイルを追加
            const style = document.createElement('style');
            style.textContent = `
                .drop-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(74, 144, 226, 0.1);
                    border: 3px dashed var(--accent-primary);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    pointer-events: none;
                }
                
                .drop-message {
                    text-align: center;
                    color: var(--text-primary);
                }
                
                .drop-icon {
                    font-size: 64px;
                    margin-bottom: 16px;
                }
                
                .drop-title {
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 8px;
                }
                
                .drop-subtitle {
                    font-size: 16px;
                    color: var(--text-secondary);
                }
            `;
            
            if (!document.getElementById('drop-overlay-style')) {
                style.id = 'drop-overlay-style';
                document.head.appendChild(style);
            }
            
            document.body.appendChild(overlay);
        }
        
        overlay.classList.add('fade-in');
    }
    
    /**
     * ドロップオーバーレイを非表示
     */
    hideDropOverlay() {
        const overlay = document.getElementById('drop-overlay');
        if (overlay) {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }
    }
    
    /**
     * グローバルドロップを処理
     * @param {DragEvent} event - ドロップイベント
     */
    handleGlobalDrop(event) {
        const files = Array.from(event.dataTransfer.files);
        if (files.length === 0) return;
        
        console.log('[DragDropHandler] グローバルドロップ:', files);
        
        // ファイルタイプを自動判定して処理
        this.handleGeneralDrop(files);
    }
    
    /**
     * フォルダドロップを処理
     * @param {Array<File>} files - ドロップされたファイル
     */
    async handleFolderDrop(files) {
        console.log('[DragDropHandler] フォルダドロップ:', files);
        
        // 最初のファイルのパスを取得してフォルダパスとして使用
        if (files.length > 0) {
            try {
                // Electron APIを使用してファイルパスを取得
                if (window.electronAPI && window.electronAPI.getFilePath) {
                    const filePath = await window.electronAPI.getFilePath(files[0]);
                    let folderPath;
                    
                    // ディレクトリかファイルかを判定
                    const stats = await window.electronAPI.getFileStats(filePath);
                    if (stats.isDirectory()) {
                        folderPath = filePath;
                    } else {
                        // ファイルの場合は親ディレクトリを使用
                        folderPath = await window.electronAPI.getDirectoryPath(filePath);
                    }
                    
                    // UI に反映
                    const folderInput = document.getElementById('target-folder');
                    if (folderInput) {
                        folderInput.value = folderPath;
                        
                        // プレビューを更新
                        if (this.uiController && this.uiController.updateFilePreview) {
                            this.uiController.updateFilePreview();
                        }
                    }
                    
                    this.showNotification('フォルダを設定しました', 'success');
                } else {
                    throw new Error('Electron API が利用できません');
                }
            } catch (error) {
                console.error('[DragDropHandler] フォルダドロップエラー:', error);
                this.showNotification('フォルダの設定に失敗しました', 'error');
            }
        }
    }
    
    /**
     * 設定ファイルドロップを処理
     * @param {Array<File>} files - ドロップされたファイル
     */
    async handleConfigDrop(files) {
        console.log('[DragDropHandler] 設定ファイルドロップ:', files);
        
        // JSON ファイルのみを処理
        const jsonFiles = files.filter(file => file.name.endsWith('.json'));
        
        if (jsonFiles.length === 0) {
            this.showNotification('JSON ファイルをドロップしてください', 'warning');
            return;
        }
        
        const file = jsonFiles[0];
        
        try {
            // ファイル内容を読み込み
            const content = await this.readFileContent(file);
            const config = JSON.parse(content);
            
            // 設定を検証
            if (this.validateConfig(config)) {
                // UI に設定を適用
                if (this.uiController && this.uiController.loadConfigFromObject) {
                    await this.uiController.loadConfigFromObject(config);
                    this.showNotification(`設定ファイル「${file.name}」を読み込みました`, 'success');
                } else {
                    throw new Error('UI Controller が利用できません');
                }
            } else {
                throw new Error('無効な設定ファイル形式です');
            }
        } catch (error) {
            console.error('[DragDropHandler] 設定ファイル読み込みエラー:', error);
            this.showNotification('設定ファイルの読み込みに失敗しました', 'error');
        }
    }
    
    /**
     * 汎用ドロップを処理
     * @param {Array<File>} files - ドロップされたファイル
     */
    handleGeneralDrop(files) {
        console.log('[DragDropHandler] 汎用ドロップ:', files);
        
        // ファイルタイプ別に振り分け
        const jsonFiles = files.filter(file => file.name.endsWith('.json'));
        const otherFiles = files.filter(file => !file.name.endsWith('.json'));
        
        // JSON ファイルがあれば設定として読み込み
        if (jsonFiles.length > 0) {
            this.handleConfigDrop(jsonFiles);
        }
        
        // その他のファイルがあればフォルダとして処理
        if (otherFiles.length > 0) {
            this.handleFolderDrop(otherFiles);
        }
    }
    
    /**
     * ファイル内容を読み込み
     * @param {File} file - ファイル
     * @returns {Promise<string>} ファイル内容
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = (e) => {
                reject(new Error('ファイルの読み込みに失敗しました'));
            };
            
            reader.readAsText(file, 'utf-8');
        });
    }
    
    /**
     * 設定ファイルを検証
     * @param {Object} config - 設定オブジェクト
     * @returns {boolean} 有効な設定か
     */
    validateConfig(config) {
        try {
            // 基本構造をチェック
            if (!config || typeof config !== 'object') {
                return false;
            }
            
            // replacements 配列の存在をチェック
            if (!Array.isArray(config.replacements)) {
                return false;
            }
            
            // 各ルールの構造をチェック
            for (const rule of config.replacements) {
                if (!rule || typeof rule !== 'object') {
                    return false;
                }
                
                if (typeof rule.from !== 'string' || typeof rule.to !== 'string') {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            console.error('[DragDropHandler] 設定検証エラー:', error);
            return false;
        }
    }
    
    /**
     * 通知を表示
     * @param {string} message - メッセージ
     * @param {string} type - 通知タイプ ('success', 'error', 'warning', 'info')
     */
    showNotification(message, type = 'info') {
        // 既存の通知があれば削除
        const existingNotification = document.querySelector('.drop-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        // 通知要素を作成
        const notification = document.createElement('div');
        notification.className = `drop-notification notification-${type} fade-in`;
        notification.textContent = message;
        
        // スタイルを追加（一度だけ）
        if (!document.getElementById('drop-notification-style')) {
            const style = document.createElement('style');
            style.id = 'drop-notification-style';
            style.textContent = `
                .drop-notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 12px 20px;
                    border-radius: 6px;
                    color: white;
                    font-weight: bold;
                    z-index: 10000;
                    box-shadow: var(--shadow-lg);
                    max-width: 400px;
                }
                
                .notification-success {
                    background-color: var(--success);
                }
                
                .notification-error {
                    background-color: var(--error);
                }
                
                .notification-warning {
                    background-color: var(--warning);
                }
                
                .notification-info {
                    background-color: var(--info);
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        // 3秒後に自動で消去
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }
    
    /**
     * ドロップゾーンを削除
     * @param {Element} element - ドロップゾーン要素
     */
    unregisterDropZone(element) {
        this.dropZones.delete(element);
        element.classList.remove('drag-over');
    }
    
    /**
     * すべてのドロップゾーンをクリア
     */
    clearDropZones() {
        this.dropZones.forEach((config, element) => {
            element.classList.remove('drag-over');
        });
        this.dropZones.clear();
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        // ドロップゾーンをクリア
        this.clearDropZones();
        
        // オーバーレイを削除
        const overlay = document.getElementById('drop-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // スタイルを削除
        const overlayStyle = document.getElementById('drop-overlay-style');
        if (overlayStyle) {
            overlayStyle.remove();
        }
        
        const notificationStyle = document.getElementById('drop-notification-style');
        if (notificationStyle) {
            notificationStyle.remove();
        }
        
        this.isDragging = false;
        this.dragCounter = 0;
        
        console.log('[DragDropHandler] クリーンアップ完了');
    }
}

// グローバルに公開
window.DragDropHandler = DragDropHandler;