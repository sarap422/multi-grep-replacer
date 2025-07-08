/**
 * macOS専用ビルドスクリプト
 * Multi Grep Replacer - macOS .app/.dmg パッケージ作成
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🍎 Multi Grep Replacer - macOS Build Script');
console.log('===========================================');

// プロジェクトルート確認
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

console.log(`📁 Project Root: ${projectRoot}`);

// 前提条件チェック
const checkPrerequisites = () => {
    console.log('\n🔍 Prerequisites Check...');
    
    // package.json確認
    if (!fs.existsSync('package.json')) {
        throw new Error('❌ package.json not found');
    }
    
    // package.jsonのbuild設定確認
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.build) {
        throw new Error('❌ package.json build configuration not found');
    }
    
    // アイコンファイル確認
    if (!fs.existsSync('build/icons/icon.icns')) {
        console.log('⚠️  Warning: icon.icns not found, using placeholder');
    }
    
    // entitlements確認
    if (!fs.existsSync('build/entitlements.mac.plist')) {
        throw new Error('❌ build/entitlements.mac.plist not found');
    }
    
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

// macOSビルド実行
const buildMac = () => {
    console.log('\n🏗️  Building macOS application...');
    try {
        const buildCommand = 'npx electron-builder --mac';
        console.log(`Running: ${buildCommand}`);
        execSync(buildCommand, { stdio: 'inherit' });
        console.log('✅ macOS build completed successfully');
    } catch (error) {
        console.error('❌ macOS build failed');
        throw error;
    }
};

// ビルド結果確認
const verifyBuild = () => {
    console.log('\n🔍 Verifying build results...');
    
    const expectedFiles = [
        'dist/mac/Multi Grep Replacer.app',
        'dist/Multi Grep Replacer-1.0.0-mac.zip',
        'dist/Multi Grep Replacer-1.0.0.dmg'
    ];
    
    let allFound = true;
    expectedFiles.forEach(file => {
        if (fs.existsSync(file)) {
            const stats = fs.statSync(file);
            console.log(`✅ ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        } else {
            console.log(`❌ ${file} - NOT FOUND`);
            allFound = false;
        }
    });
    
    if (allFound) {
        console.log('🎉 All expected files generated successfully!');
    } else {
        console.warn('⚠️  Some expected files were not generated');
    }
};

// メイン実行
const main = async () => {
    try {
        checkPrerequisites();
        installDependencies();
        cleanDist();
        buildMac();
        verifyBuild();
        
        console.log('\n🎉 macOS Build Process Completed Successfully!');
        console.log('\n📦 Generated Files:');
        console.log('   - Multi Grep Replacer.app  (macOS Application)');
        console.log('   - Multi Grep Replacer.dmg  (macOS Installer)');
        console.log('   - Multi Grep Replacer.zip  (Portable Archive)');
        
    } catch (error) {
        console.error('\n💥 Build process failed:', error.message);
        process.exit(1);
    }
};

// スクリプト直接実行時
if (require.main === module) {
    main();
}

module.exports = { main };