/**
 * 開発サーバースクリプト
 * ホットリロード機能付きElectron開発環境
 */

const { spawn } = require('child_process');
const { watch } = require('fs');
const path = require('path');
const chalk = require('chalk');

class DevServer {
    constructor() {
        this.electronProcess = null;
        this.watchers = [];
        this.isRestarting = false;
        this.restartDelay = 1000; // 1秒のデバウンス
        this.restartTimer = null;
        
        // 監視対象ディレクトリ
        this.watchPaths = [
            path.resolve(__dirname, '../src/main'),
            path.resolve(__dirname, '../src/preload'),
            path.resolve(__dirname, '../src/renderer')
        ];
        
        // 除外パターン
        this.excludePatterns = [
            /node_modules/,
            /\.git/,
            /dist/,
            /debug/,
            /\.log$/,
            /\.tmp$/
        ];
        
        this.setupSignalHandlers();
    }
    
    // 開発サーバーの開始
    async start() {
        console.log(chalk.blue('🚀 Starting Multi Grep Replacer development server...'));
        
        try {
            // 環境変数の設定
            process.env.NODE_ENV = 'development';
            process.env.ELECTRON_IS_DEV = '1';
            
            // Electronプロセスの開始
            await this.startElectron();
            
            // ファイル監視の開始
            this.startWatching();
            
            console.log(chalk.green('✅ Development server started successfully'));
            console.log(chalk.yellow('👀 Watching for file changes...'));
            console.log(chalk.gray('Press Ctrl+C to stop the development server'));
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to start development server:'), error);
            process.exit(1);
        }
    }
    
    // Electronプロセスの開始
    startElectron() {
        return new Promise((resolve, reject) => {
            console.log(chalk.blue('📱 Starting Electron process...'));
            
            const electronPath = require('electron');
            const mainScript = path.resolve(__dirname, '../src/main/main.js');
            
            this.electronProcess = spawn(electronPath, [mainScript], {
                stdio: 'inherit',
                env: {
                    ...process.env,
                    NODE_ENV: 'development',
                    ELECTRON_IS_DEV: '1'
                }
            });
            
            this.electronProcess.on('close', (code) => {
                if (code !== null && code !== 0 && !this.isRestarting) {
                    console.log(chalk.red(`❌ Electron process exited with code ${code}`));
                    reject(new Error(`Electron exited with code ${code}`));
                }
            });
            
            this.electronProcess.on('error', (error) => {
                console.error(chalk.red('❌ Electron process error:'), error);
                reject(error);
            });
            
            // プロセス開始の確認（簡易的にタイムアウトで判定）
            setTimeout(() => {
                if (this.electronProcess && !this.electronProcess.killed) {
                    console.log(chalk.green('✅ Electron process started'));
                    resolve();
                } else {
                    reject(new Error('Electron process failed to start'));
                }
            }, 2000);
        });
    }
    
    // ファイル監視の開始
    startWatching() {
        console.log(chalk.blue('👀 Starting file watchers...'));
        
        this.watchPaths.forEach(watchPath => {
            if (this.pathExists(watchPath)) {
                this.setupWatcher(watchPath);
            } else {
                console.warn(chalk.yellow(`⚠️  Watch path does not exist: ${watchPath}`));
            }
        });
    }
    
    // 個別ディレクトリの監視設定
    setupWatcher(watchPath) {
        try {
            const watcher = watch(watchPath, { recursive: true }, (eventType, filename) => {
                if (filename && this.shouldRestart(filename, watchPath)) {
                    const fullPath = path.join(watchPath, filename);
                    console.log(chalk.cyan(`📁 File changed: ${path.relative(process.cwd(), fullPath)}`));
                    this.scheduleRestart();
                }
            });
            
            this.watchers.push(watcher);
            console.log(chalk.gray(`   📂 Watching: ${path.relative(process.cwd(), watchPath)}`));
            
        } catch (error) {
            console.error(chalk.red(`❌ Failed to watch ${watchPath}:`), error);
        }
    }
    
    // ファイル変更時の再起動判定
    shouldRestart(filename, basePath) {
        const fullPath = path.join(basePath, filename);
        
        // 除外パターンのチェック
        if (this.excludePatterns.some(pattern => pattern.test(fullPath))) {
            return false;
        }
        
        // ファイル拡張子のチェック
        const ext = path.extname(filename).toLowerCase();
        const watchExtensions = ['.js', '.html', '.css', '.json'];
        
        return watchExtensions.includes(ext);
    }
    
    // 再起動のスケジューリング（デバウンス）
    scheduleRestart() {
        if (this.isRestarting) {
            return;
        }
        
        // 既存のタイマーをクリア
        if (this.restartTimer) {
            clearTimeout(this.restartTimer);
        }
        
        // 遅延実行で再起動
        this.restartTimer = setTimeout(() => {
            this.restartElectron();
        }, this.restartDelay);
    }
    
    // Electronプロセスの再起動
    async restartElectron() {
        if (this.isRestarting) {
            return;
        }
        
        this.isRestarting = true;
        console.log(chalk.yellow('🔄 Restarting Electron process...'));
        
        try {
            // 既存プロセスの終了
            if (this.electronProcess && !this.electronProcess.killed) {
                this.electronProcess.kill();
                
                // プロセス終了を待機
                await this.waitForProcessExit();
            }
            
            // 新しいプロセスの開始
            await this.startElectron();
            
            console.log(chalk.green('✅ Electron process restarted successfully'));
            
        } catch (error) {
            console.error(chalk.red('❌ Failed to restart Electron:'), error);
        } finally {
            this.isRestarting = false;
        }
    }
    
    // プロセス終了の待機
    waitForProcessExit() {
        return new Promise((resolve) => {
            if (!this.electronProcess || this.electronProcess.killed) {
                resolve();
                return;
            }
            
            const checkProcess = () => {
                if (this.electronProcess.killed) {
                    resolve();
                } else {
                    setTimeout(checkProcess, 100);
                }
            };
            
            // 強制終了のタイムアウト
            setTimeout(() => {
                if (!this.electronProcess.killed) {
                    console.log(chalk.yellow('⚠️  Force killing Electron process...'));
                    this.electronProcess.kill('SIGKILL');
                }
                resolve();
            }, 5000);
            
            checkProcess();
        });
    }
    
    // 開発サーバーの停止
    async stop() {
        console.log(chalk.yellow('🛑 Stopping development server...'));
        
        // ファイル監視の停止
        this.watchers.forEach(watcher => {
            try {
                watcher.close();
            } catch (error) {
                console.error('Failed to close watcher:', error);
            }
        });
        this.watchers = [];
        
        // Electronプロセスの終了
        if (this.electronProcess && !this.electronProcess.killed) {
            this.electronProcess.kill();
            await this.waitForProcessExit();
        }
        
        console.log(chalk.green('✅ Development server stopped'));
    }
    
    // シグナルハンドラーの設定
    setupSignalHandlers() {
        const handleExit = async (signal) => {
            console.log(chalk.yellow(`\n📡 Received ${signal}, shutting down gracefully...`));
            await this.stop();
            process.exit(0);
        };
        
        process.on('SIGTERM', handleExit);
        process.on('SIGINT', handleExit);
        process.on('SIGUSR1', handleExit);
        process.on('SIGUSR2', handleExit);
        
        // 未処理の例外/Promise拒否のハンドリング
        process.on('uncaughtException', (error) => {
            console.error(chalk.red('❌ Uncaught Exception:'), error);
            this.stop().then(() => process.exit(1));
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
            this.stop().then(() => process.exit(1));
        });
    }
    
    // ユーティリティメソッド
    pathExists(filePath) {
        try {
            require('fs').accessSync(filePath);
            return true;
        } catch {
            return false;
        }
    }
}

// スクリプトの直接実行時
if (require.main === module) {
    const devServer = new DevServer();
    devServer.start().catch(error => {
        console.error(chalk.red('❌ Development server startup failed:'), error);
        process.exit(1);
    });
}

module.exports = DevServer;

console.log('✅ Development server script loaded');