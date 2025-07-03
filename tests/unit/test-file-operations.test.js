/**
 * file-operations.js ユニットテスト
 * ファイル操作機能の動作確認
 */

const path = require('path');
const fs = require('fs').promises;

// モジュールのパスを相対パスで指定
const FileOperations = require('../../src/main/file-operations');

describe('FileOperations', () => {
  
  beforeEach(() => {
    // モックのリセット
    jest.clearAllMocks();
    
    // fs.promises のモック設定
    jest.spyOn(fs, 'readFile').mockResolvedValue('mock file content');
    jest.spyOn(fs, 'writeFile').mockResolvedValue();
    jest.spyOn(fs, 'readdir').mockResolvedValue(['file1.js', 'file2.html', 'subdir']);
    jest.spyOn(fs, 'stat').mockResolvedValue({
      isFile: () => true,
      isDirectory: () => false,
      size: 1024
    });
    jest.spyOn(fs, 'access').mockResolvedValue();
  });

  describe('validateAndNormalizePath', () => {
    it('正常なパスを正規化する', async () => {
      const result = await FileOperations.validateAndNormalizePath('/valid/path');
      expect(result).toBe(path.resolve('/valid/path'));
    });

    it('不正なパス（..を含む）を拒否する', async () => {
      await expect(FileOperations.validateAndNormalizePath('/path/../invalid'))
        .rejects.toThrow('セキュリティ上許可されないパスです');
    });

    it('存在しないパスを拒否する', async () => {
      jest.spyOn(fs, 'access').mockRejectedValue(new Error('ENOENT'));
      
      await expect(FileOperations.validateAndNormalizePath('/nonexistent'))
        .rejects.toThrow('指定されたパスにアクセスできません');
    });
  });

  describe('readFileContent', () => {
    it('ファイル内容を正常に読み取る', async () => {
      const content = await FileOperations.readFileContent('/mock/file.txt');
      
      expect(fs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('file.txt'),
        'utf8'
      );
      expect(content).toBe('mock file content');
    });

    it('読み取り権限エラーを適切に処理する', async () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      jest.spyOn(fs, 'readFile').mockRejectedValue(error);

      await expect(FileOperations.readFileContent('/mock/file.txt'))
        .rejects.toThrow('ファイルの読み取り権限がありません');
    });

    it('ファイル不存在エラーを適切に処理する', async () => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      jest.spyOn(fs, 'readFile').mockRejectedValue(error);

      await expect(FileOperations.readFileContent('/mock/nonexistent.txt'))
        .rejects.toThrow('ファイルが見つかりません');
    });
  });

  describe('writeFileContent', () => {
    it('ファイル内容を正常に書き込む', async () => {
      await FileOperations.writeFileContent('/mock/file.txt', 'test content');
      
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('file.txt'),
        'test content',
        'utf8'
      );
    });

    it('書き込み権限エラーを適切に処理する', async () => {
      const error = new Error('Permission denied');
      error.code = 'EACCES';
      jest.spyOn(fs, 'writeFile').mockRejectedValue(error);

      await expect(FileOperations.writeFileContent('/mock/file.txt', 'content'))
        .rejects.toThrow('ファイルの書き込み権限がありません');
    });
  });

  describe('findFiles', () => {
    beforeEach(() => {
      // ディレクトリ構造のモック設定
      jest.spyOn(fs, 'readdir').mockImplementation(async (dirPath) => {
        if (dirPath.includes('subdir')) {
          return ['nested.js'];
        }
        return ['file1.js', 'file2.html', 'file3.css', 'subdir', 'ignored.min.js'];
      });
      
      jest.spyOn(fs, 'stat').mockImplementation(async (filePath) => {
        if (filePath.includes('subdir') && !filePath.includes('nested.js')) {
          return { isFile: () => false, isDirectory: () => true, size: 0 };
        }
        return { isFile: () => true, isDirectory: () => false, size: 1024 };
      });
    });

    it('指定された拡張子のファイルを検索する', async () => {
      const files = await FileOperations.findFiles('/mock/dir', ['.js', '.html']);
      
      expect(files).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/file1\.js$/),
          expect.stringMatching(/file2\.html$/),
          expect.stringMatching(/nested\.js$/)
        ])
      );
      expect(files).not.toEqual(
        expect.arrayContaining([
          expect.stringMatching(/file3\.css$/),
          expect.stringMatching(/ignored\.min\.js$/)
        ])
      );
    });

    it('除外パターンが正しく動作する', async () => {
      const files = await FileOperations.findFiles(
        '/mock/dir', 
        ['.js'], 
        ['*.min.js']
      );
      
      expect(files).toEqual(
        expect.arrayContaining([expect.stringMatching(/file1\.js$/)])
      );
      expect(files).not.toEqual(
        expect.arrayContaining([expect.stringMatching(/ignored\.min\.js$/)])
      );
    });

    it('再帰検索が正常に動作する', async () => {
      const files = await FileOperations.findFiles('/mock/dir', ['.js']);
      
      expect(files).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/file1\.js$/),
          expect.stringMatching(/nested\.js$/)
        ])
      );
    });

    it('空の拡張子配列で全ファイルを対象にする', async () => {
      const files = await FileOperations.findFiles('/mock/dir', []);
      
      expect(files.length).toBeGreaterThan(0);
      expect(files).toEqual(
        expect.arrayContaining([
          expect.stringMatching(/file1\.js$/),
          expect.stringMatching(/file2\.html$/),
          expect.stringMatching(/file3\.css$/)
        ])
      );
    });
  });

  describe('checkFilePermissions', () => {
    it('読み書き可能なファイルでtrueを返す', async () => {
      jest.spyOn(fs, 'access').mockResolvedValue();
      
      const result = await FileOperations.checkFilePermissions('/mock/file.txt');
      expect(result.readable).toBe(true);
      expect(result.writable).toBe(true);
    });

    it('読み取り専用ファイルを正しく判定する', async () => {
      jest.spyOn(fs, 'access').mockImplementation(async (path, mode) => {
        const fsConstants = require('fs').constants;
        if (mode === fsConstants.W_OK) {
          throw new Error('EACCES');
        }
      });
      
      const result = await FileOperations.checkFilePermissions('/mock/readonly.txt');
      expect(result.readable).toBe(true);
      expect(result.writable).toBe(false);
    });
  });
});

describe('FileOperations エラーハンドリング', () => {
  it('予期しないエラーを適切に再投げする', async () => {
    const unexpectedError = new Error('Unexpected error');
    jest.spyOn(fs, 'readFile').mockRejectedValue(unexpectedError);

    await expect(FileOperations.readFileContent('/mock/file.txt'))
      .rejects.toThrow('Unexpected error');
  });
});

console.log('✅ FileOperations unit tests loaded');