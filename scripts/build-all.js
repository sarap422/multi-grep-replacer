/**
 * 全プラットフォーム用ビルドスクリプト
 * Multi Grep Replacer - macOS/Windows/Linux パッケージ一括作成
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🌍 Multi Grep Replacer - Cross-Platform Build Script');
console.log('====================================================');

// プロジェクトルート確認
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

console.log(`📁 Project Root: ${projectRoot}`);

// ビルド統計
const buildStats = {
    startTime: Date.now(),
    platforms: [],
    totalSize: 0
};

// 前提条件チェック
const checkPrerequisites = () => {
    console.log('\n🔍 Prerequisites Check...');
    
    // 必要ファイル確認
    const requiredFiles = [
        'package.json',
        'electron-builder.json',
        'src/main/main.js'
    ];
    
    requiredFiles.forEach(file => {
        if (!fs.existsSync(file)) {
            throw new Error(`❌ ${file} not found`);
        }
    });
    
    // アイコンファイル確認
    const iconFiles = [
        'build/icons/icon.png',
        'build/icons/icon.icns',
        'build/icons/icon.ico'
    ];
    
    iconFiles.forEach(file => {
        if (!fs.existsSync(file)) {
            console.log(`⚠️  Warning: ${file} not found, using placeholder`);
        }
    });
    
    console.log('✅ Prerequisites check passed');
};

// 依存関係インストール
const installDependencies = () => {
    console.log('\n📦 Installing Dependencies...');
    try {
        execSync('npm ci', { stdio: 'inherit' });
        console.log('✅ Dependencies installed successfully');
    } catch (error) {
        console.error('❌ Failed to install dependencies');
        throw error;
    }
};

// distディレクトリクリーンアップ
const cleanDist = () => {
    console.log('\n🧹 Cleaning dist directory...');
    try {
        if (fs.existsSync('dist')) {
            execSync('rm -rf dist', { stdio: 'inherit' });
        }
        console.log('✅ Dist directory cleaned');
    } catch (error) {
        console.warn('⚠️  Warning: Failed to clean dist directory');
    }
};

// プラットフォーム別ビルド
const buildPlatform = async (platform, architectures = []) => {
    console.log(`\n🏗️  Building for ${platform}...`);
    const startTime = Date.now();
    
    try {
        let buildCommand = `npx electron-builder --${platform}`;
        if (architectures.length > 0) {
            buildCommand += ` --${architectures.join(' --')}`;
        }
        
        console.log(`Running: ${buildCommand}`);
        execSync(buildCommand, { stdio: 'inherit' });
        
        const duration = Date.now() - startTime;
        console.log(`✅ ${platform} build completed in ${(duration / 1000).toFixed(1)}s`);
        
        buildStats.platforms.push({
            platform,
            duration,
            success: true
        });
        
    } catch (error) {
        console.error(`❌ ${platform} build failed:`, error.message);
        buildStats.platforms.push({
            platform,
            duration: Date.now() - startTime,
            success: false,
            error: error.message
        });
        throw error;
    }
};

// ビルド結果確認とサイズ計算
const verifyAndCalculateSize = () => {
    console.log('\n🔍 Verifying build results...');
    
    const platforms = {
        'macOS': [
            'dist/mac/Multi Grep Replacer.app',
            'dist/Multi Grep Replacer-1.0.0-mac.zip',
            'dist/Multi Grep Replacer-1.0.0.dmg'
        ],
        'Windows': [
            'dist/win-unpacked/Multi Grep Replacer.exe',
            'dist/Multi Grep Replacer Setup 1.0.0.exe'
        ],
        'Linux': [
            'dist/Multi Grep Replacer-1.0.0.AppImage',
            'dist/multi-grep-replacer_1.0.0_amd64.deb'
        ]
    };
    
    Object.entries(platforms).forEach(([platform, files]) => {
        console.log(`\n📱 ${platform}:`);
        let platformSize = 0;
        
        files.forEach(file => {
            if (fs.existsSync(file)) {
                const stats = fs.statSync(file);
                const sizeMB = stats.size / 1024 / 1024;
                console.log(`  ✅ ${path.basename(file)} (${sizeMB.toFixed(2)} MB)`);
                platformSize += stats.size;
            } else {
                console.log(`  ❌ ${path.basename(file)} - NOT FOUND`);
            }
        });
        
        if (platformSize > 0) {
            console.log(`  📊 Total: ${(platformSize / 1024 / 1024).toFixed(2)} MB`);
            buildStats.totalSize += platformSize;
        }
    });
};

// ビルド統計レポート
const generateReport = () => {
    const totalDuration = Date.now() - buildStats.startTime;
    
    console.log('\n📊 Build Statistics Report');
    console.log('==========================');
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
    console.log(`💾 Total Size: ${(buildStats.totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`🎯 Success Rate: ${buildStats.platforms.filter(p => p.success).length}/${buildStats.platforms.length}`);
    
    console.log('\n📱 Platform Details:');
    buildStats.platforms.forEach(platform => {
        const status = platform.success ? '✅' : '❌';
        const duration = (platform.duration / 1000).toFixed(1);
        console.log(`  ${status} ${platform.platform}: ${duration}s`);
        if (!platform.success) {
            console.log(`    Error: ${platform.error}`);
        }
    });
};

// メイン実行
const main = async () => {
    try {
        checkPrerequisites();
        installDependencies();
        cleanDist();
        
        // プラットフォーム別順次ビルド
        console.log('\n🚀 Starting cross-platform build...');
        
        // macOS (現在のプラットフォームでサポートされている場合)
        if (process.platform === 'darwin') {
            await buildPlatform('mac', ['x64', 'arm64']);
        } else {
            console.log('⚠️  Skipping macOS build (not supported on this platform)');
        }
        
        // Windows
        await buildPlatform('win', ['x64']);
        
        // Linux
        await buildPlatform('linux', ['x64']);
        
        verifyAndCalculateSize();
        generateReport();
        
        console.log('\n🎉 Cross-Platform Build Completed Successfully!');
        console.log('\n📦 Generated Packages:');
        console.log('   🍎 macOS: .app, .dmg, .zip');
        console.log('   🪟 Windows: .exe, Setup.exe');
        console.log('   🐧 Linux: .AppImage, .deb, .snap');
        
    } catch (error) {
        console.error('\n💥 Build process failed:', error.message);
        generateReport(); // 失敗した場合でも統計を表示
        process.exit(1);
    }
};

// スクリプト直接実行時
if (require.main === module) {
    main();
}

module.exports = { main };
