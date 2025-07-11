const fs = require('fs').promises;
const path = require('path');

/**
 * Configuration management for Multi Grep Replacer
 */
class ConfigManager {
  /**
     * Load configuration from file
     * @param {string} filePath - Path to configuration file
     * @returns {Promise<Object>} Parsed configuration object
     */
  static async loadConfig(filePath) {
    try {
      const configData = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(configData);
            
      // Validate configuration
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
            
      return config;
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Configuration file not found: ${filePath}`);
      } else if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in configuration file: ${error.message}`);
      }
      throw error;
    }
  }
    
  /**
     * Save configuration to file
     * @param {Object} config - Configuration object to save
     * @param {string} filePath - Path to save configuration
     * @returns {Promise<void>}
     */
  static async saveConfig(config, filePath) {
    try {
      // Validate before saving
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
            
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
            
      // Save with pretty formatting
      const configData = JSON.stringify(config, null, 2);
      await fs.writeFile(filePath, configData, 'utf8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }
    
  /**
     * Validate configuration object
     * @param {Object} config - Configuration to validate
     * @returns {Object} Validation result with valid flag and errors array
     */
  static validateConfig(config) {
    const errors = [];
        
    // Check required top-level properties
    if (!config.app_info) {
      errors.push('Missing required property: app_info');
    } else {
      // Validate app_info
      if (!config.app_info.name) {errors.push('Missing app_info.name');}
      if (!config.app_info.version) {errors.push('Missing app_info.version');}
    }
        
    // Validate replacements
    if (!Array.isArray(config.replacements)) {
      errors.push('replacements must be an array');
    } else {
      config.replacements.forEach((rule, index) => {
        if (!rule.id) {errors.push(`Replacement rule ${index} missing id`);}
        if (!rule.from) {errors.push(`Replacement rule ${index} missing from`);}
        if (!rule.to) {errors.push(`Replacement rule ${index} missing to`);}
        if (typeof rule.enabled !== 'boolean') {
          errors.push(`Replacement rule ${index} enabled must be boolean`);
        }
      });
    }
        
    // Validate target_settings
    if (!config.target_settings) {
      errors.push('Missing required property: target_settings');
    } else {
      if (!Array.isArray(config.target_settings.file_extensions)) {
        errors.push('target_settings.file_extensions must be an array');
      }
      if (!Array.isArray(config.target_settings.exclude_patterns)) {
        errors.push('target_settings.exclude_patterns must be an array');
      }
    }
        
    return {
      valid: errors.length === 0,
      errors
    };
  }
    
  /**
     * Get default configuration
     * @returns {Object} Default configuration object
     */
  static getDefaultConfig() {
    return {
      '$schema': 'https://json-schema.org/draft/2019-09/schema',
      'app_info': {
        'name': 'Multi Grep Replacer',
        'version': '1.0.0',
        'created_at': new Date().toISOString(),
        'description': 'Multi Grep Replacer Default Configuration',
        'author': 'User'
      },
      'replacements': [
        {
          'id': 'rule_001',
          'from': 'old-text',
          'to': 'new-text',
          'enabled': true,
          'description': 'サンプル置換ルール',
          'case_sensitive': true,
          'whole_word': false
        }
      ],
      'target_settings': {
        'file_extensions': ['.html', '.css', '.js', '.php', '.md', '.json'],
        'exclude_patterns': [
          'node_modules/**',
          '.git/**', 
          'dist/**', 
          'build/**',
          '*.min.js',
          '*.min.css'
        ],
        'include_subdirectories': true,
        'max_file_size': 104857600,
        'encoding': 'utf-8'
      },
      'replacement_settings': {
        'case_sensitive': true,
        'use_regex': false,
        'backup_enabled': false,
        'preserve_file_permissions': true,
        'dry_run': false
      },
      'ui_settings': {
        'theme': 'auto',
        'window': {
          'width': 800,
          'height': 700,
          'resizable': true,
          'center': true
        },
        'remember_last_folder': true,
        'auto_save_config': false,
        'show_file_count_preview': true,
        'confirm_before_execution': true
      },
      'advanced_settings': {
        'max_concurrent_files': 10,
        'progress_update_interval': 100,
        'log_level': 'info',
        'enable_crash_reporting': false
      }
    };
  }
    
  /**
     * Merge configurations (user config overrides default)
     * @param {Object} defaultConfig - Default configuration
     * @param {Object} userConfig - User configuration
     * @returns {Object} Merged configuration
     */
  static mergeConfigs(defaultConfig, userConfig) {
    // Deep merge implementation
    const merge = (target, source) => {
      for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          target[key] = target[key] || {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      }
      return target;
    };
        
    // Clone default config to avoid mutation
    const result = JSON.parse(JSON.stringify(defaultConfig));
    return merge(result, userConfig);
  }
}

module.exports = ConfigManager;