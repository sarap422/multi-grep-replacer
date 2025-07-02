/**
 * 置換処理の詳細実装
 * 文字列置換の基本ロジックと統計情報収集
 */
class ReplacementProcessor {
    constructor(options = {}) {
        this.options = {
            caseSensitive: options.caseSensitive !== false,
            wholeWord: options.wholeWord || false,
            preserveCase: options.preserveCase || false,
            encoding: options.encoding || 'utf8',
            ...options
        };

        // 処理統計
        this.stats = {
            totalReplacements: 0,
            totalFiles: 0,
            processedFiles: 0,
            modifiedFiles: 0,
            errors: 0,
            startTime: null,
            endTime: null
        };

        console.log('🔄 置換プロセッサ初期化完了');
    }

    /**
     * 単一の置換ルールを文字列に適用
     * @param {string} content 対象文字列
     * @param {Object} rule 置換ルール
     * @returns {Object} 置換結果
     */
    applyRule(content, rule) {
        if (!rule.enabled) {
            console.log(`⏭️ ルールスキップ（無効）: ${rule.from} → ${rule.to}`);
            return {
                content,
                replacements: 0,
                changes: []
            };
        }

        const { from, to, caseSensitive = this.options.caseSensitive, wholeWord = this.options.wholeWord } = rule;
        
        console.log(`🔄 ルール適用: "${from}" → "${to}" (大文字小文字: ${caseSensitive ? '区別' : '無視'})`);

        try {
            // 置換前の内容を保存
            const originalContent = content;
            const changes = [];

            // 置換パターンの構築
            let searchPattern;
            if (wholeWord) {
                // 単語境界を考慮
                const escapedFrom = this._escapeRegExp(from);
                const flags = caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(`\\b${escapedFrom}\\b`, flags);
            } else {
                // 通常の文字列置換
                const escapedFrom = this._escapeRegExp(from);
                const flags = caseSensitive ? 'g' : 'gi';
                searchPattern = new RegExp(escapedFrom, flags);
            }

            // 変更箇所の記録
            let match;
            let lastIndex = 0;
            const matches = [];
            
            while ((match = searchPattern.exec(originalContent)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    original: match[0],
                    replacement: to,
                    line: this._getLineNumber(originalContent, match.index),
                    column: this._getColumnNumber(originalContent, match.index)
                });
            }

            // 置換実行
            const replacedContent = originalContent.replace(searchPattern, to);
            const replacementCount = matches.length;

            if (replacementCount > 0) {
                console.log(`✅ ${replacementCount}箇所を置換しました`);
                changes.push(...matches);
            }

            return {
                content: replacedContent,
                replacements: replacementCount,
                changes
            };

        } catch (error) {
            console.error(`❌ ルール適用エラー: ${error.message}`);
            throw new Error(`置換ルール適用に失敗しました: ${error.message}`);
        }
    }

    /**
     * 複数の置換ルールを順次適用
     * @param {string} content 対象文字列
     * @param {Array} rules 置換ルール配列
     * @returns {Object} 置換結果
     */
    applyRules(content, rules) {
        console.log(`🔄 ${rules.length}個のルールを順次適用します`);
        
        let currentContent = content;
        const allChanges = [];
        let totalReplacements = 0;
        const ruleResults = [];

        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            console.log(`📋 ルール ${i + 1}/${rules.length}: ${rule.from} → ${rule.to}`);

            try {
                const result = this.applyRule(currentContent, rule);
                currentContent = result.content;
                totalReplacements += result.replacements;
                
                if (result.replacements > 0) {
                    allChanges.push({
                        ruleIndex: i,
                        ruleId: rule.id || `rule_${i}`,
                        from: rule.from,
                        to: rule.to,
                        replacements: result.replacements,
                        changes: result.changes
                    });
                }

                ruleResults.push({
                    ruleIndex: i,
                    ruleId: rule.id || `rule_${i}`,
                    success: true,
                    replacements: result.replacements
                });

            } catch (error) {
                console.error(`❌ ルール ${i + 1} 処理エラー:`, error);
                ruleResults.push({
                    ruleIndex: i,
                    ruleId: rule.id || `rule_${i}`,
                    success: false,
                    error: error.message
                });
            }
        }

        return {
            originalContent: content,
            content: currentContent,
            modified: totalReplacements > 0,
            totalReplacements,
            changes: allChanges,
            ruleResults
        };
    }

    /**
     * ファイル内容に置換を適用
     * @param {string} fileContent ファイル内容
     * @param {Array} rules 置換ルール配列
     * @returns {Object} 処理結果
     */
    processContent(fileContent, rules) {
        const startTime = Date.now();
        
        try {
            const result = this.applyRules(fileContent, rules);
            const processingTime = Date.now() - startTime;

            return {
                success: true,
                originalContent: result.originalContent,
                processedContent: result.content,
                modified: result.modified,
                stats: {
                    totalReplacements: result.totalReplacements,
                    rulesApplied: rules.filter(r => r.enabled).length,
                    processingTime,
                    contentLength: fileContent.length,
                    processedLength: result.content.length
                },
                changes: result.changes,
                ruleResults: result.ruleResults
            };

        } catch (error) {
            console.error('❌ コンテンツ処理エラー:', error);
            return {
                success: false,
                error: error.message,
                stats: {
                    processingTime: Date.now() - startTime
                }
            };
        }
    }

    /**
     * 置換プレビューの生成（実際には置換しない）
     * @param {string} content 対象文字列
     * @param {Array} rules 置換ルール配列
     * @param {Object} options プレビューオプション
     * @returns {Object} プレビュー情報
     */
    generatePreview(content, rules, options = {}) {
        const maxPreviewLength = options.maxPreviewLength || 200;
        const contextLines = options.contextLines || 2;
        
        console.log('👁️ 置換プレビュー生成中...');

        const result = this.applyRules(content, rules);
        const preview = {
            wouldModify: result.modified,
            totalReplacements: result.totalReplacements,
            changes: []
        };

        // 各変更のプレビューを生成
        for (const changeGroup of result.changes) {
            const previewChanges = changeGroup.changes.slice(0, 5).map(change => {
                const lines = content.split('\n');
                const lineIndex = change.line - 1;
                
                // コンテキスト行を含めて抽出
                const startLine = Math.max(0, lineIndex - contextLines);
                const endLine = Math.min(lines.length - 1, lineIndex + contextLines);
                const contextContent = lines.slice(startLine, endLine + 1);

                return {
                    line: change.line,
                    column: change.column,
                    before: change.original,
                    after: change.replacement,
                    context: contextContent,
                    contextStartLine: startLine + 1
                };
            });

            preview.changes.push({
                rule: {
                    from: changeGroup.from,
                    to: changeGroup.to
                },
                count: changeGroup.replacements,
                samples: previewChanges,
                hasMore: changeGroup.changes.length > 5
            });
        }

        return preview;
    }

    /**
     * 処理統計のリセット
     */
    resetStats() {
        this.stats = {
            totalReplacements: 0,
            totalFiles: 0,
            processedFiles: 0,
            modifiedFiles: 0,
            errors: 0,
            startTime: null,
            endTime: null
        };
        console.log('📊 処理統計をリセットしました');
    }

    /**
     * 現在の統計情報を取得
     * @returns {Object} 統計情報
     */
    getStats() {
        return {
            ...this.stats,
            isProcessing: this.stats.startTime && !this.stats.endTime,
            duration: this.stats.endTime ? 
                this.stats.endTime - this.stats.startTime : 
                (this.stats.startTime ? Date.now() - this.stats.startTime : 0)
        };
    }

    /**
     * 正規表現特殊文字のエスケープ
     * @param {string} string エスケープする文字列
     * @returns {string} エスケープ済み文字列
     * @private
     */
    _escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 指定位置の行番号を取得
     * @param {string} content 文字列
     * @param {number} index 位置
     * @returns {number} 行番号（1ベース）
     * @private
     */
    _getLineNumber(content, index) {
        const lines = content.substring(0, index).split('\n');
        return lines.length;
    }

    /**
     * 指定位置の列番号を取得
     * @param {string} content 文字列
     * @param {number} index 位置
     * @returns {number} 列番号（1ベース）
     * @private
     */
    _getColumnNumber(content, index) {
        const lines = content.substring(0, index).split('\n');
        const lastLine = lines[lines.length - 1];
        return lastLine.length + 1;
    }

    /**
     * 大文字小文字を保持した置換（将来実装用）
     * @param {string} original 元の文字列
     * @param {string} replacement 置換文字列
     * @returns {string} 大文字小文字を保持した置換文字列
     * @private
     */
    _preserveCaseReplacement(original, replacement) {
        // 全て大文字の場合
        if (original === original.toUpperCase()) {
            return replacement.toUpperCase();
        }
        
        // 最初が大文字の場合（タイトルケース）
        if (original[0] === original[0].toUpperCase()) {
            return replacement[0].toUpperCase() + replacement.slice(1).toLowerCase();
        }
        
        // それ以外は小文字
        return replacement.toLowerCase();
    }
}

module.exports = ReplacementProcessor;