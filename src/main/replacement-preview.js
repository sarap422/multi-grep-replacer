const path = require('path');
const fs = require('fs').promises;

/**
 * 置換プレビュー機能
 * 変更箇所のハイライト、統計情報の事前計算、リスク評価
 */
class ReplacementPreview {
    constructor(options = {}) {
        this.options = {
            maxPreviewFiles: options.maxPreviewFiles || 50,
            maxChangesPerFile: options.maxChangesPerFile || 10,
            contextLines: options.contextLines || 3,
            highlightContext: options.highlightContext !== false,
            calculateRisks: options.calculateRisks !== false,
            ...options
        };

        this.stats = {
            totalFiles: 0,
            affectedFiles: 0,
            totalChanges: 0,
            largestChange: null,
            riskFactors: []
        };

        console.log('👁️ 置換プレビューシステム初期化完了');
    }

    /**
     * 包括的なプレビュー生成
     * @param {string[]} filePaths ファイルパス配列
     * @param {Array} rules 置換ルール配列
     * @param {Object} options プレビューオプション
     * @returns {Promise<Object>} 詳細プレビュー情報
     */
    async generateComprehensivePreview(filePaths, rules, options = {}) {
        console.log(`👁️ 包括的プレビュー生成: ${filePaths.length}ファイル`);

        const mergedOptions = { ...this.options, ...options };
        const results = {
            overview: {
                totalFiles: filePaths.length,
                previewedFiles: 0,
                affectedFiles: 0,
                totalChanges: 0,
                estimatedTime: 0
            },
            fileChanges: [],
            ruleAnalysis: [],
            riskAnalysis: {
                level: 'low',
                factors: [],
                warnings: []
            },
            recommendations: []
        };

        // ファイルを重要度順にソート
        const sortedFiles = await this._sortFilesByImportance(filePaths);
        const previewFiles = sortedFiles.slice(0, mergedOptions.maxPreviewFiles);

        // 各ファイルのプレビュー生成
        for (const filePath of previewFiles) {
            try {
                const filePreview = await this._generateFilePreview(
                    filePath, 
                    rules, 
                    mergedOptions
                );
                
                if (filePreview) {
                    results.fileChanges.push(filePreview);
                    results.overview.previewedFiles++;
                    
                    if (filePreview.willChange) {
                        results.overview.affectedFiles++;
                        results.overview.totalChanges += filePreview.totalChanges;
                    }
                }

            } catch (error) {
                console.warn(`⚠️ ファイルプレビューエラー: ${filePath}`, error.message);
                results.fileChanges.push({
                    filePath,
                    fileName: path.basename(filePath),
                    error: error.message,
                    willChange: false
                });
            }
        }

        // ルール分析
        results.ruleAnalysis = this._analyzeRules(rules, results.fileChanges);

        // リスク分析
        if (mergedOptions.calculateRisks) {
            results.riskAnalysis = this._calculateRiskAnalysis(results.fileChanges, rules);
        }

        // 推奨事項生成
        results.recommendations = this._generateRecommendations(results);

        // 処理時間推定
        results.overview.estimatedTime = this._estimateProcessingTime(
            filePaths.length, 
            results.overview.totalChanges
        );

        console.log(`✅ プレビュー完了: ${results.overview.affectedFiles}/${results.overview.previewedFiles}ファイルが変更対象`);
        
        return results;
    }

    /**
     * 単一ファイルのプレビュー生成
     * @param {string} filePath ファイルパス
     * @param {Array} rules 置換ルール配列
     * @param {Object} options オプション
     * @returns {Promise<Object|null>} ファイルプレビュー
     * @private
     */
    async _generateFilePreview(filePath, rules, options) {
        try {
            const content = await fs.readFile(filePath, 'utf8');
            const fileName = path.basename(filePath);
            const fileExt = path.extname(filePath);

            // 各ルールを適用してプレビュー生成
            const ruleChanges = [];
            let totalChanges = 0;
            let currentContent = content;

            for (let i = 0; i < rules.length; i++) {
                const rule = rules[i];
                if (!rule.enabled) continue;

                const changes = this._findChanges(currentContent, rule);
                if (changes.length > 0) {
                    const changeData = {
                        ruleIndex: i,
                        rule: {
                            from: rule.from,
                            to: rule.to,
                            caseSensitive: rule.caseSensitive,
                            wholeWord: rule.wholeWord
                        },
                        changes: changes.slice(0, options.maxChangesPerFile),
                        totalCount: changes.length,
                        hasMore: changes.length > options.maxChangesPerFile
                    };

                    ruleChanges.push(changeData);
                    totalChanges += changes.length;

                    // 次のルール適用のために内容を更新
                    currentContent = this._applyRule(currentContent, rule);
                }
            }

            if (totalChanges === 0) {
                return null; // 変更なしのファイルは除外
            }

            // ファイル重要度評価
            const importance = this._evaluateFileImportance(filePath, fileExt);

            return {
                filePath,
                fileName,
                fileExtension: fileExt,
                willChange: true,
                totalChanges,
                importance,
                ruleChanges,
                fileSize: Buffer.byteLength(content, 'utf8'),
                lineCount: content.split('\n').length,
                estimatedTime: this._estimateFileProcessingTime(content.length, totalChanges)
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * 文字列から変更箇所を検出
     * @param {string} content 対象文字列
     * @param {Object} rule 置換ルール
     * @returns {Array} 変更箇所配列
     * @private
     */
    _findChanges(content, rule) {
        const { from, to, caseSensitive = true, wholeWord = false } = rule;
        const changes = [];

        try {
            // 検索パターン構築
            let searchPattern;
            if (wholeWord) {
                const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                searchPattern = new RegExp(`\\b${escapedFrom}\\b`, caseSensitive ? 'g' : 'gi');
            } else {
                const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                searchPattern = new RegExp(escapedFrom, caseSensitive ? 'g' : 'gi');
            }

            // 変更箇所検出
            let match;
            while ((match = searchPattern.exec(content)) !== null) {
                const lineInfo = this._getLineInfo(content, match.index);
                const context = this._extractContext(content, match.index, match[0].length);

                changes.push({
                    position: {
                        start: match.index,
                        end: match.index + match[0].length,
                        line: lineInfo.line,
                        column: lineInfo.column
                    },
                    original: match[0],
                    replacement: to,
                    context: context,
                    severity: this._evaluateChangeSeverity(match[0], to, context)
                });
            }

        } catch (error) {
            console.warn(`⚠️ 変更検出エラー: ${rule.from} → ${rule.to}`, error.message);
        }

        return changes;
    }

    /**
     * コンテキスト情報の抽出
     * @param {string} content 全体の内容
     * @param {number} position 位置
     * @param {number} length 長さ
     * @returns {Object} コンテキスト情報
     * @private
     */
    _extractContext(content, position, length) {
        const lines = content.split('\n');
        const lineInfo = this._getLineInfo(content, position);
        const lineIndex = lineInfo.line - 1;

        const startLine = Math.max(0, lineIndex - this.options.contextLines);
        const endLine = Math.min(lines.length - 1, lineIndex + this.options.contextLines);

        const contextLines = [];
        for (let i = startLine; i <= endLine; i++) {
            contextLines.push({
                lineNumber: i + 1,
                content: lines[i],
                isTargetLine: i === lineIndex,
                highlight: i === lineIndex ? {
                    start: lineInfo.column - 1,
                    end: lineInfo.column - 1 + length
                } : null
            });
        }

        return {
            beforeLines: contextLines.slice(0, this.options.contextLines),
            targetLine: contextLines[this.options.contextLines],
            afterLines: contextLines.slice(this.options.contextLines + 1),
            fullContext: contextLines
        };
    }

    /**
     * ルール分析の実行
     * @param {Array} rules 置換ルール配列
     * @param {Array} fileChanges ファイル変更情報
     * @returns {Array} ルール分析結果
     * @private
     */
    _analyzeRules(rules, fileChanges) {
        return rules.map((rule, index) => {
            const ruleChanges = fileChanges.reduce((total, file) => {
                const ruleChange = file.ruleChanges?.find(rc => rc.ruleIndex === index);
                return total + (ruleChange?.totalCount || 0);
            }, 0);

            const affectedFiles = fileChanges.filter(file =>
                file.ruleChanges?.some(rc => rc.ruleIndex === index)
            ).length;

            return {
                ruleIndex: index,
                rule: {
                    from: rule.from,
                    to: rule.to,
                    enabled: rule.enabled
                },
                statistics: {
                    totalChanges: ruleChanges,
                    affectedFiles,
                    averageChangesPerFile: affectedFiles > 0 ? Math.round(ruleChanges / affectedFiles) : 0
                },
                effectiveness: this._calculateRuleEffectiveness(rule, ruleChanges, affectedFiles),
                warnings: this._analyzeRuleWarnings(rule, ruleChanges)
            };
        });
    }

    /**
     * リスク分析の計算
     * @param {Array} fileChanges ファイル変更情報
     * @param {Array} rules 置換ルール配列
     * @returns {Object} リスク分析結果
     * @private
     */
    _calculateRiskAnalysis(fileChanges, rules) {
        const factors = [];
        const warnings = [];
        let riskScore = 0;

        // 大量変更リスク
        const totalChanges = fileChanges.reduce((sum, file) => sum + file.totalChanges, 0);
        if (totalChanges > 1000) {
            factors.push('large-scale-changes');
            riskScore += 2;
            warnings.push(`大量変更: ${totalChanges}箇所の変更が予定されています`);
        }

        // 重要ファイルへの変更
        const criticalFiles = fileChanges.filter(file => file.importance === 'critical');
        if (criticalFiles.length > 0) {
            factors.push('critical-files');
            riskScore += 3;
            warnings.push(`重要ファイル: ${criticalFiles.length}個の重要ファイルが変更対象です`);
        }

        // 曖昧なパターン
        const ambiguousRules = rules.filter(rule => 
            rule.from.length <= 2 || /^[a-zA-Z]$/.test(rule.from)
        );
        if (ambiguousRules.length > 0) {
            factors.push('ambiguous-patterns');
            riskScore += 1;
            warnings.push(`曖昧なパターン: ${ambiguousRules.length}個のルールが短いパターンを使用しています`);
        }

        // リスクレベル判定
        let level = 'low';
        if (riskScore >= 5) {
            level = 'high';
        } else if (riskScore >= 3) {
            level = 'medium';
        }

        return {
            level,
            score: riskScore,
            factors,
            warnings,
            recommendations: this._generateRiskRecommendations(factors, riskScore)
        };
    }

    /**
     * ファイル重要度の評価
     * @param {string} filePath ファイルパス
     * @param {string} fileExt ファイル拡張子
     * @returns {string} 重要度レベル
     * @private
     */
    _evaluateFileImportance(filePath, fileExt) {
        const fileName = path.basename(filePath);
        
        // 設定ファイル・重要なファイル
        const criticalFiles = [
            'package.json', 'package-lock.json', 'yarn.lock',
            'Dockerfile', 'docker-compose.yml',
            '.gitignore', '.env', 'config.json'
        ];
        
        const criticalExtensions = ['.config', '.conf', '.env'];
        
        if (criticalFiles.includes(fileName) || criticalExtensions.includes(fileExt)) {
            return 'critical';
        }
        
        // ソースコード
        const sourceExtensions = ['.js', '.ts', '.jsx', '.tsx', '.php', '.py', '.java'];
        if (sourceExtensions.includes(fileExt)) {
            return 'high';
        }
        
        // ドキュメント・スタイル
        const docExtensions = ['.md', '.html', '.css', '.scss'];
        if (docExtensions.includes(fileExt)) {
            return 'medium';
        }
        
        return 'low';
    }

    /**
     * ルールの効果性計算
     * @param {Object} rule ルール
     * @param {number} totalChanges 総変更数
     * @param {number} affectedFiles 影響ファイル数
     * @returns {string} 効果性レベル
     * @private
     */
    _calculateRuleEffectiveness(rule, totalChanges, affectedFiles) {
        if (totalChanges === 0) return 'none';
        if (totalChanges >= 100 || affectedFiles >= 20) return 'high';
        if (totalChanges >= 10 || affectedFiles >= 5) return 'medium';
        return 'low';
    }

    /**
     * ルール警告の分析
     * @param {Object} rule ルール
     * @param {number} changeCount 変更数
     * @returns {Array} 警告配列
     * @private
     */
    _analyzeRuleWarnings(rule, changeCount) {
        const warnings = [];
        
        if (rule.from.length <= 2) {
            warnings.push('短いパターンは意図しない変更を引き起こす可能性があります');
        }
        
        if (changeCount > 1000) {
            warnings.push('大量の変更が検出されました。慎重に確認してください');
        }
        
        if (rule.from === rule.to) {
            warnings.push('検索文字列と置換文字列が同じです');
        }
        
        return warnings;
    }

    /**
     * 推奨事項の生成
     * @param {Object} results プレビュー結果
     * @returns {Array} 推奨事項
     * @private
     */
    _generateRecommendations(results) {
        const recommendations = [];
        
        if (results.overview.totalChanges > 500) {
            recommendations.push({
                type: 'backup',
                message: 'バックアップを作成してから実行することを強く推奨します',
                priority: 'high'
            });
        }
        
        if (results.riskAnalysis.level === 'high') {
            recommendations.push({
                type: 'test-run',
                message: 'まず小規模なサンプルでテスト実行を行ってください',
                priority: 'high'
            });
        }
        
        if (results.overview.affectedFiles > 100) {
            recommendations.push({
                type: 'incremental',
                message: '段階的に実行することを検討してください',
                priority: 'medium'
            });
        }
        
        return recommendations;
    }

    /**
     * 処理時間の推定
     * @param {number} totalFiles 総ファイル数
     * @param {number} totalChanges 総変更数
     * @returns {number} 推定時間（秒）
     * @private
     */
    _estimateProcessingTime(totalFiles, totalChanges) {
        // ベース時間: ファイル数 × 50ms
        const baseTime = totalFiles * 0.05;
        
        // 変更数による加算: 変更数 × 5ms
        const changeTime = totalChanges * 0.005;
        
        // 最小時間は1秒
        return Math.max(1, Math.round(baseTime + changeTime));
    }

    /**
     * 単一ファイルの処理時間推定
     * @param {number} contentLength 内容の長さ
     * @param {number} changeCount 変更数
     * @returns {number} 推定時間（ミリ秒）
     * @private
     */
    _estimateFileProcessingTime(contentLength, changeCount) {
        const baseTime = Math.max(10, contentLength / 10000); // 10KB/秒
        const changeTime = changeCount * 2; // 変更1つにつき2ms
        return Math.round(baseTime + changeTime);
    }

    /**
     * ファイルを重要度順にソート
     * @param {string[]} filePaths ファイルパス配列
     * @returns {Promise<string[]>} ソート済みファイルパス
     * @private
     */
    async _sortFilesByImportance(filePaths) {
        const fileData = await Promise.all(
            filePaths.map(async (filePath) => {
                try {
                    const stats = await fs.stat(filePath);
                    const importance = this._evaluateFileImportance(
                        filePath, 
                        path.extname(filePath)
                    );
                    
                    const importanceScore = {
                        'critical': 4,
                        'high': 3,
                        'medium': 2,
                        'low': 1
                    }[importance];
                    
                    return {
                        filePath,
                        importance,
                        importanceScore,
                        size: stats.size,
                        mtime: stats.mtime
                    };
                    
                } catch (error) {
                    return {
                        filePath,
                        importance: 'low',
                        importanceScore: 1,
                        size: 0,
                        mtime: new Date(0)
                    };
                }
            })
        );

        // 重要度順、更新日時順でソート
        fileData.sort((a, b) => {
            if (a.importanceScore !== b.importanceScore) {
                return b.importanceScore - a.importanceScore;
            }
            return b.mtime - a.mtime;
        });

        return fileData.map(item => item.filePath);
    }

    /**
     * 変更の深刻度評価
     * @param {string} original 元の文字列
     * @param {string} replacement 置換文字列
     * @param {Object} context コンテキスト
     * @returns {string} 深刻度レベル
     * @private
     */
    _evaluateChangeSeverity(original, replacement, context) {
        // 大幅な変更
        if (Math.abs(original.length - replacement.length) > 10) {
            return 'high';
        }
        
        // 特殊文字を含む変更
        if (/[<>{}()[\]"']/.test(original) || /[<>{}()[\]"']/.test(replacement)) {
            return 'medium';
        }
        
        return 'low';
    }

    /**
     * 行情報の取得
     * @param {string} content 全体の内容
     * @param {number} position 位置
     * @returns {Object} 行情報
     * @private
     */
    _getLineInfo(content, position) {
        const beforePosition = content.substring(0, position);
        const lines = beforePosition.split('\n');
        return {
            line: lines.length,
            column: lines[lines.length - 1].length + 1
        };
    }

    /**
     * ルールを文字列に適用（プレビュー用）
     * @param {string} content 対象文字列
     * @param {Object} rule 置換ルール
     * @returns {string} 置換後の文字列
     * @private
     */
    _applyRule(content, rule) {
        const { from, to, caseSensitive = true, wholeWord = false } = rule;
        
        try {
            let searchPattern;
            if (wholeWord) {
                const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                searchPattern = new RegExp(`\\b${escapedFrom}\\b`, caseSensitive ? 'g' : 'gi');
            } else {
                const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                searchPattern = new RegExp(escapedFrom, caseSensitive ? 'g' : 'gi');
            }
            
            return content.replace(searchPattern, to);
            
        } catch (error) {
            console.warn(`⚠️ ルール適用エラー: ${error.message}`);
            return content;
        }
    }

    /**
     * リスク推奨事項の生成
     * @param {Array} factors リスク要因
     * @param {number} riskScore リスクスコア
     * @returns {Array} 推奨事項
     * @private
     */
    _generateRiskRecommendations(factors, riskScore) {
        const recommendations = [];
        
        if (factors.includes('large-scale-changes')) {
            recommendations.push('段階的実行を検討してください');
        }
        
        if (factors.includes('critical-files')) {
            recommendations.push('重要ファイルのバックアップを作成してください');
        }
        
        if (factors.includes('ambiguous-patterns')) {
            recommendations.push('短いパターンの使用を見直してください');
        }
        
        if (riskScore >= 3) {
            recommendations.push('テスト環境での事前検証を実施してください');
        }
        
        return recommendations;
    }
}

module.exports = ReplacementPreview;