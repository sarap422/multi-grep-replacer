// アプリケーションの初期化
document.addEventListener('DOMContentLoaded', () => {
    console.log('Multi Grep Replacer - Starting...');
    
    // Electronのバージョン情報を表示
    if (window.electronAPI) {
        console.log('Node version:', window.electronAPI.versions.node);
        console.log('Chrome version:', window.electronAPI.versions.chrome);
        console.log('Electron version:', window.electronAPI.versions.electron);
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
        if (window.electronAPI && window.electronAPI.fileOperations) {
            try {
                const folderPath = await window.electronAPI.fileOperations.selectFolder();
                if (folderPath) {
                    elements.folderPath.value = folderPath;
                    updatePreview();
                }
            } catch (error) {
                console.error('フォルダ選択エラー:', error);
                showError('フォルダの選択に失敗しました');
            }
        } else {
            // デモ用：Electron APIが無い場合
            elements.folderPath.value = '/demo/project/folder';
            updatePreview();
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
    function updatePreview() {
        const hasFolder = elements.folderPath.value.trim() !== '';
        const activeRules = replacementRules.filter(r => r.enabled && r.from).length;
        
        if (!hasFolder) {
            elements.previewText.textContent = '📊 Preview: フォルダを選択してください';
        } else if (activeRules === 0) {
            elements.previewText.textContent = '📊 Preview: 置換ルールを設定してください';
        } else {
            // デモ用のファイル数表示
            const fileCount = Math.floor(Math.random() * 200) + 50;
            elements.previewText.textContent = `📊 Preview: ${fileCount} files found, ${activeRules} rules active`;
        }
    }
    
    // 実行ボタン
    elements.executeBtn.addEventListener('click', () => {
        if (!elements.folderPath.value.trim()) {
            showError('フォルダを選択してください');
            return;
        }
        
        const activeRules = replacementRules.filter(r => r.enabled && r.from);
        if (activeRules.length === 0) {
            showError('有効な置換ルールがありません');
            return;
        }
        
        // デモ：進捗表示
        showProgressModal();
    });
    
    // 進捗モーダルを表示
    function showProgressModal() {
        elements.progressModal.style.display = 'flex';
        
        // デモ：進捗バーのアニメーション
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const currentFile = document.getElementById('currentFile');
        
        let progress = 0;
        const totalFiles = 156;
        
        const interval = setInterval(() => {
            progress += Math.random() * 5;
            if (progress > 100) progress = 100;
            
            progressBar.style.width = `${progress}%`;
            const currentCount = Math.floor((progress / 100) * totalFiles);
            progressText.textContent = `${Math.floor(progress)}% (${currentCount}/${totalFiles} files)`;
            currentFile.textContent = `📄 Currently processing: /project/file${currentCount}.js`;
            
            if (progress >= 100) {
                clearInterval(interval);
                setTimeout(() => {
                    elements.progressModal.style.display = 'none';
                    showResultModal();
                }, 500);
            }
        }, 100);
        
        // 停止ボタン
        document.getElementById('stopBtn').addEventListener('click', () => {
            clearInterval(interval);
            elements.progressModal.style.display = 'none';
        });
    }
    
    // 結果モーダルを表示
    function showResultModal() {
        elements.resultModal.style.display = 'flex';
        
        // デモ結果
        document.getElementById('resultSummary').innerHTML = `
            <p style="font-size: 16px; margin-bottom: 8px;">
                📊 Summary: <strong>15 files modified</strong> with <strong>42 total changes</strong>
            </p>
            <p style="color: var(--text-secondary);">⏱️ Completed in: 00:23</p>
        `;
        
        document.getElementById('closeResultBtn').addEventListener('click', () => {
            elements.resultModal.style.display = 'none';
        });
    }
    
    // エラー表示
    function showError(message) {
        // 簡易的なエラー表示（将来的にはモーダルやトーストで表示）
        alert(`❌ Error: ${message}`);
    }
    
    // 設定の保存・読み込み（デモ）
    elements.saveConfigBtn.addEventListener('click', () => {
        showError('設定保存機能は現在開発中です');
    });
    
    elements.loadConfigBtn.addEventListener('click', () => {
        showError('設定読み込み機能は現在開発中です');
    });
    
    elements.settingsBtn.addEventListener('click', () => {
        showError('設定画面は現在開発中です');
    });
    
    // テンプレート選択（デモ）
    elements.templateSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            showError(`テンプレート「${e.target.value}」の読み込み機能は現在開発中です`);
            e.target.value = '';
        }
    });
    
    console.log('Multi Grep Replacer - Initialization complete');
});