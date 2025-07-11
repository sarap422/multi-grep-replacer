/**
 * FileOperations Unit Tests
 * ファイル操作システムのテスト
 */

const fs = require('fs').promises;
const path = require('path');
const FileOperations = require('../../src/main/file-operations');

// ファイルシステムのモック
jest.mock('fs', () => ({
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    stat: jest.fn()
  },
  constants: {
    R_OK: 4,
    W_OK: 2,
    F_OK: 0
  }
}));

describe('FileOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findFiles', () => {
    it('ファイルを正常に検索できること', async () => {
      // モックのディレクトリ構造
      fs.readdir
        .mockResolvedValueOnce([
          { name: 'file1.js', isDirectory: () => false, isFile: () => true },
          { name: 'file2.html', isDirectory: () => false, isFile: () => true },
          { name: 'subdirectory', isDirectory: () => true, isFile: () => false }
        ])
        .mockResolvedValueOnce([
          { name: 'file3.js', isDirectory: () => false, isFile: () => true }
        ]);

      const result = await FileOperations.findFiles('/test/dir', ['.js', '.html'], []);

      expect(result).toHaveLength(3);
      expect(result).toContain('/test/dir/file1.js');
      expect(result).toContain('/test/dir/file2.html');
      expect(result).toContain('/test/dir/subdirectory/file3.js');
    });

    it('拡張子フィルタが正常に動作すること', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'file1.js', isDirectory: () => false, isFile: () => true },
        { name: 'file2.html', isDirectory: () => false, isFile: () => true },
        { name: 'file3.css', isDirectory: () => false, isFile: () => true }
      ]);

      const result = await FileOperations.findFiles('/test/dir', ['.js'], []);

      expect(result).toHaveLength(1);
      expect(result).toContain('/test/dir/file1.js');
    });

    it('除外パターンが正常に動作すること', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'file1.js', isDirectory: () => false, isFile: () => true },
        { name: 'node_modules', isDirectory: () => true, isFile: () => false },
        { name: 'build', isDirectory: () => true, isFile: () => false }
      ]);

      const result = await FileOperations.findFiles('/test/dir', [], ['node_modules/**', 'build/**']);

      expect(result).toHaveLength(1);
      expect(result).toContain('/test/dir/file1.js');
    });

    it('空の拡張子配列で全ファイルを対象とすること', async () => {
      fs.readdir.mockResolvedValueOnce([
        { name: 'file1.js', isDirectory: () => false, isFile: () => true },
        { name: 'file2.html', isDirectory: () => false, isFile: () => true },
        { name: 'file3.txt', isDirectory: () => false, isFile: () => true }
      ]);

      const result = await FileOperations.findFiles('/test/dir', [], []);

      expect(result).toHaveLength(3);
    });

    it('アクセス権限エラーのディレクトリをスキップすること', async () => {
      const error = testHelpers.createError('EACCES', 'Permission denied');
      fs.readdir.mockRejectedValueOnce(error);

      const result = await FileOperations.findFiles('/test/dir', [], []);

      expect(result).toHaveLength(0);
    });
  });

  describe('readFileContent', () => {
    it('ファイル内容を正常に読み込めること', async () => {
      const testContent = 'test file content';
      fs.access.mockResolvedValue();
      fs.readFile.mockResolvedValue(testContent);

      const result = await FileOperations.readFileContent('/test/file.txt');

      expect(fs.access).toHaveBeenCalledWith('/test/file.txt', fs.constants.R_OK);
      expect(fs.readFile).toHaveBeenCalledWith('/test/file.txt', 'utf8');
      expect(result).toBe(testContent);
    });

    it('ファイルが存在しない場合にエラーを投げること', async () => {
      const error = testHelpers.createError('ENOENT', 'File not found');
      fs.access.mockRejectedValue(error);

      await expect(FileOperations.readFileContent('/test/nonexistent.txt'))
        .rejects.toThrow('File not found: /test/nonexistent.txt');
    });

    it('権限がない場合にエラーを投げること', async () => {
      const error = testHelpers.createError('EACCES', 'Permission denied');
      fs.access.mockRejectedValue(error);

      await expect(FileOperations.readFileContent('/test/restricted.txt'))
        .rejects.toThrow('Permission denied: /test/restricted.txt');
    });

    it('ディレクトリを読み込もうとした場合にエラーを投げること', async () => {
      const error = testHelpers.createError('EISDIR', 'Is a directory');
      fs.access.mockResolvedValue();
      fs.readFile.mockRejectedValue(error);

      await expect(FileOperations.readFileContent('/test/directory'))
        .rejects.toThrow('Is a directory: /test/directory');
    });
  });

  describe('writeFileContent', () => {
    it('ファイル内容を正常に書き込めること', async () => {
      const testContent = 'test content to write';
      fs.access.mockResolvedValue();
      fs.writeFile.mockResolvedValue();

      await FileOperations.writeFileContent('/test/file.txt', testContent);

      expect(fs.access).toHaveBeenCalledWith('/test/file.txt', fs.constants.W_OK);
      expect(fs.writeFile).toHaveBeenCalledWith('/test/file.txt', testContent, 'utf8');
    });

    it('新規ファイルの場合にディレクトリの権限をチェックすること', async () => {
      const testContent = 'new file content';
      const error = testHelpers.createError('ENOENT', 'File not found');
      fs.access
        .mockRejectedValueOnce(error) // ファイルが存在しない
        .mockResolvedValueOnce();      // ディレクトリの書き込み権限OK
      fs.writeFile.mockResolvedValue();

      await FileOperations.writeFileContent('/test/newfile.txt', testContent);

      expect(fs.access).toHaveBeenCalledWith('/test', fs.constants.W_OK);
      expect(fs.writeFile).toHaveBeenCalledWith('/test/newfile.txt', testContent, 'utf8');
    });

    it('書き込み権限がない場合にエラーを投げること', async () => {
      const error = testHelpers.createError('EACCES', 'Permission denied');
      fs.access.mockRejectedValue(error);

      await expect(FileOperations.writeFileContent('/test/readonly.txt', 'content'))
        .rejects.toThrow('Permission denied: /test/readonly.txt');
    });

    it('ディスク容量不足の場合にエラーを投げること', async () => {
      const error = testHelpers.createError('ENOSPC', 'No space left on device');
      fs.access.mockResolvedValue();
      fs.writeFile.mockRejectedValue(error);

      await expect(FileOperations.writeFileContent('/test/file.txt', 'content'))
        .rejects.toThrow('No space left on device: /test/file.txt');
    });
  });

  describe('getFileStats', () => {
    it('ファイル統計情報を正常に取得できること', async () => {
      const mockStats = {
        size: 1024,
        mtime: new Date('2025-01-01'),
        isFile: () => true,
        isDirectory: () => false
      };
      fs.stat.mockResolvedValue(mockStats);

      const result = await FileOperations.getFileStats('/test/file.txt');

      expect(result).toEqual({
        size: 1024,
        sizeHuman: '1 KB',
        modified: mockStats.mtime,
        isFile: true,
        isDirectory: false
      });
    });

    it('ファイルサイズを人間可読形式に変換できること', () => {
      expect(FileOperations.formatFileSize(0)).toBe('0 Bytes');
      expect(FileOperations.formatFileSize(1024)).toBe('1 KB');
      expect(FileOperations.formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(FileOperations.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('isFileTooLarge', () => {
    it('ファイルサイズが制限以下の場合にfalseを返すこと', async () => {
      const mockStats = { size: 1024 };
      jest.spyOn(FileOperations, 'getFileStats').mockResolvedValue(mockStats);

      const result = await FileOperations.isFileTooLarge('/test/file.txt', 2048);

      expect(result).toBe(false);
    });

    it('ファイルサイズが制限を超えている場合にtrueを返すこと', async () => {
      const mockStats = { size: 2048 };
      jest.spyOn(FileOperations, 'getFileStats').mockResolvedValue(mockStats);

      const result = await FileOperations.isFileTooLarge('/test/file.txt', 1024);

      expect(result).toBe(true);
    });

    it('デフォルトのサイズ制限（100MB）を使用すること', async () => {
      const mockStats = { size: 50 * 1024 * 1024 }; // 50MB
      jest.spyOn(FileOperations, 'getFileStats').mockResolvedValue(mockStats);

      const result = await FileOperations.isFileTooLarge('/test/file.txt');

      expect(result).toBe(false);
    });
  });

  describe('isSafePath', () => {
    it('安全なパスでtrueを返すこと', () => {
      expect(FileOperations.isSafePath('/home/user/documents/file.txt')).toBe(true);
      expect(FileOperations.isSafePath('./relative/path/file.txt')).toBe(true);
      expect(FileOperations.isSafePath('simple-filename.txt')).toBe(true);
    });

    it('パストラバーサル攻撃を防ぐこと', () => {
      expect(FileOperations.isSafePath('../../../etc/passwd')).toBe(false);
      expect(FileOperations.isSafePath('..\\..\\..\\Windows\\System32')).toBe(false);
      expect(FileOperations.isSafePath('/path/with/../traversal')).toBe(false);
    });

    it('システムディレクトリへのアクセスを防ぐこと', () => {
      expect(FileOperations.isSafePath('/etc/passwd')).toBe(false);
      expect(FileOperations.isSafePath('/sys/devices')).toBe(false);
      expect(FileOperations.isSafePath('C:\\Windows\\System32\\config')).toBe(false);
    });
  });

  describe('shouldExclude', () => {
    it('除外パターンマッチングが正常に動作すること', () => {
      expect(FileOperations.shouldExclude('node_modules/package', ['node_modules/**'])).toBe(true);
      expect(FileOperations.shouldExclude('.git/config', ['.git/**'])).toBe(true);
      expect(FileOperations.shouldExclude('src/main.js', ['node_modules/**'])).toBe(false);
    });

    it('glob パターンが正常に動作すること', () => {
      expect(FileOperations.shouldExclude('file.min.js', ['*.min.js'])).toBe(true);
      expect(FileOperations.shouldExclude('file.js', ['*.min.js'])).toBe(false);
    });

    it('部分文字列マッチングが正常に動作すること', () => {
      expect(FileOperations.shouldExclude('path/test/file.js', ['test'])).toBe(true);
      expect(FileOperations.shouldExclude('path/production/file.js', ['test'])).toBe(false);
    });
  });

  describe('matchesExtensions', () => {
    it('拡張子マッチングが正常に動作すること', () => {
      expect(FileOperations.matchesExtensions('file.js', ['.js', '.html'])).toBe(true);
      expect(FileOperations.matchesExtensions('file.HTML', ['.js', '.html'])).toBe(true); // 大文字小文字無視
      expect(FileOperations.matchesExtensions('file.css', ['.js', '.html'])).toBe(false);
    });

    it('空の拡張子配列で全ファイルにマッチすること', () => {
      expect(FileOperations.matchesExtensions('file.anything', [])).toBe(true);
    });
  });
});