/**
 * Multi Grep Replacer テスト用JavaScriptファイル
 * 各種置換パターンのサンプルコード
 */

// 古い変数宣言（var → const/let）
var oldVariable = "古い変数宣言";
var anotherOldVar = 12345;
var isOldFlag = true;

// 関数内での古い変数使用
function oldFunction() {
    var localOldVar = "ローカル変数";
    console.log("旧関数:", oldVariable);
    return localOldVar;
}

// クラス定義（旧スタイル）
function OldClass(name) {
    this.name = name;
    this.oldProperty = "古いプロパティ";
}

OldClass.prototype.oldMethod = function() {
    return this.name + " - " + this.oldProperty;
};

// 新しいクラス記法
class NewClass {
    constructor(name) {
        this.name = name;
        this.oldProperty = "これも置換対象";
    }
    
    oldMethod() {
        return `${this.name} - ${this.oldProperty}`;
    }
    
    static oldStaticMethod() {
        return "古い静的メソッド";
    }
}

// 配列とオブジェクトの操作
const oldArray = ['old-item-1', 'old-item-2', 'old-item-3'];
const oldObject = {
    oldKey1: "古い値1",
    oldKey2: "古い値2",
    oldMethod: function() {
        return this.oldKey1 + " " + this.oldKey2;
    }
};

// DOM操作（古いメソッド → 新しいメソッド）
function oldDOMOperations() {
    // 古いクラス名でのDOM取得
    const oldElements = document.getElementsByClassName('old-class');
    const oldElement = document.getElementById('old-element');
    
    // 古いイベント登録方法
    oldElement.onclick = function() {
        alert('旧イベントハンドラー');
    };
    
    // 古いスタイル設定
    oldElement.style.backgroundColor = '#old-color';
    oldElement.className = 'old-active-class';
}

// jQuery風の古いセレクター（置換例）
function jQueryOldSelectors() {
    $('.old-selector').addClass('old-active');
    $('#old-id').removeClass('old-inactive');
    $('[data-old-attribute]').hide();
}

// API呼び出し（古いURL → 新しいURL）
async function oldAPICall() {
    try {
        const response = await fetch('/api/v1/old-endpoint');
        const data = await response.json();
        console.log('旧API応答:', data);
        return data;
    } catch (error) {
        console.error('旧APIエラー:', error);
    }
}

// 設定オブジェクト
const oldConfig = {
    apiUrl: 'https://old-api.example.com',
    oldTimeout: 5000,
    oldRetries: 3,
    features: {
        oldFeature1: true,
        oldFeature2: false
    }
};

// ユーティリティ関数
const oldUtils = {
    oldFormatDate: function(date) {
        // 古い日付フォーマット
        return date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate();
    },
    
    oldValidateEmail: function(email) {
        // 古いメール検証
        const oldEmailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        return oldEmailRegex.test(email);
    },
    
    oldDebounce: function(func, wait) {
        let oldTimeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(oldTimeout);
                func(...args);
            };
            clearTimeout(oldTimeout);
            oldTimeout = setTimeout(later, wait);
        };
    }
};

// イベントリスナー（旧記法）
document.addEventListener('DOMContentLoaded', function() {
    const oldButton = document.querySelector('.old-button');
    if (oldButton) {
        oldButton.addEventListener('click', function() {
            console.log('旧ボタンクリック');
            oldFunction();
        });
    }
});

// エクスポート（CommonJS → ES Modules）
module.exports = {
    oldVariable,
    oldFunction,
    OldClass,
    oldUtils,
    oldConfig
};

// 古いライブラリインポート
const oldLibrary = require('old-library-name');
const { oldMethod } = require('old-utils');

// 正規表現パターン
const oldPatterns = {
    oldUrlPattern: /^https?:\/\/old-domain\.com/,
    oldClassPattern: /\.old-[a-z-]+/g,
    oldVariablePattern: /\bold[A-Z][a-zA-Z]*\b/g
};

// 古いコメント記法
/*
 * 旧スタイルのコメントブロック
 * @param {string} oldParam - 古いパラメータ
 * @returns {string} oldResult - 古い戻り値
 */

// 古いブラウザ対応コード
if (typeof oldVariable === 'undefined') {
    var oldVariable = 'デフォルト値';
}

// 旧フレームワーク固有のコード
$(document).ready(function() {
    $('.old-accordion').accordion({
        oldOption: true
    });
});

console.log('✅ Sample JavaScript file loaded with old patterns');