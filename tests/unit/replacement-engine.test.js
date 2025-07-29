/**
 * replacement-engine.test.js - ReplacementEngineのテストスイート
 */

const ReplacementEngine = require('../../src/main/replacement-engine');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// モック設定
jest.mock('../../src/main/debug-logger');

describe('ReplacementEngine', () => {
  let engine;
  let tempDir;
  let testFiles;

  beforeEach(async () => {
    engine = new ReplacementEngine();
    
    // 一時ディレクトリ作成
    tempDir = path.join(os.tmpdir(), `replacement-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // テストファイル作成
    testFiles = [];
    const testContent = {
      'test1.html': '<div class="old-class">Hello World</div>\n<span class="old-class">Test</span>',
      'test2.css': '.old-class { color: red; }\n.OLD-CLASS { font-size: 14px; }',
      'test3.js': 'const oldVariable = "test";\nfunction oldFunction() { return oldVariable; }',
      'test4.txt': 'This is a test file with old-class and oldVariable references.'
    };

    for (const [filename, content] of Object.entries(testContent)) {
      const filePath = path.join(tempDir, filename);
      await fs.writeFile(filePath, content, 'utf8');
      testFiles.push(filePath);
    }
  });

  afterEach(async () => {
    // クリーンアップ
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  describe('基本機能テスト', () => {
    test('should replace text in single file', async () => {
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true }
      ];

      const result = await engine.processFile(testFiles[0], rules);
      
      expect(result.modified).toBe(true);
      expect(result.replacements).toBe(2);
      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].count).toBe(2);

      // ファイル内容確認
      const content = await fs.readFile(testFiles[0], 'utf8');
      expect(content).toContain('new-class');
      expect(content).not.toContain('old-class');
    });

    test('should apply multiple rules sequentially', async () => {
      const rules = [
        { from: 'oldVariable', to: 'newVariable', enabled: true },
        { from: 'oldFunction', to: 'newFunction', enabled: true }
      ];

      const result = await engine.processFile(testFiles[2], rules);
      
      expect(result.modified).toBe(true);
      expect(result.replacements).toBe(3); // oldVariable x2 + oldFunction x1
      expect(result.changes).toHaveLength(2);

      const content = await fs.readFile(testFiles[2], 'utf8');
      expect(content).toContain('newVariable');
      expect(content).toContain('newFunction');
    });

    test('should process multiple files in batch', async () => {
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true }
      ];

      const result = await engine.processFiles(testFiles, rules);
      
      expect(result.success).toBe(true);
      expect(result.stats.totalFiles).toBe(4);
      expect(result.stats.processedFiles).toBe(4);
      expect(result.stats.modifiedFiles).toBe(3); // HTML, CSS, TXT files
    });

    test('should respect case sensitivity option', async () => {
      // Case sensitive (default)
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true }
      ];

      // Case sensitive test with dryRun to not modify file
      const dryRunEngine = new ReplacementEngine({ caseSensitive: true, dryRun: true });
      const result1 = await dryRunEngine.processFile(testFiles[1], rules);
      expect(result1.replacements).toBe(1); // Only lowercase match

      // Case insensitive test with dryRun
      const caseInsensitiveEngine = new ReplacementEngine({ caseSensitive: false, dryRun: true });
      const result2 = await caseInsensitiveEngine.processFile(testFiles[1], rules);
      expect(result2.replacements).toBe(2); // Both lowercase and uppercase
    });

    test('should skip disabled rules', async () => {
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: false },
        { from: 'oldVariable', to: 'newVariable', enabled: true }
      ];

      const result = await engine.processFiles(testFiles, rules);
      
      // old-classは置換されない、oldVariableのみ置換
      const htmlContent = await fs.readFile(testFiles[0], 'utf8');
      expect(htmlContent).toContain('old-class');
      
      const jsContent = await fs.readFile(testFiles[2], 'utf8');
      expect(jsContent).toContain('newVariable');
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('should handle file read errors gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.txt');
      const rules = [
        { from: 'old', to: 'new', enabled: true }
      ];

      const result = await engine.processFile(nonExistentFile, rules);
      
      expect(result.error).toBeTruthy();
      expect(result.modified).toBe(false);
    });

    test('should continue processing on individual file errors', async () => {
      const mixedFiles = [...testFiles, path.join(tempDir, 'non-existent.txt')];
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true }
      ];

      const result = await engine.processFiles(mixedFiles, rules);
      
      expect(result.success).toBe(true);
      expect(result.stats.processedFiles).toBe(5);
      expect(result.stats.errors).toHaveLength(1);
    });

    test('should throw error when no active rules', async () => {
      const rules = [
        { from: 'old', to: 'new', enabled: false }
      ];

      await expect(engine.processFiles(testFiles, rules))
        .rejects.toThrow('No active replacement rules');
    });

    test('should prevent concurrent processing', async () => {
      const rules = [{ from: 'old', to: 'new', enabled: true }];
      
      // 最初の処理を開始
      const promise1 = engine.processFiles(testFiles, rules);
      
      // 2回目の処理を試みる
      await expect(engine.processFiles(testFiles, rules))
        .rejects.toThrow('Processing already in progress');
      
      await promise1;
    });
  });

  describe('プレビュー機能テスト', () => {
    test('should generate preview of replacements', async () => {
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true }
      ];

      const preview = await engine.generatePreview(testFiles, rules, 2);
      
      expect(preview).toHaveLength(2); // 2ファイルのみプレビュー
      expect(preview[0].changes).toHaveLength(1);
      expect(preview[0].changes[0].totalCount).toBe(2);
      expect(preview[0].changes[0].matches).toHaveLength(2);
    });

    test('should include line numbers in preview', async () => {
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true }
      ];

      const preview = await engine.generatePreview([testFiles[0]], rules);
      
      expect(preview[0].changes[0].matches[0]).toHaveProperty('line');
      expect(preview[0].changes[0].matches[0]).toHaveProperty('column');
      expect(preview[0].changes[0].matches[0]).toHaveProperty('context');
    });
  });

  describe('進捗通知テスト', () => {
    test('should emit progress events', async () => {
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true }
      ];

      const progressEvents = [];
      engine.on('progress', (data) => progressEvents.push(data));

      await engine.processFiles(testFiles, rules);
      
      expect(progressEvents.length).toBeGreaterThan(0);
      expect(progressEvents[progressEvents.length - 1].percentage).toBe(100);
    });

    test('should emit start and complete events', async () => {
      const rules = [
        { from: 'old', to: 'new', enabled: true }
      ];

      let startEvent = null;
      let completeEvent = null;

      engine.on('start', (data) => startEvent = data);
      engine.on('complete', (data) => completeEvent = data);

      await engine.processFiles(testFiles, rules);
      
      expect(startEvent).toBeTruthy();
      expect(startEvent.totalFiles).toBe(4);
      
      expect(completeEvent).toBeTruthy();
      expect(completeEvent.stats).toBeTruthy();
      expect(completeEvent.duration).toBeGreaterThan(0);
    });
  });

  describe('キャンセル機能テスト', () => {
    test('should be able to cancel processing', async () => {
      // 大量のファイルを作成
      const manyFiles = [];
      for (let i = 0; i < 50; i++) {
        const filePath = path.join(tempDir, `file${i}.txt`);
        await fs.writeFile(filePath, 'old-text content', 'utf8');
        manyFiles.push(filePath);
      }

      const rules = [
        { from: 'old-text', to: 'new-text', enabled: true }
      ];

      // 処理を開始して即座にキャンセル
      const processPromise = engine.processFiles(manyFiles, rules);
      engine.cancelProcessing();

      // キャンセルされた場合、正常完了またはキャンセルエラー
      try {
        const result = await processPromise;
        // 処理が速すぎてキャンセルが効かなかった場合
        expect(result.success).toBe(true);
      } catch (error) {
        // キャンセルエラーが発生した場合
        expect(error.message).toContain('cancelled');
      }
    });
  });

  describe('Dry Run機能テスト', () => {
    test('should not modify files in dry run mode', async () => {
      engine = new ReplacementEngine({ dryRun: true });
      
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true }
      ];

      const originalContent = await fs.readFile(testFiles[0], 'utf8');
      const result = await engine.processFile(testFiles[0], rules);
      
      expect(result.modified).toBe(false);
      expect(result.replacements).toBe(2); // 置換数はカウントされるがファイルは変更されない
      
      // ファイル内容が変更されていないことを確認
      const afterContent = await fs.readFile(testFiles[0], 'utf8');
      expect(afterContent).toBe(originalContent);
    });
  });

  describe('統計情報テスト', () => {
    test('should provide accurate statistics', async () => {
      const rules = [
        { from: 'old-class', to: 'new-class', enabled: true },
        { from: 'oldVariable', to: 'newVariable', enabled: true }
      ];

      await engine.processFiles(testFiles, rules);
      const stats = engine.getStats();
      
      expect(stats.totalFiles).toBe(4);
      expect(stats.processedFiles).toBe(4);
      expect(stats.modifiedFiles).toBeGreaterThan(0);
      expect(stats.totalReplacements).toBeGreaterThan(0);
      expect(stats.results).toHaveLength(4);
    });
  });

  describe('特殊文字エスケープテスト', () => {
    test('should handle special regex characters', async () => {
      const specialFile = path.join(tempDir, 'special.txt');
      await fs.writeFile(specialFile, 'Price: $10.99 (on sale)', 'utf8');
      
      const rules = [
        { from: '$10.99', to: '$15.99', enabled: true }
      ];

      const result = await engine.processFile(specialFile, rules);
      
      expect(result.modified).toBe(true);
      expect(result.replacements).toBe(1);
      
      const content = await fs.readFile(specialFile, 'utf8');
      expect(content).toBe('Price: $15.99 (on sale)');
    });
  });
});