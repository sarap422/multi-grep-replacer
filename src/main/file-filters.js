const path = require('path');
const fs = require('fs').promises;

/**
 * 高度なファイルフィルタリング機能を提供するクラス
 * 拡張子、サイズ、日付、内容などの複合条件でファイルを絞り込み
 */
class FileFilters {
    constructor() {
        // デフォルト除外パターン（プロジェクト共通）
        this.DEFAULT_EXCLUDE_PATTERNS = [
            // Version Control
            '.git/**',
            '.svn/**',
            '.hg/**',
            
            // Dependencies
            'node_modules/**',
            'vendor/**',
            'bower_components/**',
            
            // Build/Dist
            'dist/**',
            'build/**',
            'out/**',
            'target/**',
            
            // IDE/Editor
            '.vscode/**',
            '.idea/**',
            '*.swp',
            '*.swo',
            '*~',
            
            // OS
            '.DS_Store',
            'Thumbs.db',
            'desktop.ini',
            
            // Logs/Temp
            '*.log',
            '*.tmp',
            '*.temp',
            '*.cache',
            
            // Archives
            '*.zip',
            '*.tar',
            '*.gz',
            '*.rar',
            '*.7z'
        ];

        // サポートするテキストファイル拡張子
        this.TEXT_EXTENSIONS = [
            // Web
            '.html', '.htm', '.css', '.scss', '.sass', '.less',
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.json', '.xml',
            
            // Programming
            '.php', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.hpp',
            '.cs', '.go', '.rs', '.swift', '.kt', '.scala',
            
            // Data
            '.csv', '.tsv', '.yaml', '.yml', '.toml', '.ini', '.cfg',
            
            // Documentation
            '.md', '.txt', '.rst', '.tex', '.org',
            
            // Config
            '.conf', '.config', '.properties', '.env'
        ];

        // バイナリファイル拡張子（除外対象）
        this.BINARY_EXTENSIONS = [
            // Images
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico', '.webp',
            
            // Media
            '.mp4', '.avi', '.mov', '.wmv', '.mp3', '.wav', '.ogg',
            
            // Documents
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            
            // Executables
            '.exe', '.app', '.dmg', '.deb', '.rpm', '.msi',
            
            // Libraries
            '.dll', '.so', '.dylib', '.a', '.lib'
        ];

        console.log('🔍 ファイルフィルタ初期化完了');
    }

    /**
     * 包括的なファイルフィルタリング
     * @param {string[]} files ファイルパス配列
     * @param {Object} filterConfig フィルタ設定
     * @returns {Promise<string[]>} フィルタリング後のファイル配列
     */
    async filterFiles(files, filterConfig = {}) {
        try {
            console.log(`🔍 ファイルフィルタリング開始: ${files.length}件`);

            const config = {
                extensions: filterConfig.extensions || [],
                excludePatterns: filterConfig.excludePatterns || [],
                maxFileSize: filterConfig.maxFileSize || 104857600, // 100MB
                minFileSize: filterConfig.minFileSize || 0,
                includeHidden: filterConfig.includeHidden || false,
                modifiedAfter: filterConfig.modifiedAfter || null,
                modifiedBefore: filterConfig.modifiedBefore || null,
                contentPattern: filterConfig.contentPattern || null,
                caseSensitive: filterConfig.caseSensitive !== false,
                ...filterConfig
            };

            let filteredFiles = [...files];

            // 1. 拡張子フィルタ
            if (config.extensions.length > 0) {
                filteredFiles = this._filterByExtension(filteredFiles, config.extensions);
                console.log(`📋 拡張子フィルタ後: ${filteredFiles.length}件`);
            }

            // 2. 除外パターンフィルタ
            const allExcludePatterns = [...this.DEFAULT_EXCLUDE_PATTERNS, ...config.excludePatterns];
            filteredFiles = this._filterByExcludePatterns(filteredFiles, allExcludePatterns);
            console.log(`🚫 除外パターン後: ${filteredFiles.length}件`);

            // 3. 隠しファイルフィルタ
            if (!config.includeHidden) {
                filteredFiles = this._filterHiddenFiles(filteredFiles);
                console.log(`👁️ 隠しファイル除外後: ${filteredFiles.length}件`);
            }

            // 4. ファイルサイズフィルタ
            filteredFiles = await this._filterBySize(filteredFiles, config.minFileSize, config.maxFileSize);
            console.log(`📏 サイズフィルタ後: ${filteredFiles.length}件`);

            // 5. 日付フィルタ
            if (config.modifiedAfter || config.modifiedBefore) {
                filteredFiles = await this._filterByModifiedDate(
                    filteredFiles, 
                    config.modifiedAfter, 
                    config.modifiedBefore
                );
                console.log(`📅 日付フィルタ後: ${filteredFiles.length}件`);
            }

            // 6. 内容フィルタ（オプション）
            if (config.contentPattern) {
                filteredFiles = await this._filterByContent(
                    filteredFiles, 
                    config.contentPattern, 
                    config.caseSensitive
                );
                console.log(`📄 内容フィルタ後: ${filteredFiles.length}件`);
            }

            // 7. バイナリファイル除外
            filteredFiles = this._filterBinaryFiles(filteredFiles);
            console.log(`🔤 バイナリ除外後: ${filteredFiles.length}件`);

            console.log(`✅ フィルタリング完了: ${files.length} → ${filteredFiles.length}件`);
            return filteredFiles;

        } catch (error) {
            console.error('❌ ファイルフィルタリングエラー:', error);
            throw new Error(`ファイルフィルタリングに失敗しました: ${error.message}`);
        }
    }

    /**
     * 拡張子によるフィルタリング
     * @param {string[]} files ファイル配列
     * @param {string[]} extensions 許可する拡張子
     * @returns {string[]} フィルタリング後のファイル
     */
    _filterByExtension(files, extensions) {
        if (!extensions || extensions.length === 0) {
            return files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return this.TEXT_EXTENSIONS.includes(ext);
            });
        }

        const normalizedExtensions = extensions.map(ext => 
            ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
        );

        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return normalizedExtensions.includes(ext);
        });
    }

    /**
     * 除外パターンによるフィルタリング
     * @param {string[]} files ファイル配列
     * @param {string[]} excludePatterns 除外パターン
     * @returns {string[]} フィルタリング後のファイル
     */
    _filterByExcludePatterns(files, excludePatterns) {
        return files.filter(file => {
            const relativePath = path.relative(process.cwd(), file).replace(/\\/g, '/');
            
            return !excludePatterns.some(pattern => {
                const regexPattern = this._globToRegex(pattern);
                return regexPattern.test(relativePath);
            });
        });
    }

    /**
     * 隠しファイルのフィルタリング
     * @param {string[]} files ファイル配列
     * @returns {string[]} フィルタリング後のファイル
     */
    _filterHiddenFiles(files) {
        return files.filter(file => {
            const basename = path.basename(file);
            const dirname = path.dirname(file);
            
            // ファイル名が . で始まる
            if (basename.startsWith('.')) return false;
            
            // ディレクトリパス内に隠しディレクトリが含まれる
            const pathParts = dirname.split(path.sep);
            return !pathParts.some(part => part.startsWith('.'));
        });
    }

    /**
     * ファイルサイズによるフィルタリング
     * @param {string[]} files ファイル配列
     * @param {number} minSize 最小サイズ（バイト）
     * @param {number} maxSize 最大サイズ（バイト）
     * @returns {Promise<string[]>} フィルタリング後のファイル
     */
    async _filterBySize(files, minSize, maxSize) {
        const filteredFiles = [];
        
        for (const file of files) {
            try {
                const stats = await fs.stat(file);
                
                if (stats.size >= minSize && stats.size <= maxSize) {
                    filteredFiles.push(file);
                } else {
                    console.log(`📏 サイズ制限により除外: ${file} (${Math.round(stats.size / 1024)}KB)`);
                }
                
            } catch (error) {
                console.warn(`⚠️ ファイル統計取得エラー: ${file}`, error.message);
                // 統計取得に失敗したファイルは除外
            }
        }
        
        return filteredFiles;
    }

    /**
     * 更新日時によるフィルタリング
     * @param {string[]} files ファイル配列
     * @param {Date|null} modifiedAfter この日時以降
     * @param {Date|null} modifiedBefore この日時以前
     * @returns {Promise<string[]>} フィルタリング後のファイル
     */
    async _filterByModifiedDate(files, modifiedAfter, modifiedBefore) {
        const filteredFiles = [];
        
        for (const file of files) {
            try {
                const stats = await fs.stat(file);
                const mtime = stats.mtime;
                
                let include = true;
                
                if (modifiedAfter && mtime < modifiedAfter) {
                    include = false;
                }
                
                if (modifiedBefore && mtime > modifiedBefore) {
                    include = false;
                }
                
                if (include) {
                    filteredFiles.push(file);
                } else {
                    console.log(`📅 日付制限により除外: ${file} (${mtime.toISOString()})`);
                }
                
            } catch (error) {
                console.warn(`⚠️ ファイル日付取得エラー: ${file}`, error.message);
            }
        }
        
        return filteredFiles;
    }

    /**
     * ファイル内容によるフィルタリング
     * @param {string[]} files ファイル配列
     * @param {string|RegExp} pattern 検索パターン
     * @param {boolean} caseSensitive 大文字小文字区別
     * @returns {Promise<string[]>} フィルタリング後のファイル
     */
    async _filterByContent(files, pattern, caseSensitive = true) {
        const filteredFiles = [];
        const regex = pattern instanceof RegExp ? pattern : 
            new RegExp(pattern, caseSensitive ? 'g' : 'gi');
        
        for (const file of files) {
            try {
                // ファイルサイズチェック（大容量ファイルは内容検索対象外）
                const stats = await fs.stat(file);
                if (stats.size > 10 * 1024 * 1024) { // 10MB
                    console.log(`📄 ファイルサイズ超過により内容検索スキップ: ${file}`);
                    continue;
                }
                
                const content = await fs.readFile(file, 'utf8');
                
                if (regex.test(content)) {
                    filteredFiles.push(file);
                    console.log(`📄 内容マッチ: ${file}`);
                }
                
            } catch (error) {
                console.warn(`⚠️ ファイル内容読み込みエラー: ${file}`, error.message);
                // 読み込みエラーのファイルは除外
            }
        }
        
        return filteredFiles;
    }

    /**
     * バイナリファイルの除外
     * @param {string[]} files ファイル配列
     * @returns {string[]} テキストファイルのみ
     */
    _filterBinaryFiles(files) {
        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            
            if (this.BINARY_EXTENSIONS.includes(ext)) {
                console.log(`🔤 バイナリファイル除外: ${file}`);
                return false;
            }
            
            return true;
        });
    }

    /**
     * Globパターンを正規表現に変換
     * @param {string} pattern Globパターン
     * @returns {RegExp} 正規表現
     */
    _globToRegex(pattern) {
        const regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '___DOUBLESTAR___')
            .replace(/\*/g, '[^/]*')
            .replace(/___DOUBLESTAR___/g, '.*')
            .replace(/\?/g, '[^/]')
            .replace(/\//g, '[\\/\\\\]'); // Windows/Unix両対応
        
        return new RegExp(`^${regexPattern}$`, 'i');
    }

    /**
     * フィルタ設定の検証
     * @param {Object} config フィルタ設定
     * @returns {Object} 検証済み設定
     */
    validateFilterConfig(config) {
        const validated = {
            extensions: [],
            excludePatterns: [],
            maxFileSize: 104857600, // 100MB
            minFileSize: 0,
            includeHidden: false,
            modifiedAfter: null,
            modifiedBefore: null,
            contentPattern: null,
            caseSensitive: true
        };

        if (config.extensions && Array.isArray(config.extensions)) {
            validated.extensions = config.extensions.filter(ext => typeof ext === 'string');
        }

        if (config.excludePatterns && Array.isArray(config.excludePatterns)) {
            validated.excludePatterns = config.excludePatterns.filter(pattern => typeof pattern === 'string');
        }

        if (typeof config.maxFileSize === 'number' && config.maxFileSize > 0) {
            validated.maxFileSize = config.maxFileSize;
        }

        if (typeof config.minFileSize === 'number' && config.minFileSize >= 0) {
            validated.minFileSize = config.minFileSize;
        }

        if (typeof config.includeHidden === 'boolean') {
            validated.includeHidden = config.includeHidden;
        }

        if (config.modifiedAfter instanceof Date) {
            validated.modifiedAfter = config.modifiedAfter;
        }

        if (config.modifiedBefore instanceof Date) {
            validated.modifiedBefore = config.modifiedBefore;
        }

        if (typeof config.contentPattern === 'string' && config.contentPattern.length > 0) {
            validated.contentPattern = config.contentPattern;
        }

        if (typeof config.caseSensitive === 'boolean') {
            validated.caseSensitive = config.caseSensitive;
        }

        return validated;
    }

    /**
     * プリセットフィルタの取得
     * @param {string} presetName プリセット名
     * @returns {Object} フィルタ設定
     */
    getPresetFilter(presetName) {
        const presets = {
            'web-development': {
                extensions: ['.html', '.css', '.scss', '.js', '.jsx', '.ts', '.tsx', '.vue', '.json'],
                excludePatterns: ['node_modules/**', 'dist/**', 'build/**', '*.min.js', '*.min.css']
            },
            
            'backend-code': {
                extensions: ['.php', '.py', '.rb', '.java', '.c', '.cpp', '.cs', '.go', '.rs'],
                excludePatterns: ['vendor/**', 'target/**', '__pycache__/**', '*.pyc']
            },
            
            'config-files': {
                extensions: ['.json', '.yaml', '.yml', '.ini', '.cfg', '.conf', '.env', '.toml'],
                excludePatterns: ['node_modules/**', '.git/**']
            },
            
            'documentation': {
                extensions: ['.md', '.txt', '.rst', '.tex', '.org'],
                excludePatterns: ['node_modules/**', '.git/**']
            },
            
            'all-text': {
                extensions: this.TEXT_EXTENSIONS,
                excludePatterns: this.DEFAULT_EXCLUDE_PATTERNS
            }
        };

        return presets[presetName] || presets['all-text'];
    }
}

module.exports = FileFilters;