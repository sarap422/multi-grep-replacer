// Electron app モック (must be at the top before any imports)
jest.mock('electron', () => ({
    app: {
        getPath: jest.fn().mockImplementation((name) => {
            if (name === 'userData') {
                return '/tmp/test-app-data';
            }
            return '/tmp/test-default';
        })
    }
}));

/**
 * Logger ユニットテスト
 * アプリケーションログシステムのテスト
 */

const path = require('path');
const fs = require('fs').promises;
const os = require('os');

// テスト対象クラス
const { Logger } = require('../../src/main/logger');

describe('Logger ユニットテスト', () => {
    let logger;
    let testLogDir;
    let testLogFile;

    beforeAll(async () => {
        // テスト用ログディレクトリ作成
        testLogDir = path.join(os.tmpdir(), `mgr_logger_test_${Date.now()}`);
        await fs.mkdir(testLogDir, { recursive: true });
        testLogFile = path.join(testLogDir, 'test.log');
    });

    afterAll(async () => {
        // テストディレクトリクリーンアップ
        try {
            await fs.rm(testLogDir, { recursive: true, force: true });
        } catch (error) {
            console.warn('Logger テストクリーンアップエラー:', error.message);
        }
    });

    beforeEach(() => {
        // 新しいLoggerインスタンス作成（テスト用設定）
        logger = new Logger();
        logger.logDirectory = testLogDir;
        logger.currentLogFile = testLogFile;
        logger.maxLogSize = 1024 * 1024; // 1MB
        logger.maxLogFiles = 5;
        logger.logLevel = 'debug';
        logger.isInitialized = true; // テスト用に強制初期化
    });

    afterEach(async () => {
        // テストログファイル削除
        try {
            await fs.unlink(testLogFile);
        } catch (error) {
            // ファイルが存在しない場合は無視
        }
    });

    describe('初期化・基本機能', () => {
        test('Logger が正常に初期化される', () => {
            expect(logger).toBeDefined();
            expect(logger.logLevel).toBe('debug');
            expect(logger.currentLogFile).toBe(testLogFile);
            expect(logger.isInitialized).toBe(true);
        });

        test('ログレベルの設定が正常に動作する', () => {
            const levels = ['debug', 'info', 'warn', 'error'];
            
            levels.forEach(level => {
                logger.setLogLevel(level);
                expect(logger.logLevel).toBe(level);
            });
        });

        test('無効なログレベルでエラーが発生する', () => {
            const originalLevel = logger.logLevel;
            logger.setLogLevel('invalid');
            // 無効なレベルの場合、ログレベルは変更されない
            expect(logger.logLevel).toBe(originalLevel);
        });

        test('ログレベル階層が正常に動作する', () => {
            logger.setLogLevel('warn');
            
            expect(logger.levels['debug'] >= logger.levels[logger.logLevel]).toBe(false);
            expect(logger.levels['info'] >= logger.levels[logger.logLevel]).toBe(false);
            expect(logger.levels['warn'] >= logger.levels[logger.logLevel]).toBe(true);
            expect(logger.levels['error'] >= logger.levels[logger.logLevel]).toBe(true);
        });
    });

    describe('基本ログ機能', () => {
        test('debug ログが正常に記録される', async () => {
            const message = 'Debug test message';
            
            await logger.debug(message);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            expect(logContent).toContain('DEBUG');
            expect(logContent).toContain(message);
        });

        test('info ログが正常に記録される', async () => {
            const message = 'Info test message';
            
            await logger.info(message);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            expect(logContent).toContain('INFO');
            expect(logContent).toContain(message);
        });

        test('warn ログが正常に記録される', async () => {
            const message = 'Warning test message';
            
            await logger.warn(message);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            expect(logContent).toContain('WARN');
            expect(logContent).toContain(message);
        });

        test('error ログが正常に記録される', async () => {
            const message = 'Error test message';
            const error = new Error('Test error');
            
            await logger.error(message, error);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            expect(logContent).toContain('ERROR');
            expect(logContent).toContain(message);
            expect(logContent).toContain('Test error');
        });

        test('オブジェクトデータが正常にJSONとして記録される', async () => {
            const data = {
                operation: 'test',
                result: 'success',
                count: 42
            };
            
            await logger.info('Test with data', data);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            expect(logContent).toContain('INFO');
            expect(logContent).toContain('Test with data');
            expect(logContent).toContain('"operation":"test"');
            expect(logContent).toContain('"count":42');
        });
    });

    describe('ログフォーマット', () => {
        test('ログエントリが正しい形式で出力される', async () => {
            await logger.info('Test message');
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            const lines = logContent.trim().split('\n');
            const logEntry = lines[0];
            
            // ISO形式のタイムスタンプが含まれる
            expect(logEntry).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
            
            // ログレベルが含まれる
            expect(logEntry).toContain('[INFO]');
            
            // プロセス情報が含まれる
            expect(logEntry).toContain('[MAIN]');
            
            // メッセージが含まれる
            expect(logEntry).toContain('Test message');
        });

        test('スタックトレースが適切にフォーマットされる', async () => {
            const error = new Error('Test stack trace');
            
            await logger.error('Error with stack', error);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            expect(logContent).toContain('Error: Test stack trace');
            expect(logContent).toContain('at ');
        });

        test('長いメッセージが適切に処理される', async () => {
            const longMessage = 'A'.repeat(10000);
            
            await logger.info(longMessage);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            expect(logContent).toContain(longMessage);
        });
    });

    describe('ログローテーション', () => {
        test('ファイルサイズ制限でローテーションが動作する', async () => {
            // 小さなファイルサイズ制限で設定
            logger.options.maxFileSize = 100; // 100バイト
            
            // ファイルサイズを超える大量のログを出力
            for (let i = 0; i < 50; i++) {
                await logger.info(`Log message ${i} with some additional content to make it longer`);
            }
            
            // ローテーションファイルが作成されることを確認
            const logDir = path.dirname(testLogFile);
            const files = await fs.readdir(logDir);
            const logFiles = files.filter(f => f.startsWith('test.log'));
            
            expect(logFiles.length).toBeGreaterThan(1);
        });

        test('最大ファイル数制限が動作する', async () => {
            logger.options.maxFileSize = 50; // 非常に小さなサイズ
            logger.options.maxFiles = 3;
            
            // 大量のログを出力してローテーションを発生させる
            for (let i = 0; i < 200; i++) {
                await logger.info(`Rotation test message ${i} with extra content to trigger rotation`);
            }
            
            const logDir = path.dirname(testLogFile);
            const files = await fs.readdir(logDir);
            const logFiles = files.filter(f => f.startsWith('test.log'));
            
            // 最大ファイル数以下であることを確認
            expect(logFiles.length).toBeLessThanOrEqual(3);
        });
    });

    describe('パフォーマンス・非同期処理', () => {
        test('大量ログ出力でのパフォーマンス', async () => {
            const messageCount = 1000;
            const startTime = performance.now();
            
            const promises = [];
            for (let i = 0; i < messageCount; i++) {
                promises.push(logger.info(`Performance test message ${i}`));
            }
            
            await Promise.all(promises);
            
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            const timePerMessage = totalTime / messageCount;
            
            // 1メッセージあたり5ms以下で処理
            expect(timePerMessage).toBeLessThan(5);
            
            // 全ログが記録されることを確認
            const logContent = await fs.readFile(testLogFile, 'utf8');
            const lineCount = logContent.split('\n').filter(line => line.trim()).length;
            expect(lineCount).toBe(messageCount);
        });

        test('並行ログ出力での競合状態なし', async () => {
            const concurrentWrites = 100;
            
            const promises = Array.from({ length: concurrentWrites }, (_, i) => 
                logger.info(`Concurrent message ${i}`)
            );
            
            await Promise.all(promises);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            const lines = logContent.split('\n').filter(line => line.trim());
            
            // 全ての並行書き込みが完了していることを確認
            expect(lines.length).toBe(concurrentWrites);
            
            // 各メッセージが1回ずつ記録されていることを確認
            for (let i = 0; i < concurrentWrites; i++) {
                const messageCount = lines.filter(line => 
                    line.includes(`Concurrent message ${i}`)
                ).length;
                expect(messageCount).toBe(1);
            }
        });
    });

    describe('エラーハンドリング', () => {
        test('書き込み権限なしディレクトリでのエラー処理', async () => {
            // 存在しないディレクトリへのログファイル
            const invalidLogFile = '/root/invalid/test.log';
            
            const invalidLogger = new Logger({
                logFile: invalidLogFile,
                enableConsole: false
            });
            
            // エラーが適切に処理され、アプリケーションがクラッシュしない
            await expect(invalidLogger.info('Test message')).resolves.not.toThrow();
            
            await invalidLogger.close();
        });

        test('ディスク容量不足シミュレーション', async () => {
            // 書き込みエラーをシミュレート
            const originalWriteFile = fs.writeFile;
            fs.writeFile = jest.fn().mockRejectedValue(new Error('No space left on device'));
            
            // エラーが適切に処理される
            await expect(logger.info('Test message')).resolves.not.toThrow();
            
            // 内部エラーカウンターが増加
            expect(logger.errorCount).toBeGreaterThan(0);
            
            // 元の関数に戻す
            fs.writeFile = originalWriteFile;
        });

        test('不正なデータタイプでのログ出力', async () => {
            const circularObject = {};
            circularObject.self = circularObject; // 循環参照
            
            // 循環参照オブジェクトでもエラーが発生しない
            await expect(logger.info('Test', circularObject)).resolves.not.toThrow();
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            expect(logContent).toContain('[Circular Reference]');
        });
    });

    describe('セキュリティ・機密情報', () => {
        test('機密情報のマスキング', async () => {
            const sensitiveData = {
                password: 'secret123',
                token: 'abc123token',
                apiKey: 'sk-1234567890',
                normal: 'regular data'
            };
            
            await logger.info('Login attempt', sensitiveData);
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            
            // 機密情報がマスキングされている
            expect(logContent).toContain('password":"[MASKED]"');
            expect(logContent).toContain('token":"[MASKED]"');
            expect(logContent).toContain('apiKey":"[MASKED]"');
            
            // 通常データは残る
            expect(logContent).toContain('regular data');
        });

        test('URLパラメータの機密情報マスキング', async () => {
            const url = 'https://api.example.com/data?token=secret123&password=mypass&name=user';
            
            await logger.info('API request', { url });
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            
            // URLの機密パラメータがマスキング
            expect(logContent).toContain('token=[MASKED]');
            expect(logContent).toContain('password=[MASKED]');
            expect(logContent).toContain('name=user'); // 通常パラメータは残る
        });
    });

    describe('統計・監視機能', () => {
        test('ログ統計の記録', async () => {
            await logger.debug('Debug message');
            await logger.info('Info message');
            await logger.warn('Warning message');
            await logger.error('Error message');
            
            const stats = logger.getStatistics();
            
            expect(stats.totalLogs).toBe(4);
            expect(stats.byLevel.debug).toBe(1);
            expect(stats.byLevel.info).toBe(1);
            expect(stats.byLevel.warn).toBe(1);
            expect(stats.byLevel.error).toBe(1);
        });

        test('パフォーマンス統計の記録', async () => {
            const messageCount = 100;
            
            for (let i = 0; i < messageCount; i++) {
                await logger.info(`Performance message ${i}`);
            }
            
            const stats = logger.getStatistics();
            
            expect(stats.totalLogs).toBe(messageCount);
            expect(stats.averageWriteTime).toBeGreaterThan(0);
            expect(stats.maxWriteTime).toBeGreaterThan(0);
        });

        test('エラー率の監視', async () => {
            // 正常ログ
            await logger.info('Normal message 1');
            await logger.info('Normal message 2');
            
            // エラーログ
            await logger.error('Error message 1');
            
            const stats = logger.getStatistics();
            const errorRate = stats.byLevel.error / stats.totalLogs;
            
            expect(errorRate).toBeCloseTo(0.33, 2); // 1/3 ≈ 0.33
        });
    });

    describe('設定・動的変更', () => {
        test('ランタイムでのログレベル変更', async () => {
            logger.setLogLevel('warn');
            
            await logger.debug('Debug message'); // 記録されない
            await logger.warn('Warning message'); // 記録される
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            
            expect(logContent).not.toContain('Debug message');
            expect(logContent).toContain('Warning message');
        });

        test('ログファイルの動的変更', async () => {
            const newLogFile = path.join(testLogDir, 'new-test.log');
            
            await logger.info('Message in original file');
            
            await logger.setLogFile(newLogFile);
            
            await logger.info('Message in new file');
            
            // 元のファイルには最初のメッセージのみ
            const originalContent = await fs.readFile(testLogFile, 'utf8');
            expect(originalContent).toContain('Message in original file');
            expect(originalContent).not.toContain('Message in new file');
            
            // 新しいファイルには新しいメッセージのみ
            const newContent = await fs.readFile(newLogFile, 'utf8');
            expect(newContent).toContain('Message in new file');
            
            // クリーンアップ
            await fs.unlink(newLogFile);
        });
    });

    describe('統合・実際のユースケース', () => {
        test('置換処理のログ記録', async () => {
            const operationData = {
                operation: 'file-replacement',
                targetFolder: '/test/project',
                rules: [
                    { from: 'old-class', to: 'new-class' }
                ],
                filesProcessed: 15,
                totalChanges: 42,
                duration: 1234
            };
            
            await logger.info('Replacement operation started', { 
                operation: operationData.operation,
                targetFolder: operationData.targetFolder,
                rulesCount: operationData.rules.length
            });
            
            await logger.info('Replacement operation completed', {
                operation: operationData.operation,
                filesProcessed: operationData.filesProcessed,
                totalChanges: operationData.totalChanges,
                duration: operationData.duration
            });
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            
            expect(logContent).toContain('Replacement operation started');
            expect(logContent).toContain('Replacement operation completed');
            expect(logContent).toContain('"filesProcessed":15');
            expect(logContent).toContain('"totalChanges":42');
        });

        test('エラー時の詳細ログ記録', async () => {
            const error = new Error('File not found');
            error.code = 'ENOENT';
            error.path = '/test/nonexistent.txt';
            
            await logger.error('File operation failed', {
                error: {
                    message: error.message,
                    code: error.code,
                    path: error.path,
                    stack: error.stack
                },
                operation: 'readFile',
                timestamp: Date.now()
            });
            
            const logContent = await fs.readFile(testLogFile, 'utf8');
            
            expect(logContent).toContain('File operation failed');
            expect(logContent).toContain('ENOENT');
            expect(logContent).toContain('/test/nonexistent.txt');
        });
    });
});

console.log('✅ Logger ユニットテスト読み込み完了');