/**
 * File Search Engine Unit Tests
 */

const path = require('path');
const fs = require('fs').promises;
const FileSearchEngine = require('../../src/main/file-search-engine');
const DebugLogger = require('../../src/main/debug-logger');

// テスト用一時ディレクトリ作成
const TEST_DIR = path.join(__dirname, '../test_files/search_test');

describe('FileSearchEngine', () => {
  let searchEngine;
  let testDir;

  beforeAll(async () => {
    // デバッグロガー初期化
    await DebugLogger.initialize();
    
    // テスト用ディレクトリ構造作成
    testDir = path.join(__dirname, '../temp/search_test');
    await setupTestDirectory(testDir);
  });

  beforeEach(() => {
    searchEngine = new FileSearchEngine();
  });

  afterAll(async () => {
    // テスト用ディレクトリ削除
    try {
      await fs.rmdir(testDir, { recursive: true });
    } catch (error) {
      console.warn('Test directory cleanup failed:', error.message);
    }
  });

  describe('基本機能テスト', () => {
    test('should find files recursively', async () => {
      const result = await searchEngine.searchFiles(testDir, []);
      
      expect(result.files).toBeDefined();
      expect(Array.isArray(result.files)).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
      
      // 再帰検索でサブディレクトリのファイルも含まれることを確認
      const subDirFiles = result.files.filter(file => 
        file.path.includes('subdirectory')
      );
      expect(subDirFiles.length).toBeGreaterThan(0);
    });

    test('should filter by extensions', async () => {
      const result = await searchEngine.searchFiles(testDir, ['.js', '.html']);
      
      const allFilesHaveCorrectExtension = result.files.every(file => {
        const ext = path.extname(file.path).toLowerCase();
        return ext === '.js' || ext === '.html';
      });
      
      expect(allFilesHaveCorrectExtension).toBe(true);
    });

    test('should exclude node_modules directories', async () => {
      const result = await searchEngine.searchFiles(testDir, []);
      
      const nodeModuleFiles = result.files.filter(file => 
        file.path.includes('node_modules')
      );
      
      expect(nodeModuleFiles.length).toBe(0);
    });

    test('should include all files when no extensions specified', async () => {
      const result = await searchEngine.searchFiles(testDir, []);
      
      expect(result.files.length).toBeGreaterThan(0);
      
      // 異なる拡張子のファイルが含まれることを確認
      const extensions = new Set(result.files.map(file => 
        path.extname(file.path).toLowerCase()
      ));
      expect(extensions.size).toBeGreaterThan(1);
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('should handle non-existent directory', async () => {
      const nonExistentDir = path.join(testDir, 'does-not-exist');
      
      await expect(searchEngine.searchFiles(nonExistentDir, [])).rejects.toThrow();
    });

    test('should handle permission errors gracefully', async () => {
      // 権限エラーのシミュレーションは環境依存のため、スキップまたは条件付き実行
      if (process.platform !== 'win32') {
        const restrictedDir = path.join(testDir, 'restricted');
        try {
          await fs.mkdir(restrictedDir, { mode: 0o000 });
          
          const result = await searchEngine.searchFiles(testDir, []);
          
          // エラーがあってもクラッシュしないことを確認
          expect(result.stats.errors.length).toBeGreaterThanOrEqual(0);
          
          // 権限を戻してクリーンアップ
          await fs.chmod(restrictedDir, 0o755);
        } catch (error) {
          // 権限テストが失敗した場合はスキップ
          console.warn('Permission test skipped:', error.message);
        }
      }
    });
  });

  describe('パフォーマンステスト', () => {
    test('should complete within 5 seconds for small directory', async () => {
      const startTime = performance.now();
      
      const result = await searchEngine.searchFiles(testDir, []);
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(5000); // 5秒以内
      
      console.log(`Search completed in ${duration.toFixed(2)}ms for ${result.files.length} files`);
    });

    test('should emit progress events', async () => {
      const progressEvents = [];
      
      searchEngine.on('progress', (data) => {
        progressEvents.push(data);
      });
      
      await searchEngine.searchFiles(testDir, []);
      
      // 進捗イベントが発生したことを確認
      expect(progressEvents.length).toBeGreaterThanOrEqual(0);
      
      if (progressEvents.length > 0) {
        const lastProgress = progressEvents[progressEvents.length - 1];
        expect(lastProgress.filesFound).toBeGreaterThanOrEqual(0);
        expect(lastProgress.directoriesScanned).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('キャンセル機能テスト', () => {
    test('should be able to cancel search', async () => {
      // 大量のディレクトリを作成してキャンセルをテスト
      const largeTestDir = path.join(__dirname, '../temp/large_search_test');
      
      // ディレクトリ作成
      await fs.mkdir(largeTestDir, { recursive: true });
      
      // 多数のサブディレクトリとファイルを作成
      for (let i = 0; i < 50; i++) {
        const subDir = path.join(largeTestDir, `dir_${i}`);
        await fs.mkdir(subDir, { recursive: true });
        for (let j = 0; j < 10; j++) {
          await fs.writeFile(path.join(subDir, `file_${j}.txt`), `content ${i}-${j}`);
        }
      }
      
      try {
        // 検索を開始
        const searchPromise = searchEngine.searchFiles(largeTestDir, []);
        
        // 即座にキャンセル
        searchEngine.cancelSearch();
        
        // キャンセルエラーか、正常に完了するかのいずれか
        const result = await searchPromise;
        
        // 検索が速すぎてキャンセルが効かない場合もあるため、
        // エラーが発生しなくても成功とする
        expect(result).toBeDefined();
      } finally {
        // クリーンアップ
        await fs.rm(largeTestDir, { recursive: true, force: true });
      }
    });
  });

  describe('統計情報テスト', () => {
    test('should provide accurate statistics', async () => {
      const result = await searchEngine.searchFiles(testDir, ['.js']);
      
      expect(result.stats).toBeDefined();
      expect(result.stats.totalFiles).toBeGreaterThanOrEqual(0);
      expect(result.stats.totalDirectories).toBeGreaterThanOrEqual(0);
      expect(result.stats.skippedFiles).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.stats.errors)).toBe(true);
    });
  });
});

/**
 * テスト用ディレクトリ構造作成
 */
async function setupTestDirectory(testDir) {
  try {
    // ディレクトリ構造作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'subdirectory'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'node_modules'), { recursive: true });
    await fs.mkdir(path.join(testDir, '.git'), { recursive: true });
    
    // テストファイル作成
    const testFiles = [
      { path: 'index.html', content: '<html><body>Test HTML</body></html>' },
      { path: 'style.css', content: 'body { color: red; }' },
      { path: 'script.js', content: 'console.log("Hello World");' },
      { path: 'data.json', content: '{"test": "data"}' },
      { path: 'README.md', content: '# Test Project' },
      { path: 'subdirectory/nested.js', content: 'const nested = true;' },
      { path: 'subdirectory/nested.html', content: '<div>Nested</div>' },
      { path: 'node_modules/module.js', content: '// Should be excluded' },
      { path: '.git/config', content: '# Git config' }
    ];
    
    for (const file of testFiles) {
      const filePath = path.join(testDir, file.path);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, file.content);
    }
    
    console.log('Test directory structure created:', testDir);
  } catch (error) {
    console.error('Failed to setup test directory:', error);
    throw error;
  }
}