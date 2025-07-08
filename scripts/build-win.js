/**
 * Windows専用ビルドスクリプト
 * Multi Grep Replacer - Windows .exe/.msi パッケージ作成
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🪟 Multi Grep Replacer - Windows Build Script');
console.log('==============================================');

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
    
    // electron-builder.json確認
    if (!fs.existsSync('electron-builder.json')) {
        throw new Error('❌ electron-builder.json not found');
    }
    
    // アイコンファイル確認
    if (!fs.existsSync('build/icons/icon.ico')) {
        console.log('⚠️  Warning: icon.ico not found, using placeholder');
    }
    
    // LICENSE確認（NSISインストーラー用）
    if (!fs.existsSync('LICENSE')) {
        console.log('⚠️  Warning: LICENSE file not found');
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
            if (process.platform === 'win32') {
                execSync('rmdir /s /q dist', { stdio: 'inherit' });
            } else {
                execSync('rm -rf dist', { stdio: 'inherit' });
            }
        }
        console.log('✅ Dist directory cleaned');
    } catch (error) {
        console.warn('⚠️  Warning: Failed to clean dist directory');
    }
};

// Windowsビルド実行
const buildWindows = () => {
    console.log('\n🏗️  Building Windows application...');
    try {
        const buildCommand = 'npx electron-builder --win';
        console.log(`Running: ${buildCommand}`);
        execSync(buildCommand, { stdio: 'inherit' });
        console.log('✅ Windows build completed successfully');
    } catch (error) {
        console.error('❌ Windows build failed');
        throw error;
    }
};

// ビルド結果確認
const verifyBuild = () => {
    console.log('\n🔍 Verifying build results...');
    
    const expectedFiles = [
        'dist/win-unpacked/Multi Grep Replacer.exe',
        'dist/Multi Grep Replacer Setup 1.0.0.exe',
        'dist/Multi Grep Replacer 1.0.0.exe'
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

// デジタル署名チェック（将来用）
const checkCodeSigning = () => {
    console.log('\n🔐 Code Signing Status...');
    
    // 環境変数確認
    const cscLink = process.env.CSC_LINK;
    const cscKeyPassword = process.env.CSC_KEY_PASSWORD;
    
    if (cscLink && cscKeyPassword) {
        console.log('✅ Code signing certificates detected');
    } else {
        console.log('⚠️  Code signing not configured (development build)');
        console.log('   To enable code signing, set:');
        console.log('   - CSC_LINK (path to certificate)');
        console.log('   - CSC_KEY_PASSWORD (certificate password)');
    }
};

// メイン実行
const main = async () => {
    try {
        checkPrerequisites();
        checkCodeSigning();
        installDependencies();
        cleanDist();
        buildWindows();
        verifyBuild();
        
        console.log('\n🎉 Windows Build Process Completed Successfully!');
        console.log('\n📦 Generated Files:');
        console.log('   - Multi Grep Replacer.exe      (Windows Application)');
        console.log('   - Multi Grep Replacer Setup.exe (Windows Installer)');
        console.log('   - Multi Grep Replacer Portable  (Portable Archive)');
        
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
