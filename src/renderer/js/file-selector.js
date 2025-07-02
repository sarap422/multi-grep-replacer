/**
 * ファイル選択コンポーネント - Multi Grep Replacer
 * フォルダ・ファイル選択・ドラッグ&ドロップ対応
 */

class FileSelector {
    constructor() {
        this.selectedFolder = '';
        this.allowedExtensions = [];
        this.dragCounter = 0;
        
        // コールバック関数
        this.onFolderSelected = null;
        this.onExtensionsChanged = null;
        
        // DOM要素への参照
        this.elements = {};
        
        // イベントリスナーのAbortController
        this.abortController = new AbortController();
        
        // 初期化
        this.initialize();
    }
    
    /**
     * 初期化
     */
    initialize() {
        console.log('FileSelector: Initializing...');
        
        // DOM要素のキャッシュ
        this.cacheElements();
        
        // イベントリスナーの設定
        this.setupEventListeners();
        
        // ドラッグ&ドロップの設定
        this.setupDragAndDrop();
        
        console.log('FileSelector: Initialization complete');
    }
    
    /**
     * DOM要素キャッシュ
     */
    cacheElements() {
        this.elements = {
            folderPath: document.getElementById('folderPath'),
            browseBtn: document.getElementById('browseBtn'),
            fileExtensions: document.getElementById('fileExtensions'),
            folderSection: document.querySelector('.folder-section'),
            extensionsSection: document.querySelector('.extensions-section'),
            appContainer: document.querySelector('.app-container')
        };
    }
    
    /**
     * イベントリスナー設定
     */
    setupEventListeners() {
        const signal = this.abortController.signal;
        
        // フォルダ参照ボタン
        this.elements.browseBtn?.addEventListener('click', 
            this.handleBrowseClick.bind(this), { signal });
        
        // ファイル拡張子入力
        this.elements.fileExtensions?.addEventListener('input', 
            Utils.debounce(this.handleExtensionsInput.bind(this), 200), { signal });
        
        // フォルダパス入力（手動入力対応）
        this.elements.folderPath?.addEventListener('input', 
            Utils.debounce(this.handleFolderPathInput.bind(this), 300), { signal });
        
        // キーボードアクセシビリティ
        this.elements.folderPath?.addEventListener('keydown', 
            this.handleFolderPathKeydown.bind(this), { signal });
    }
    
    /**
     * ドラッグ&ドロップ設定
     */
    setupDragAndDrop() {
        const signal = this.abortController.signal;
        
        // フォルダセクションでのドラッグ&ドロップ
        if (this.elements.folderSection) {
            this.elements.folderSection.addEventListener('dragenter', 
                this.handleDragEnter.bind(this), { signal });
            this.elements.folderSection.addEventListener('dragleave', 
                this.handleDragLeave.bind(this), { signal });
            this.elements.folderSection.addEventListener('dragover', 
                this.handleDragOver.bind(this), { signal });
            this.elements.folderSection.addEventListener('drop', 
                this.handleDrop.bind(this), { signal });
        }
        
        // アプリケーション全体でのドラッグ防止
        if (this.elements.appContainer) {
            this.elements.appContainer.addEventListener('dragover', 
                this.preventDefaultDrag.bind(this), { signal });
            this.elements.appContainer.addEventListener('drop', 
                this.preventDefaultDrag.bind(this), { signal });
        }
    }
    
    /**
     * フォルダ参照ボタンクリック処理
     */
    async handleBrowseClick() {
        try {
            // ボタンのフィードバック（即座反応）
            const button = this.elements.browseBtn;
            if (button) {
                button.classList.add('btn-bounce');
                button.disabled = true;
                button.setAttribute('aria-busy', 'true');
            }
            
            // フォルダ選択ダイアログを開く
            const selectedPath = await this.openFolderDialog();
            
            if (selectedPath) {
                await this.setSelectedFolder(selectedPath);
                
                // 成功アニメーション
                this.elements.folderSection?.classList.add('success-pulse');
                setTimeout(() => {
                    this.elements.folderSection?.classList.remove('success-pulse');
                }, 500);
            }
            
        } catch (error) {
            console.error('Folder browse failed:', error);
            this.showError('フォルダ選択に失敗しました: ' + error.message);
            
            // エラーアニメーション
            this.elements.folderSection?.classList.add('error-shake');
            setTimeout(() => {
                this.elements.folderSection?.classList.remove('error-shake');
            }, 500);
            
        } finally {
            // ボタンの状態復元
            const button = this.elements.browseBtn;
            if (button) {
                button.classList.remove('btn-bounce');
                button.disabled = false;
                button.removeAttribute('aria-busy');
            }
        }
    }
    
    /**
     * ファイル拡張子入力処理
     */
    handleExtensionsInput(event) {
        const value = event.target.value;
        
        try {
            // 拡張子のパース
            const extensions = this.parseExtensions(value);
            this.allowedExtensions = extensions;
            
            // 視覚的フィードバック
            this.updateExtensionsValidation(true);
            
            // コールバック実行
            if (this.onExtensionsChanged) {
                this.onExtensionsChanged(extensions);
            }
            
        } catch (error) {
            console.error('Extensions parsing failed:', error);
            this.updateExtensionsValidation(false, error.message);
        }
    }
    
    /**
     * フォルダパス手動入力処理
     */
    async handleFolderPathInput(event) {
        const path = event.target.value.trim();
        
        if (!path) {
            this.clearSelectedFolder();
            return;
        }
        
        try {
            // パスの存在確認
            const isValid = await this.validateFolderPath(path);
            
            if (isValid) {
                await this.setSelectedFolder(path);
                this.updateFolderValidation(true);
            } else {
                this.updateFolderValidation(false, 'フォルダが存在しません');
            }
            
        } catch (error) {
            console.error('Folder path validation failed:', error);
            this.updateFolderValidation(false, error.message);
        }
    }
    
    /**
     * フォルダパスキーダウン処理（Enterキー対応）
     */
    handleFolderPathKeydown(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.handleFolderPathInput(event);
        }
    }
    
    /**
     * ドラッグ&ドロップイベント処理
     */
    handleDragEnter(event) {
        event.preventDefault();
        this.dragCounter++;
        
        if (this.isDraggedItemFolder(event)) {
            this.elements.folderSection?.classList.add('drag-over', 'drop-zone-active');
            this.elements.folderSection?.setAttribute('aria-dropeffect', 'copy');
        }
    }
    
    handleDragLeave(event) {
        event.preventDefault();
        this.dragCounter--;
        
        if (this.dragCounter === 0) {
            this.elements.folderSection?.classList.remove('drag-over', 'drop-zone-active');
            this.elements.folderSection?.removeAttribute('aria-dropeffect');
        }
    }
    
    handleDragOver(event) {
        event.preventDefault();
        
        if (this.isDraggedItemFolder(event)) {
            event.dataTransfer.dropEffect = 'copy';
        } else {
            event.dataTransfer.dropEffect = 'none';
        }
    }
    
    async handleDrop(event) {
        event.preventDefault();
        this.dragCounter = 0;
        
        // ドラッグ状態のクリア
        this.elements.folderSection?.classList.remove('drag-over', 'drop-zone-active');
        this.elements.folderSection?.removeAttribute('aria-dropeffect');
        
        try {
            const files = Array.from(event.dataTransfer.files);
            
            if (files.length === 0) {
                throw new Error('ファイルが選択されていません');
            }
            
            // 最初のファイルのディレクトリパスを取得
            const firstFile = files[0];
            const folderPath = await this.getFileDirectory(firstFile);
            
            if (folderPath) {
                await this.setSelectedFolder(folderPath);
                
                // 成功アニメーション
                this.elements.folderSection?.classList.add('drop-success');
                setTimeout(() => {
                    this.elements.folderSection?.classList.remove('drop-success');
                }, 800);
            }
            
        } catch (error) {
            console.error('Drop handling failed:', error);
            this.showError('ドロップ処理に失敗しました: ' + error.message);
            
            // エラーアニメーション
            this.elements.folderSection?.classList.add('error-shake');
            setTimeout(() => {
                this.elements.folderSection?.classList.remove('error-shake');
            }, 500);
        }
    }
    
    /**
     * デフォルトドラッグ防止
     */
    preventDefaultDrag(event) {
        event.preventDefault();
    }
    
    /**
     * フォルダ選択ダイアログを開く
     */
    async openFolderDialog() {
        if (!window.electronAPI?.selectFolder) {
            throw new Error('フォルダ選択機能が利用できません');
        }
        
        return await window.electronAPI.selectFolder();
    }
    
    /**
     * 選択フォルダを設定
     */
    async setSelectedFolder(folderPath) {
        this.selectedFolder = folderPath;
        
        // UI更新
        if (this.elements.folderPath) {
            this.elements.folderPath.value = folderPath;
        }
        
        // バリデーション表示更新
        this.updateFolderValidation(true);
        
        // コールバック実行
        if (this.onFolderSelected) {
            this.onFolderSelected(folderPath);
        }
        
        // アクセシビリティアナウンス
        this.announceToScreenReader(`フォルダが選択されました: ${folderPath}`);
        
        console.log('Folder selected:', folderPath);
    }
    
    /**
     * 選択フォルダをクリア
     */
    clearSelectedFolder() {
        this.selectedFolder = '';
        
        if (this.elements.folderPath) {
            this.elements.folderPath.value = '';
        }
        
        this.updateFolderValidation(false);
        
        if (this.onFolderSelected) {
            this.onFolderSelected('');
        }
    }
    
    /**
     * ファイル拡張子のパース
     */
    parseExtensions(input) {
        if (!input.trim()) {
            return []; // 空の場合は全ファイル対象
        }
        
        const extensions = input
            .split(',')
            .map(ext => ext.trim())
            .filter(ext => ext.length > 0)
            .map(ext => ext.startsWith('.') ? ext : '.' + ext);
        
        // 拡張子の妥当性チェック
        const invalidExtensions = extensions.filter(ext => 
            !/^\.[\w\-]+$/.test(ext) || ext.length > 10
        );
        
        if (invalidExtensions.length > 0) {
            throw new Error(`無効な拡張子: ${invalidExtensions.join(', ')}`);
        }
        
        return extensions;
    }
    
    /**
     * フォルダパスの妥当性確認
     */
    async validateFolderPath(path) {
        if (!window.electronAPI?.checkFolderExists) {
            // Electron APIが利用できない場合は基本的なパス検証のみ
            return path.length > 0;
        }
        
        try {
            return await window.electronAPI.checkFolderExists(path);
        } catch (error) {
            console.error('Folder validation failed:', error);
            return false;
        }
    }
    
    /**
     * ドラッグされたアイテムがフォルダかチェック
     */
    isDraggedItemFolder(event) {
        const items = Array.from(event.dataTransfer.items);
        return items.some(item => 
            item.kind === 'file' && 
            (item.webkitGetAsEntry()?.isDirectory || 
             item.getAsFile()?.type === '' || // フォルダの場合はtypeが空
             item.type === '')
        );
    }
    
    /**
     * ファイルのディレクトリパスを取得
     */
    async getFileDirectory(file) {
        if (!window.electronAPI?.getFileDirectory) {
            // フォールバック: ファイルパスからディレクトリを推定
            return file.path ? file.path.replace(/[^/\\]*$/, '') : null;
        }
        
        return await window.electronAPI.getFileDirectory(file.path);
    }
    
    /**
     * フォルダバリデーション表示更新
     */
    updateFolderValidation(isValid, errorMessage = '') {
        const input = this.elements.folderPath;
        if (!input) return;
        
        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            input.removeAttribute('aria-describedby');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
            
            if (errorMessage) {
                // エラーメッセージ表示
                let errorElement = document.getElementById('folderPathError');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.id = 'folderPathError';
                    errorElement.className = 'invalid-feedback';
                    errorElement.setAttribute('role', 'alert');
                    input.parentNode?.appendChild(errorElement);
                }
                errorElement.textContent = errorMessage;
                input.setAttribute('aria-describedby', 'folderPathError');
            }
        }
    }
    
    /**
     * 拡張子バリデーション表示更新
     */
    updateExtensionsValidation(isValid, errorMessage = '') {
        const input = this.elements.fileExtensions;
        if (!input) return;
        
        if (isValid) {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            input.removeAttribute('aria-describedby');
        } else {
            input.classList.remove('is-valid');
            input.classList.add('is-invalid');
            
            if (errorMessage) {
                // エラーメッセージ表示
                let errorElement = document.getElementById('extensionsError');
                if (!errorElement) {
                    errorElement = document.createElement('div');
                    errorElement.id = 'extensionsError';
                    errorElement.className = 'invalid-feedback';
                    errorElement.setAttribute('role', 'alert');
                    input.parentNode?.appendChild(errorElement);
                }
                errorElement.textContent = errorMessage;
                input.setAttribute('aria-describedby', 'extensionsError');
            }
        }
    }
    
    /**
     * エラーメッセージ表示
     */
    showError(message) {
        console.error('FileSelector Error:', message);
        this.announceToScreenReader(message);
        
        // TODO: トースト通知の実装
    }
    
    /**
     * スクリーンリーダーへのアナウンス
     */
    announceToScreenReader(message) {
        const announcer = document.getElementById('globalAnnouncements');
        if (announcer) {
            announcer.textContent = message;
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }
    
    /**
     * 現在の状態を取得
     */
    getState() {
        return {
            selectedFolder: this.selectedFolder,
            allowedExtensions: this.allowedExtensions
        };
    }
    
    /**
     * 状態を設定
     */
    setState(state) {
        if (state.selectedFolder !== undefined) {
            this.setSelectedFolder(state.selectedFolder);
        }
        
        if (state.allowedExtensions !== undefined) {
            this.allowedExtensions = state.allowedExtensions;
            if (this.elements.fileExtensions) {
                this.elements.fileExtensions.value = state.allowedExtensions.join(',');
            }
        }
    }
    
    /**
     * クリーンアップ
     */
    destroy() {
        this.abortController.abort();
        this.onFolderSelected = null;
        this.onExtensionsChanged = null;
        console.log('FileSelector: Destroyed');
    }
}

// モジュールエクスポート
window.FileSelector = FileSelector;