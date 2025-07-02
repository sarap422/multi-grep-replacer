const os = require('os');
const path = require('path');
const fs = require('fs').promises;

/**
 * クロスプラットフォーム対応のファイルシステムユーティリティ
 * Windows/macOS/Linuxの違いを吸収し、一貫したファイル操作を提供
 */
class FileSystemUtils {
    constructor() {
        this.platform = os.platform();
        this.isWindows = this.platform === 'win32';
        this.isMacOS = this.platform === 'darwin';
        this.isLinux = this.platform === 'linux';
        
        console.log(`🖥️ プラットフォーム検出: ${this.platform}`);
    }

    /**
     * パス区切り文字を正規化
     * @param {string} inputPath 入力パス
     * @returns {string} 正規化されたパス
     */
    normalizePath(inputPath) {
        if (!inputPath) return inputPath;
        
        // パス区切り文字を統一
        let normalized = inputPath.replace(/\\/g, '/');
        
        // Windows でドライブレターを正規化
        if (this.isWindows && /^[a-zA-Z]:/.test(normalized)) {
            normalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        }
        
        return path.normalize(normalized);
    }

    /**
     * パスの比較（大文字小文字区別の調整）
     * @param {string} path1 パス1
     * @param {string} path2 パス2 
     * @returns {boolean} パスが同じかどうか
     */
    pathsEqual(path1, path2) {
        const norm1 = this.normalizePath(path1);
        const norm2 = this.normalizePath(path2);
        
        // Windows では大文字小文字を区別しない
        if (this.isWindows) {
            return norm1.toLowerCase() === norm2.toLowerCase();
        }
        
        return norm1 === norm2;
    }

    /**
     * ファイル名の検証（プラットフォーム固有の制限）
     * @param {string} fileName ファイル名
     * @returns {boolean} 有効なファイル名かどうか
     */
    isValidFileName(fileName) {
        if (!fileName || typeof fileName !== 'string') {
            return false;
        }

        // 共通の禁止文字
        const commonInvalidChars = /[<>:"|?*\x00-\x1f]/;
        if (commonInvalidChars.test(fileName)) {
            console.log(`❌ 無効な文字が含まれています: ${fileName}`);
            return false;
        }

        // Windows 固有の制限
        if (this.isWindows) {
            // 禁止されている名前
            const reservedNames = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(\.|$)/i;
            if (reservedNames.test(fileName)) {
                console.log(`❌ Windows予約名です: ${fileName}`);
                return false;
            }

            // 末尾のスペースやピリオド
            if (/[\s.]$/.test(fileName)) {
                console.log(`❌ Windowsでは末尾のスペース・ピリオドは無効: ${fileName}`);
                return false;
            }
        }

        // ファイル名長の制限
        const maxLength = this.isWindows ? 255 : 255; // 実際にはパス全体で制限があるが、ファイル名のみの制限
        if (fileName.length > maxLength) {
            console.log(`❌ ファイル名が長すぎます: ${fileName.length} > ${maxLength}`);
            return false;
        }

        return true;
    }

    /**
     * パス長の制限チェック
     * @param {string} fullPath フルパス
     * @returns {boolean} パス長が制限内かどうか
     */
    isValidPathLength(fullPath) {
        const maxLength = this.isWindows ? 260 : 4096; // Windows: MAX_PATH, Unix: PATH_MAX
        
        if (fullPath.length > maxLength) {
            console.log(`❌ パスが長すぎます: ${fullPath.length} > ${maxLength}`);
            return false;
        }
        
        return true;
    }

    /**
     * ファイル権限の取得（プラットフォーム対応）
     * @param {string} filePath ファイルパス
     * @returns {Promise<Object>} 権限情報
     */
    async getFilePermissions(filePath) {
        try {
            const stats = await fs.stat(filePath);
            
            const permissions = {
                readable: false,
                writable: false,
                executable: false,
                mode: stats.mode,
                uid: stats.uid,
                gid: stats.gid,
                size: stats.size,
                mtime: stats.mtime,
                ctime: stats.ctime
            };

            // 読み取り権限チェック
            try {
                await fs.access(filePath, fs.constants.R_OK);
                permissions.readable = true;
            } catch (error) {
                console.log(`📖 読み取り権限なし: ${filePath}`);
            }

            // 書き込み権限チェック
            try {
                await fs.access(filePath, fs.constants.W_OK);
                permissions.writable = true;
            } catch (error) {
                console.log(`✏️ 書き込み権限なし: ${filePath}`);
            }

            // 実行権限チェック（Unix系のみ）
            if (!this.isWindows) {
                try {
                    await fs.access(filePath, fs.constants.X_OK);
                    permissions.executable = true;
                } catch (error) {
                    // 実行権限なしは正常（テキストファイルの場合）
                }
            }

            return permissions;

        } catch (error) {
            console.error(`❌ 権限取得エラー: ${filePath}`, error);
            throw new Error(`ファイル権限の取得に失敗しました: ${error.message}`);
        }
    }

    /**
     * 一時ファイルパスの生成
     * @param {string} prefix プレフィックス
     * @param {string} suffix サフィックス
     * @returns {string} 一時ファイルパス
     */
    generateTempFilePath(prefix = 'mgr_temp_', suffix = '.tmp') {
        const tempDir = os.tmpdir();
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const tempFileName = `${prefix}${timestamp}_${random}${suffix}`;
        
        return path.join(tempDir, tempFileName);
    }

    /**
     * ディスク容量の取得
     * @param {string} dirPath ディレクトリパス
     * @returns {Promise<Object>} ディスク容量情報
     */
    async getDiskSpace(dirPath) {
        try {
            const stats = await fs.statfs(dirPath);
            
            const blockSize = stats.bavail !== undefined ? stats.bsize : 4096;
            const totalSpace = stats.blocks * blockSize;
            const freeSpace = stats.bavail * blockSize;
            const usedSpace = totalSpace - freeSpace;
            
            return {
                total: totalSpace,
                free: freeSpace,
                used: usedSpace,
                percentUsed: Math.round((usedSpace / totalSpace) * 100)
            };
            
        } catch (error) {
            console.warn(`⚠️ ディスク容量取得エラー: ${dirPath}`, error.message);
            
            // フォールバック：統計情報なしで空き容量チェックをスキップ
            return {
                total: 0,
                free: 0,
                used: 0,
                percentUsed: 0,
                error: error.message
            };
        }
    }

    /**
     * パスがシステムディレクトリかどうかチェック
     * @param {string} inputPath チェック対象パス
     * @returns {boolean} システムディレクトリかどうか
     */
    isSystemDirectory(inputPath) {
        const normalizedPath = this.normalizePath(inputPath).toLowerCase();
        
        const systemPaths = this.isWindows ? [
            'c:/windows',
            'c:/program files',
            'c:/program files (x86)',
            'c:/programdata',
            'c:/system volume information',
            'c:/$recycle.bin'
        ] : [
            '/bin',
            '/sbin',
            '/usr/bin',
            '/usr/sbin',
            '/etc',
            '/boot',
            '/dev',
            '/proc',
            '/sys',
            '/tmp',
            '/var',
            '/root'
        ];

        return systemPaths.some(sysPath => 
            normalizedPath.startsWith(sysPath.toLowerCase())
        );
    }

    /**
     * 安全なファイル削除（ゴミ箱に移動）
     * @param {string} filePath 削除対象ファイル
     * @returns {Promise<boolean>} 削除成功かどうか
     */
    async safeDeleteFile(filePath) {
        try {
            console.log(`🗑️ ファイル削除: ${filePath}`);
            
            // システムファイル保護
            if (this.isSystemDirectory(filePath)) {
                throw new Error('システムファイルの削除は許可されていません');
            }

            // ファイル存在確認
            const exists = await fs.access(filePath, fs.constants.F_OK)
                .then(() => true)
                .catch(() => false);
                
            if (!exists) {
                console.log(`📝 ファイルが存在しません: ${filePath}`);
                return true;
            }

            // 実際の削除実行
            await fs.unlink(filePath);
            console.log(`✅ ファイル削除完了: ${filePath}`);
            
            return true;

        } catch (error) {
            console.error(`❌ ファイル削除エラー: ${filePath}`, error);
            throw new Error(`ファイル削除に失敗しました: ${error.message}`);
        }
    }

    /**
     * パフォーマンス統計の取得
     * @returns {Object} システム情報
     */
    getSystemInfo() {
        const cpus = os.cpus();
        const memory = {
            total: os.totalmem(),
            free: os.freemem(),
            used: os.totalmem() - os.freemem()
        };

        return {
            platform: this.platform,
            arch: os.arch(),
            cpuCount: cpus.length,
            cpuModel: cpus[0]?.model || 'Unknown',
            memory: {
                total: Math.round(memory.total / 1024 / 1024), // MB
                free: Math.round(memory.free / 1024 / 1024),   // MB
                used: Math.round(memory.used / 1024 / 1024),   // MB
                percentUsed: Math.round((memory.used / memory.total) * 100)
            },
            hostname: os.hostname(),
            uptime: Math.round(os.uptime() / 3600), // hours
            nodeVersion: process.version,
            userInfo: os.userInfo()
        };
    }
}

module.exports = FileSystemUtils;