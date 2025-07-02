const fs = require('fs');
const path = require('path');
const { Transform, pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

/**
 * 大容量ファイル用Streamプロセッサ
 * メモリ効率的なファイル処理でUI応答性を維持
 */
class StreamProcessor {
    constructor(options = {}) {
        this.options = {
            chunkSize: options.chunkSize || 64 * 1024, // 64KB chunks
            encoding: options.encoding || 'utf8',
            preserveLineBreaks: options.preserveLineBreaks !== false,
            maxFileSize: options.maxFileSize || 100 * 1024 * 1024, // 100MB
            progressCallback: options.progressCallback || null,
            enableBackup: options.enableBackup || false,
            ...options
        };

        this.stats = {
            totalBytesProcessed: 0,
            chunksProcessed: 0,
            replacementsMade: 0,
            processingTime: 0
        };

        console.log('🌊 Streamプロセッサ初期化完了');
    }

    /**
     * 大容量ファイルの置換処理（Stream版）
     * @param {string} filePath ファイルパス
     * @param {Array} replacementRules 置換ルール配列
     * @returns {Promise<Object>} 処理結果
     */
    async processLargeFile(filePath, replacementRules) {
        const startTime = performance.now();
        
        try {
            console.log(`🌊 大容量ファイル処理開始: ${filePath}`);
            
            // ファイルサイズチェック
            const stats = await fs.promises.stat(filePath);
            if (stats.size > this.options.maxFileSize) {
                throw new Error(`ファイルサイズが制限を超えています: ${Math.round(stats.size / 1024 / 1024)}MB > ${Math.round(this.options.maxFileSize / 1024 / 1024)}MB`);
            }

            // バックアップ作成（オプション）
            let backupPath = null;
            if (this.options.enableBackup) {
                backupPath = await this._createBackup(filePath);
            }

            // 一時ファイルパス
            const tempPath = `${filePath}.tmp.${Date.now()}`;
            
            // Stream処理実行
            const result = await this._streamReplace(filePath, tempPath, replacementRules);
            
            // 元ファイルを置換
            await this._replaceOriginalFile(filePath, tempPath);
            
            const endTime = performance.now();
            this.stats.processingTime = endTime - startTime;
            
            console.log(`✅ 大容量ファイル処理完了: ${filePath} (${Math.round(this.stats.processingTime)}ms)`);
            
            return {
                filePath,
                backupPath,
                replacementsMade: result.replacementsMade,
                bytesProcessed: result.bytesProcessed,
                chunksProcessed: result.chunksProcessed,
                processingTime: this.stats.processingTime,
                fileSize: stats.size
            };

        } catch (error) {
            console.error(`❌ 大容量ファイル処理エラー: ${filePath}`, error);
            throw new Error(`大容量ファイル処理に失敗しました: ${error.message}`);
        }
    }

    /**
     * 複数の大容量ファイル一括処理
     * @param {string[]} filePaths ファイルパス配列
     * @param {Array} replacementRules 置換ルール配列
     * @param {Function} progressCallback 進捗コールバック
     * @returns {Promise<Array>} 処理結果配列
     */
    async processBatchLargeFiles(filePaths, replacementRules, progressCallback = null) {
        console.log(`🌊 大容量ファイル一括処理開始: ${filePaths.length}件`);
        
        const results = [];
        const startTime = performance.now();
        
        for (let i = 0; i < filePaths.length; i++) {
            const filePath = filePaths[i];
            
            try {
                const result = await this.processLargeFile(filePath, replacementRules);
                results.push(result);
                
                // 進捗通知
                if (progressCallback) {
                    progressCallback(i + 1, filePaths.length, filePath, result);
                }
                
                console.log(`🌊 進捗: ${i + 1}/${filePaths.length} (${Math.round(((i + 1) / filePaths.length) * 100)}%)`);
                
            } catch (error) {
                console.error(`❌ ファイル処理エラー: ${filePath}`, error);
                results.push({
                    filePath,
                    error: error.message,
                    success: false
                });
            }
        }
        
        const endTime = performance.now();
        const totalTime = endTime - startTime;
        
        console.log(`✅ 大容量ファイル一括処理完了: ${results.length}件 (${Math.round(totalTime)}ms)`);
        
        return {
            results,
            totalTime,
            successCount: results.filter(r => !r.error).length,
            errorCount: results.filter(r => r.error).length
        };
    }

    /**
     * Stream置換処理のメイン実装
     * @param {string} inputPath 入力ファイルパス
     * @param {string} outputPath 出力ファイルパス
     * @param {Array} replacementRules 置換ルール配列
     * @returns {Promise<Object>} 処理結果
     * @private
     */
    async _streamReplace(inputPath, outputPath, replacementRules) {
        return new Promise((resolve, reject) => {
            let bytesProcessed = 0;
            let chunksProcessed = 0;
            let replacementsMade = 0;
            let buffer = '';

            const readStream = fs.createReadStream(inputPath, {
                encoding: this.options.encoding,
                highWaterMark: this.options.chunkSize
            });

            const writeStream = fs.createWriteStream(outputPath, {
                encoding: this.options.encoding
            });

            const transformStream = new Transform({
                objectMode: false,
                transform: (chunk, encoding, callback) => {
                    try {
                        bytesProcessed += chunk.length;
                        chunksProcessed++;

                        // バッファに追加
                        buffer += chunk.toString();

                        // 行区切りでの処理（行を分割しないように）
                        let processedData = '';
                        
                        if (this.options.preserveLineBreaks) {
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || ''; // 最後の不完全な行を保持
                            
                            for (const line of lines) {
                                const { processedLine, replacements } = this._applyReplacements(line, replacementRules);
                                processedData += processedLine + '\n';
                                replacementsMade += replacements;
                            }
                        } else {
                            // 行を考慮しない一括処理
                            const { processedLine, replacements } = this._applyReplacements(buffer, replacementRules);
                            processedData = processedLine;
                            replacementsMade += replacements;
                            buffer = '';
                        }

                        // 進捗通知
                        if (this.options.progressCallback && chunksProcessed % 100 === 0) {
                            this.options.progressCallback({
                                bytesProcessed,
                                chunksProcessed,
                                replacementsMade
                            });
                        }

                        callback(null, processedData);

                    } catch (error) {
                        callback(error);
                    }
                }
            });

            // Stream pipeline実行
            pipelineAsync(readStream, transformStream, writeStream)
                .then(() => {
                    // 残ったバッファを処理
                    if (buffer.length > 0) {
                        const { processedLine, replacements } = this._applyReplacements(buffer, replacementRules);
                        replacementsMade += replacements;
                        
                        // 最後のバッファを書き込み
                        writeStream.write(processedLine);
                    }
                    
                    resolve({
                        bytesProcessed,
                        chunksProcessed,
                        replacementsMade
                    });
                })
                .catch(reject);
        });
    }

    /**
     * 文字列に置換ルールを適用
     * @param {string} text 対象文字列
     * @param {Array} replacementRules 置換ルール配列
     * @returns {Object} 処理結果
     * @private
     */
    _applyReplacements(text, replacementRules) {
        let processedText = text;
        let totalReplacements = 0;

        for (const rule of replacementRules) {
            if (!rule.enabled) continue;

            const { from, to, caseSensitive = true, wholeWord = false } = rule;
            
            try {
                let searchPattern;
                
                if (wholeWord) {
                    // 単語境界を考慮した置換
                    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    searchPattern = new RegExp(`\\b${escapedFrom}\\b`, caseSensitive ? 'g' : 'gi');
                } else {
                    // 通常の文字列置換
                    const escapedFrom = from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    searchPattern = new RegExp(escapedFrom, caseSensitive ? 'g' : 'gi');
                }

                // 置換実行と回数カウント
                const beforeReplace = processedText;
                processedText = processedText.replace(searchPattern, to);
                
                // 置換回数計算
                const matches = beforeReplace.match(searchPattern);
                const replacements = matches ? matches.length : 0;
                totalReplacements += replacements;

                if (replacements > 0) {
                    console.log(`🔄 置換実行: "${from}" → "${to}" (${replacements}箇所)`);
                }

            } catch (error) {
                console.warn(`⚠️ 置換ルール処理エラー: ${from} → ${to}`, error.message);
            }
        }

        return {
            processedLine: processedText,
            replacements: totalReplacements
        };
    }

    /**
     * ファイルのバックアップを作成
     * @param {string} filePath 元ファイルパス
     * @returns {Promise<string>} バックアップファイルパス
     * @private
     */
    async _createBackup(filePath) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${filePath}.backup.${timestamp}`;
        
        try {
            await fs.promises.copyFile(filePath, backupPath);
            console.log(`💾 バックアップ作成: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.warn(`⚠️ バックアップ作成失敗: ${filePath}`, error.message);
            return null;
        }
    }

    /**
     * 元ファイルを一時ファイルで置換
     * @param {string} originalPath 元ファイルパス
     * @param {string} tempPath 一時ファイルパス
     * @returns {Promise<void>}
     * @private
     */
    async _replaceOriginalFile(originalPath, tempPath) {
        try {
            // 元ファイルの権限を取得
            const originalStats = await fs.promises.stat(originalPath);
            
            // 一時ファイルを元ファイルに移動
            await fs.promises.rename(tempPath, originalPath);
            
            // 権限を復元
            await fs.promises.chmod(originalPath, originalStats.mode);
            
            console.log(`🔄 ファイル置換完了: ${originalPath}`);
            
        } catch (error) {
            // 移動に失敗した場合、コピー + 削除で代替
            try {
                await fs.promises.copyFile(tempPath, originalPath);
                await fs.promises.unlink(tempPath);
                console.log(`🔄 ファイル置換完了（コピー方式）: ${originalPath}`);
            } catch (copyError) {
                console.error(`❌ ファイル置換失敗: ${originalPath}`, copyError);
                throw new Error(`ファイル置換に失敗しました: ${copyError.message}`);
            }
        }
    }

    /**
     * 処理統計をリセット
     */
    resetStats() {
        this.stats = {
            totalBytesProcessed: 0,
            chunksProcessed: 0,
            replacementsMade: 0,
            processingTime: 0
        };
        
        console.log('🌊 Streamプロセッサ統計リセット');
    }

    /**
     * 現在の処理統計を取得
     * @returns {Object} 統計情報
     */
    getStats() {
        return {
            ...this.stats,
            chunkSize: this.options.chunkSize,
            encoding: this.options.encoding,
            maxFileSize: Math.round(this.options.maxFileSize / 1024 / 1024) // MB
        };
    }

    /**
     * Stream処理に適したファイルかどうか判定
     * @param {string} filePath ファイルパス
     * @param {number} sizeThreshold サイズ閾値（バイト）
     * @returns {Promise<boolean>} Stream処理推奨かどうか
     */
    async shouldUseStreamProcessing(filePath, sizeThreshold = 10 * 1024 * 1024) { // 10MB
        try {
            const stats = await fs.promises.stat(filePath);
            const shouldUse = stats.size > sizeThreshold;
            
            if (shouldUse) {
                console.log(`🌊 Stream処理推奨: ${filePath} (${Math.round(stats.size / 1024 / 1024)}MB)`);
            }
            
            return shouldUse;
            
        } catch (error) {
            console.warn(`⚠️ ファイルサイズ取得エラー: ${filePath}`, error.message);
            return false;
        }
    }

    /**
     * メモリ効率的なファイル内容プレビュー
     * @param {string} filePath ファイルパス
     * @param {number} maxLines 最大行数
     * @returns {Promise<Object>} プレビュー情報
     */
    async previewLargeFile(filePath, maxLines = 100) {
        try {
            console.log(`👁️ 大容量ファイルプレビュー: ${filePath}`);
            
            const lines = [];
            let lineCount = 0;
            let totalBytes = 0;
            
            const readStream = fs.createReadStream(filePath, {
                encoding: this.options.encoding,
                highWaterMark: this.options.chunkSize
            });
            
            let buffer = '';
            
            for await (const chunk of readStream) {
                buffer += chunk;
                totalBytes += chunk.length;
                
                const newLines = buffer.split('\n');
                buffer = newLines.pop() || '';
                
                for (const line of newLines) {
                    lines.push(line);
                    lineCount++;
                    
                    if (lineCount >= maxLines) {
                        readStream.destroy();
                        break;
                    }
                }
                
                if (lineCount >= maxLines) break;
            }
            
            // 残ったバッファも追加
            if (buffer && lineCount < maxLines) {
                lines.push(buffer);
                lineCount++;
            }
            
            const stats = await fs.promises.stat(filePath);
            
            return {
                filePath,
                totalFileSize: stats.size,
                previewBytes: totalBytes,
                totalLines: lineCount,
                lines: lines.slice(0, maxLines),
                truncated: lineCount >= maxLines || totalBytes < stats.size
            };
            
        } catch (error) {
            console.error(`❌ ファイルプレビューエラー: ${filePath}`, error);
            throw new Error(`ファイルプレビューに失敗しました: ${error.message}`);
        }
    }
}

module.exports = StreamProcessor;