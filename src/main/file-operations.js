const fs = require('fs').promises;
const path = require('path');

/**
 * File operations for Multi Grep Replacer
 */
class FileOperations {
  /**
     * Find files recursively in directory with filtering
     * @param {string} directory - Root directory to search
     * @param {Array<string>} extensions - File extensions to include (empty array = all files)
     * @param {Array<string>} excludePatterns - Patterns to exclude
     * @returns {Promise<Array<string>>} Array of file paths
     */
  static async findFiles(directory, extensions = [], excludePatterns = []) {
    const files = [];
        
    try {
      await this.findFilesRecursive(directory, files, extensions, excludePatterns);
      return files.sort();
    } catch (error) {
      throw new Error(`Failed to find files in ${directory}: ${error.message}`);
    }
  }
    
  /**
     * Recursive helper for file finding
     * @private
     */
  static async findFilesRecursive(dir, files, extensions, excludePatterns) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
            
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(process.cwd(), fullPath);
                
        // Check if path should be excluded
        if (this.shouldExclude(relativePath, excludePatterns)) {
          continue;
        }
                
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          await this.findFilesRecursive(fullPath, files, extensions, excludePatterns);
        } else if (entry.isFile()) {
          // Check if file matches extension filter
          if (this.matchesExtensions(fullPath, extensions)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read (permission issues, etc.)
      console.warn(`Cannot read directory ${dir}: ${error.message}`);
    }
  }
    
  /**
     * Check if path should be excluded based on patterns
     * @private
     */
  static shouldExclude(relativePath, excludePatterns) {
    for (const pattern of excludePatterns) {
      // Simple glob pattern matching
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3);
        if (relativePath.startsWith(prefix + '/') || relativePath === prefix) {
          return true;
        }
      } else if (pattern.includes('*')) {
        // Convert glob pattern to regex
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`);
        if (regex.test(relativePath)) {
          return true;
        }
      } else if (relativePath.includes(pattern)) {
        return true;
      }
    }
    return false;
  }
    
  /**
     * Check if file matches extension filter
     * @private
     */
  static matchesExtensions(filePath, extensions) {
    if (extensions.length === 0) {
      return true; // No filter = include all files
    }
        
    const fileExt = path.extname(filePath).toLowerCase();
    return extensions.some((ext) => 
      ext.toLowerCase() === fileExt
    );
  }
    
  /**
     * Read file content safely
     * @param {string} filePath - Path to file
     * @returns {Promise<string>} File content
     */
  static async readFileContent(filePath) {
    try {
      // Check file permissions first
      await this.checkFilePermissions(filePath, fs.constants.R_OK);
            
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      } else if (error.code === 'EISDIR') {
        throw new Error(`Is a directory: ${filePath}`);
      }
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }
    
  /**
     * Write file content safely
     * @param {string} filePath - Path to file
     * @param {string} content - Content to write
     * @returns {Promise<void>}
     */
  static async writeFileContent(filePath, content) {
    try {
      // Check if file exists and we have write permissions
      try {
        await this.checkFilePermissions(filePath, fs.constants.W_OK);
      } catch (error) {
        if (error.code !== 'ENOENT') {
          throw error; // File exists but no write permission
        }
        // File doesn't exist, check directory permissions
        const dir = path.dirname(filePath);
        await this.checkFilePermissions(dir, fs.constants.W_OK);
      }
            
      await fs.writeFile(filePath, content, 'utf8');
    } catch (error) {
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied: ${filePath}`);
      } else if (error.code === 'ENOSPC') {
        throw new Error(`No space left on device: ${filePath}`);
      }
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }
    
  /**
     * Check file permissions
     * @param {string} filePath - Path to check
     * @param {number} mode - Permission mode (fs.constants.R_OK, W_OK, etc.)
     * @returns {Promise<void>}
     */
  static async checkFilePermissions(filePath, mode) {
    await fs.access(filePath, mode);
  }
    
  /**
     * Get file statistics
     * @param {string} filePath - Path to file
     * @returns {Promise<Object>} File stats object
     */
  static async getFileStats(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        sizeHuman: this.formatFileSize(stats.size),
        modified: stats.mtime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      throw new Error(`Failed to get file stats ${filePath}: ${error.message}`);
    }
  }
    
  /**
     * Format file size in human readable format
     * @private
     */
  static formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) {return '0 Bytes';}
        
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
    
  /**
     * Check if file is too large for processing
     * @param {string} filePath - Path to file
     * @param {number} maxSize - Maximum allowed size in bytes
     * @returns {Promise<boolean>} True if file is too large
     */
  static async isFileTooLarge(filePath, maxSize = 104857600) { // 100MB default
    try {
      const stats = await this.getFileStats(filePath);
      return stats.size > maxSize;
    } catch (error) {
      return false; // If we can't check, assume it's okay
    }
  }
    
  /**
     * Validate if path is safe for operations
     * @param {string} filePath - Path to validate
     * @returns {boolean} True if path is safe
     */
  static isSafePath(filePath) {
    // Prevent path traversal attacks
    const normalizedPath = path.normalize(filePath);
        
    // Check for dangerous patterns
    const dangerousPatterns = ['../', '..\\', '/..', '\\..'];
    for (const pattern of dangerousPatterns) {
      if (normalizedPath.includes(pattern)) {
        return false;
      }
    }
        
    // Check if path tries to access system directories
    const systemPaths = ['/etc/', '/sys/', '/proc/', 'C:\\Windows\\', 'C:\\System32\\'];
    for (const systemPath of systemPaths) {
      if (normalizedPath.startsWith(systemPath)) {
        return false;
      }
    }
        
    return true;
  }
}

module.exports = FileOperations;