/**
 * ログシステム実装
 * アプリケーションの包括的なログ管理
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class Logger {
    constructor() {
        this.logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';
        this.logDirectory = path.join(app.getPath('userData'), 'debug', 'logs');
        this.maxLogFiles = 5;
        this.maxLogSize = 10 * 1024 * 1024; // 10MB
        this.isInitialized = false;
        
        // ログレベル定義
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        // 現在のログファイルパス
        this.currentLogFile = path.join(this.logDirectory, 'app.log');
        
        this.initialize();
    }
    
    async initialize() {
        try {
            // ログディレクトリの作成
            await fs.mkdir(this.logDirectory, { recursive: true });
            
            // 古いログファイルのクリーンアップ
            await this.cleanupOldLogs();
            
            this.isInitialized = true;
            this.info('Logger initialized successfully');
        } catch (error) {
            console.error('Logger initialization failed:', error);
        }
    }
    
    // ログレベルの設定
    setLogLevel(level) {
        if (level in this.levels) {
            this.logLevel = level;
            this.info(`Log level set to: ${level}`);
        } else {
            this.warn(`Invalid log level: ${level}`);
        }
    }
    
    // デバッグログ
    debug(message, extra = null) {
        this.log('debug', message, extra);
    }
    
    // 情報ログ
    info(message, extra = null) {
        this.log('info', message, extra);
    }
    
    // 警告ログ
    warn(message, extra = null) {
        this.log('warn', message, extra);
    }
    
    // エラーログ
    error(message, extra = null) {
        this.log('error', message, extra);
    }
    
    // メインログメソッド
    async log(level, message, extra = null) {
        // ログレベルチェック
        if (this.levels[level] < this.levels[this.logLevel]) {
            return;
        }
        
        // ログエントリの作成
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            extra
        };
        
        // コンソール出力（開発環境）
        if (process.env.NODE_ENV === 'development') {
            this.outputToConsole(logEntry);
        }
        
        // ファイル出力
        if (this.isInitialized) {
            await this.outputToFile(logEntry);
        }
    }
    
    // コンソール出力
    outputToConsole(logEntry) {
        const { timestamp, level, message, extra } = logEntry;
        const formattedTime = new Date(timestamp).toLocaleTimeString('ja-JP');
        const logMessage = `[${formattedTime}] ${level}: ${message}`;
        
        switch (level) {
            case 'DEBUG':
                console.debug(logMessage, extra || '');
                break;
            case 'INFO':
                console.info(logMessage, extra || '');
                break;
            case 'WARN':
                console.warn(logMessage, extra || '');
                break;
            case 'ERROR':
                console.error(logMessage, extra || '');
                break;
        }
    }
    
    // ファイル出力
    async outputToFile(logEntry) {
        try {
            // ログローテーションの確認
            await this.checkLogRotation();
            
            // ログエントリの整形
            const formattedEntry = this.formatLogEntry(logEntry);
            
            // ファイルに書き込み
            await fs.appendFile(this.currentLogFile, formattedEntry + '\n', 'utf8');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    
    // ログエントリの整形
    formatLogEntry(logEntry) {
        const { timestamp, level, message, extra } = logEntry;
        let formatted = `${timestamp} [${level}] ${message}`;
        
        if (extra) {
            if (typeof extra === 'object') {
                formatted += ` | Extra: ${JSON.stringify(extra)}`;
            } else {
                formatted += ` | Extra: ${extra}`;
            }
        }
        
        return formatted;
    }
    
    // ログローテーションの確認
    async checkLogRotation() {
        try {
            const stats = await fs.stat(this.currentLogFile);
            
            // ファイルサイズが上限を超えた場合にローテーション
            if (stats.size > this.maxLogSize) {
                await this.rotateLogFile();
            }
        } catch (error) {
            // ファイルが存在しない場合は何もしない
            if (error.code !== 'ENOENT') {
                console.error('Failed to check log file size:', error);
            }
        }
    }
    
    // ログファイルのローテーション
    async rotateLogFile() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const rotatedName = `app-${timestamp}.log`;
            const rotatedPath = path.join(this.logDirectory, rotatedName);
            
            // 現在のログファイルをリネーム
            await fs.rename(this.currentLogFile, rotatedPath);
            
            this.info(`Log file rotated to: ${rotatedName}`);
            
            // 古いログファイルのクリーンアップ
            await this.cleanupOldLogs();
        } catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }
    
    // 古いログファイルのクリーンアップ
    async cleanupOldLogs() {
        try {
            const files = await fs.readdir(this.logDirectory);
            const logFiles = files
                .filter(file => file.startsWith('app-') && file.endsWith('.log'))
                .map(file => ({
                    name: file,
                    path: path.join(this.logDirectory, file),
                    timestamp: file.match(/app-(.+)\.log/)?.[1] || ''
                }))
                .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            
            // 最大ファイル数を超えた場合に古いファイルを削除
            if (logFiles.length > this.maxLogFiles) {
                const filesToDelete = logFiles.slice(this.maxLogFiles);
                for (const file of filesToDelete) {
                    await fs.unlink(file.path);
                    console.log(`Deleted old log file: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }
    
    // アプリケーション固有のログメソッド
    
    // ファイル操作ログ
    logFileOperation(operation, filePath, success = true, error = null) {
        const extra = {
            operation,
            filePath,
            success
        };
        
        if (error) {
            extra.error = error.message;
            this.error(`File operation failed: ${operation}`, extra);
        } else {
            this.info(`File operation: ${operation}`, extra);
        }
    }
    
    // 置換処理ログ
    logReplacement(filePath, rules, changes) {
        const extra = {
            filePath,
            rulesApplied: rules.length,
            changesCount: changes
        };
        
        this.info(`Replacement completed`, extra);
    }
    
    // パフォーマンスログ
    logPerformance(operation, duration, details = null) {
        const extra = {
            operation,
            duration: `${duration}ms`,
            details
        };
        
        if (duration > 1000) {
            this.warn(`Slow operation detected`, extra);
        } else {
            this.debug(`Performance log`, extra);
        }
    }
    
    // セキュリティログ
    logSecurity(event, details) {
        const extra = {
            event,
            details,
            userAgent: process.env.USER || 'unknown'
        };
        
        this.warn(`Security event: ${event}`, extra);
    }
    
    // エラー統計の取得
    async getErrorStats() {
        try {
            const content = await fs.readFile(this.currentLogFile, 'utf8');
            const lines = content.split('\n').filter(line => line.includes('[ERROR]'));
            
            const errors = lines.map(line => {
                const match = line.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z) \[ERROR\] (.+)/);
                return match ? {
                    timestamp: match[1],
                    message: match[2]
                } : null;
            }).filter(Boolean);
            
            return {
                totalErrors: errors.length,
                recentErrors: errors.slice(-10),
                lastError: errors[errors.length - 1] || null
            };
        } catch (error) {
            this.error('Failed to get error stats', { error: error.message });
            return { totalErrors: 0, recentErrors: [], lastError: null };
        }
    }
    
    // ログファイルのエクスポート
    async exportLogs(outputPath) {
        try {
            const files = await fs.readdir(this.logDirectory);
            const logFiles = files.filter(file => file.endsWith('.log'));
            
            let allLogs = '';
            for (const file of logFiles.sort()) {
                const content = await fs.readFile(path.join(this.logDirectory, file), 'utf8');
                allLogs += `\n=== ${file} ===\n${content}\n`;
            }
            
            await fs.writeFile(outputPath, allLogs, 'utf8');
            this.info(`Logs exported to: ${outputPath}`);
            
            return outputPath;
        } catch (error) {
            this.error('Failed to export logs', { error: error.message });
            throw error;
        }
    }
}

// シングルトンパターンでエクスポート
let loggerInstance = null;

function getLogger() {
    if (!loggerInstance) {
        loggerInstance = new Logger();
    }
    return loggerInstance;
}

module.exports = { Logger, getLogger };

console.log('✅ Logger module loaded');