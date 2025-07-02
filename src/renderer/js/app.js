// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Multi Grep Replacer - Starting...');
    
    // API Client の初期化
    let apiClient;
    try {
        apiClient = initializeAPI();
        console.log('🚀 API Client 初期化成功');
        
        // アプリケーション情報の表示
        const appInfo = await apiClient.getAppInfo();
        console.log('📱 アプリケーション情報:', appInfo);
    } catch (error) {
        console.error('❌ API Client 初期化失敗:', error);
        window.errorHandler?.handleError({
            type: 'Initialization Error',
            message: `API初期化に失敗しました: ${error.message}`
        });
        return;
    }

    // ConfigManagerの初期化
    let configManager = null;
    if (window.ConfigManager) {
        try {
            configManager = new window.ConfigManager();
            await configManager.initialize();
            console.log('✅ ConfigManager初期化完了');
        } catch (error) {
            console.error('❌ ConfigManager初期化エラー:', error);
        }
    }
    
    // UI要素の取得
    const elements = {
        themeToggle: document.getElementById('themeToggle'),
        settingsBtn: document.getElementById('settingsBtn'),
        browseBtn: document.getElementById('browseBtn'),
        folderPath: document.getElementById('folderPath'),
        fileExtensions: document.getElementById('fileExtensions'),
        templateSelect: document.getElementById('templateSelect'),
        rulesContainer: document.getElementById('rulesContainer'),
        addRuleBtn: document.getElementById('addRuleBtn'),
        previewText: document.getElementById('previewText'),
        loadConfigBtn: document.getElementById('loadConfigBtn'),
        saveConfigBtn: document.getElementById('saveConfigBtn'),
        executeBtn: document.getElementById('executeBtn'),
        progressModal: document.getElementById('progressModal'),
        resultModal: document.getElementById('resultModal')
    };
    
    // 置換ルールの管理
    let replacementRules = [];
    let ruleIdCounter = 0;
    
    // テーマ切り替え機能
    elements.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        elements.themeToggle.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
    
    // 保存されたテーマを適用
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        elements.themeToggle.textContent = '☀️';
    }
    
    // フォルダ選択
    elements.browseBtn.addEventListener('click', async () => {
        try {
            const folderPath = await apiClient.selectFolder();
            if (folderPath) {
                elements.folderPath.value = folderPath;
                await updatePreview();
                window.errorHandler?.showNotification('フォルダを選択しました', 'success');
            }
        } catch (error) {
            console.error('フォルダ選択エラー:', error);
            window.errorHandler?.handleError({
                type: 'Folder Selection Error',
                message: error.message
            });
        }
    });
    
    // 置換ルールの追加
    elements.addRuleBtn.addEventListener('click', () => {
        addReplacementRule();
    });
    
    // デフォルトルールを追加
    addReplacementRule('old-class', 'new-class');
    addReplacementRule('oldVariable', 'newVariable');
    
    // 置換ルールを追加する関数
    function addReplacementRule(from = '', to = '') {
        const ruleId = `rule_${ruleIdCounter++}`;
        const rule = {
            id: ruleId,
            from: from,
            to: to,
            enabled: true
        };
        
        replacementRules.push(rule);
        
        const ruleElement = createRuleElement(rule);
        elements.rulesContainer.appendChild(ruleElement);
        
        // アニメーション
        ruleElement.style.opacity = '0';
        setTimeout(() => {
            ruleElement.style.transition = 'opacity 0.3s';
            ruleElement.style.opacity = '1';
        }, 10);
        
        updatePreview();
    }
    
    // ルール要素を作成する関数
    function createRuleElement(rule) {
        const ruleDiv = document.createElement('div');
        ruleDiv.className = 'rule-item';
        ruleDiv.id = rule.id;
        ruleDiv.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            padding: 8px;
            background-color: var(--bg-primary);
            border-radius: var(--border-radius);
        `;
        
        ruleDiv.innerHTML = `
            <input type="checkbox" class="rule-checkbox" ${rule.enabled ? 'checked' : ''}>
            <span style="color: var(--text-secondary);">From:</span>
            <input type="text" class="rule-from" value="${rule.from}" placeholder="検索文字列">
            <span style="color: var(--text-secondary);">→ To:</span>
            <input type="text" class="rule-to" value="${rule.to}" placeholder="置換文字列">
            <button class="rule-delete" style="
                width: 28px;
                height: 28px;
                border: none;
                background: none;
                color: var(--error-color);
                cursor: pointer;
                font-size: 16px;
            ">🗑️</button>
        `;
        
        // イベントリスナーを追加
        const checkbox = ruleDiv.querySelector('.rule-checkbox');
        const fromInput = ruleDiv.querySelector('.rule-from');
        const toInput = ruleDiv.querySelector('.rule-to');
        const deleteBtn = ruleDiv.querySelector('.rule-delete');
        
        checkbox.addEventListener('change', () => {
            rule.enabled = checkbox.checked;
            updatePreview();
        });
        
        fromInput.addEventListener('input', () => {
            rule.from = fromInput.value;
            updatePreview();
        });
        
        toInput.addEventListener('input', () => {
            rule.to = toInput.value;
            updatePreview();
        });
        
        deleteBtn.addEventListener('click', () => {
            ruleDiv.style.transition = 'opacity 0.3s, transform 0.3s';
            ruleDiv.style.opacity = '0';
            ruleDiv.style.transform = 'translateX(-20px)';
            setTimeout(() => {
                ruleDiv.remove();
                replacementRules = replacementRules.filter(r => r.id !== rule.id);
                updatePreview();
            }, 300);
        });
        
        return ruleDiv;
    }
    
    // プレビューの更新
    async function updatePreview() {
        const hasFolder = elements.folderPath.value.trim() !== '';
        const activeRules = replacementRules.filter(r => r.enabled && r.from).length;
        
        if (!hasFolder) {
            elements.previewText.textContent = '📊 Preview: フォルダを選択してください';
            return;
        }
        
        if (activeRules === 0) {
            elements.previewText.textContent = '📊 Preview: 置換ルールを設定してください';
            return;
        }

        try {
            // 実際のファイル検索実行
            elements.previewText.textContent = '📊 Preview: ファイル検索中...';
            
            const extensions = elements.fileExtensions.value
                .split(',')
                .map(ext => ext.trim())
                .filter(ext => ext.length > 0);
            
            const files = await apiClient.findFiles(elements.folderPath.value, extensions);
            const fileCount = files.length;
            
            elements.previewText.textContent = `📊 Preview: ${fileCount} files found, ${activeRules} rules active`;
            
        } catch (error) {
            console.error('ファイル検索エラー:', error);
            elements.previewText.textContent = '📊 Preview: ファイル検索エラー';
        }
    }
    
    // 実行ボタン
    elements.executeBtn.addEventListener('click', async () => {
        if (!elements.folderPath.value.trim()) {
            window.errorHandler?.handleError({
                type: 'Validation Error',
                message: 'フォルダを選択してください'
            });
            return;
        }
        
        const activeRules = replacementRules.filter(r => r.enabled && r.from);
        if (activeRules.length === 0) {
            window.errorHandler?.handleError({
                type: 'Validation Error',
                message: '有効な置換ルールがありません'
            });
            return;
        }
        
        // 実際の置換処理実行
        await executeReplacement();
    });

    // 実際の置換処理を実行
    async function executeReplacement() {
        try {
            // 設定オブジェクトを作成
            const config = createConfigFromUI();
            
            // 進捗通知の設定
            setupProgressNotifications();
            
            // 進捗モーダルを表示
            showProgressModal();
            
            // 置換処理実行
            const result = await apiClient.executeReplacement(config);
            
            console.log('✅ 置換処理完了:', result);
            
        } catch (error) {
            console.error('❌ 置換処理エラー:', error);
            elements.progressModal.style.display = 'none';
            window.errorHandler?.handleError({
                type: 'Replacement Error',
                message: error.message
            });
        }
    }

    // UI状態から設定オブジェクトを作成
    function createConfigFromUI() {
        const extensions = elements.fileExtensions.value
            .split(',')
            .map(ext => ext.trim())
            .filter(ext => ext.length > 0);

        return {
            target_folder: elements.folderPath.value,
            replacements: replacementRules.filter(r => r.enabled && r.from),
            target_settings: {
                file_extensions: extensions.length > 0 ? extensions : null
            },
            replacement_settings: {
                case_sensitive: true,
                whole_word: false,
                dry_run: false
            },
            advanced_settings: {
                max_concurrent_files: 10
            }
        };
    }

    // 進捗通知の設定
    function setupProgressNotifications() {
        // 進捗通知リスナー
        apiClient.onProgress((progress) => {
            updateProgressUI(progress);
        });

        // エラー通知リスナー
        apiClient.onError((error) => {
            console.error('置換処理エラー通知:', error);
            elements.progressModal.style.display = 'none';
            window.errorHandler?.handleError({
                type: 'Replacement Process Error',
                message: error
            });
        });

        // 完了通知リスナー
        apiClient.onComplete((result) => {
            console.log('置換処理完了通知:', result);
            elements.progressModal.style.display = 'none';
            showResultModal(result);
        });
    }

    // 進捗UIの更新
    function updateProgressUI(progress) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const currentFile = document.getElementById('currentFile');

        if (progressBar) {
            progressBar.style.width = `${progress.percentage || 0}%`;
        }

        if (progressText) {
            progressText.textContent = `${progress.percentage || 0}% (${progress.current || 0}/${progress.total || 0} files)`;
        }

        if (currentFile && progress.currentFile) {
            currentFile.textContent = `📄 Currently processing: ${progress.currentFile}`;
        }
    }
    
    // 進捗モーダルを表示
    function showProgressModal() {
        elements.progressModal.style.display = 'flex';
        
        // 停止ボタンのイベントリスナー設定
        const stopBtn = document.getElementById('stopBtn');
        if (stopBtn) {
            stopBtn.onclick = async () => {
                try {
                    await apiClient.cancelReplacement();
                    elements.progressModal.style.display = 'none';
                    window.errorHandler?.showNotification('処理をキャンセルしました', 'info');
                } catch (error) {
                    console.error('キャンセルエラー:', error);
                    window.errorHandler?.handleError({
                        type: 'Cancel Error',
                        message: error.message
                    });
                }
            };
        }
    }
    
    // 結果モーダルを表示
    function showResultModal(result) {
        elements.resultModal.style.display = 'flex';
        
        if (!result) {
            result = { success: false, message: 'データがありません' };
        }

        // 結果サマリーを表示
        const resultSummary = document.getElementById('resultSummary');
        if (resultSummary) {
            if (result.success) {
                const duration = Math.round(result.duration / 1000);
                resultSummary.innerHTML = `
                    <p style="font-size: 16px; margin-bottom: 8px;">
                        📊 Summary: <strong>${result.modifiedFiles || 0} files modified</strong> with <strong>${result.totalChanges || 0} total changes</strong>
                    </p>
                    <p style="color: var(--text-secondary);">⏱️ Completed in: ${duration}s</p>
                    ${result.errors?.length > 0 ? `<p style="color: var(--error-color);">⚠️ ${result.errors.length} errors occurred</p>` : ''}
                `;

                // 詳細結果の表示
                const resultDetails = document.createElement('div');
                resultDetails.style.cssText = 'margin-top: 16px; max-height: 200px; overflow-y: auto;';
                
                if (result.details && result.details.length > 0) {
                    resultDetails.innerHTML = '<h4>変更されたファイル:</h4>';
                    result.details.forEach(detail => {
                        const fileDiv = document.createElement('div');
                        fileDiv.style.cssText = 'margin: 8px 0; padding: 8px; background: var(--bg-secondary); border-radius: 4px;';
                        fileDiv.innerHTML = `
                            <strong>${detail.file}</strong> (${detail.changes} changes)
                            ${detail.rules ? `<br><small>${detail.rules.join(', ')}</small>` : ''}
                        `;
                        resultDetails.appendChild(fileDiv);
                    });
                }

                resultSummary.appendChild(resultDetails);
            } else {
                resultSummary.innerHTML = `
                    <p style="font-size: 16px; color: var(--error-color);">
                        ❌ 処理が失敗しました
                    </p>
                    <p style="color: var(--text-secondary);">${result.message || 'エラーの詳細は不明です'}</p>
                `;
            }
        }
        
        // 閉じるボタンのイベントリスナー
        const closeBtn = document.getElementById('closeResultBtn');
        if (closeBtn) {
            closeBtn.onclick = () => {
                elements.resultModal.style.display = 'none';
            };
        }
    }
    
    // 設定の保存・読み込み
    elements.saveConfigBtn.addEventListener('click', async () => {
        try {
            const config = createConfigFromUI();
            const savedPath = await apiClient.saveConfig(config);
            if (savedPath) {
                console.log(`✅ 設定保存完了: ${savedPath}`);
                window.errorHandler?.showNotification('設定を保存しました', 'success');
            }
        } catch (error) {
            console.error('❌ 設定保存エラー:', error);
            window.errorHandler?.handleError({
                type: 'Config Save Error',
                message: error.message
            });
        }
    });
    
    elements.loadConfigBtn.addEventListener('click', async () => {
        try {
            const config = await apiClient.loadConfig();
            if (config) {
                // UIに設定を反映
                applyConfigToUI(config);
                console.log('✅ 設定読み込み完了');
                window.errorHandler?.showNotification('設定を読み込みました', 'success');
            }
        } catch (error) {
            console.error('❌ 設定読み込みエラー:', error);
            window.errorHandler?.handleError({
                type: 'Config Load Error',
                message: error.message
            });
        }
    });
    
    elements.settingsBtn.addEventListener('click', () => {
        window.errorHandler?.showNotification('詳細設定画面は現在開発中です', 'info');
    });
    
    // テンプレート選択（デモ）
    elements.templateSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            window.errorHandler?.showNotification(`テンプレート「${e.target.value}」の読み込み機能は現在開発中です`, 'info');
            e.target.value = '';
        }
    });
    
    // UI状態を設定に反映する関数
    function updateConfigFromUI() {
        if (!configManager) return;

        // 置換ルールをConfigManagerに反映
        const uiRules = replacementRules.map(rule => ({
            id: rule.id,
            from: rule.from,
            to: rule.to,
            enabled: rule.enabled,
            description: '',
            case_sensitive: true,
            whole_word: false
        }));

        // 現在の設定を取得してUIの値で更新
        const currentConfig = configManager.getCurrentConfig();
        if (currentConfig) {
            currentConfig.replacements = uiRules;
            currentConfig.target_settings.file_extensions = elements.fileExtensions.value
                .split(',')
                .map(ext => ext.trim())
                .filter(ext => ext.length > 0);
            
            // ConfigManagerの設定を更新
            configManager.currentConfig = currentConfig;
            configManager.isModified = true;
        }
    }

    // 設定をUIに適用する関数  
    function applyConfigToUI(config) {
        if (!config) return;

        // ファイル拡張子を設定
        if (config.target_settings?.file_extensions) {
            elements.fileExtensions.value = config.target_settings.file_extensions.join(', ');
        }

        // 置換ルールをクリアして再作成
        replacementRules = [];
        elements.rulesContainer.innerHTML = '';

        if (config.replacements && config.replacements.length > 0) {
            config.replacements.forEach(rule => {
                addReplacementRule(rule.from, rule.to);
                
                // enabledステートを反映
                const ruleElement = document.getElementById(rule.id);
                if (ruleElement) {
                    const checkbox = ruleElement.querySelector('.rule-checkbox');
                    if (checkbox) {
                        checkbox.checked = rule.enabled;
                    }
                }
            });
        } else {
            // デフォルトルールを追加
            addReplacementRule('old-class', 'new-class');
            addReplacementRule('oldVariable', 'newVariable');
        }

        updatePreview();
    }

    console.log('Multi Grep Replacer - Initialization complete');
});