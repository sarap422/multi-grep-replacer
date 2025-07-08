# Multi Grep Replacer NSIS Installer Configuration
# Windows用インストーラーのカスタム設定

# アプリケーション情報
\!define PRODUCT_NAME "Multi Grep Replacer"
\!define PRODUCT_VERSION "1.0.0"
\!define PRODUCT_PUBLISHER "Multi Grep Replacer Development"
\!define PRODUCT_DESCRIPTION "クロスプラットフォーム対応の高速一括置換ツール"

# インストーラーの外観設定
\!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\orange-install.ico"
\!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\orange-uninstall.ico"

# Welcome/Finish ページの設定
\!define MUI_WELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\orange.bmp"
\!define MUI_UNWELCOMEFINISHPAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Wizard\orange-uninstall.bmp"

# ヘッダー画像
\!define MUI_HEADERIMAGE
\!define MUI_HEADERIMAGE_BITMAP "${NSISDIR}\Contrib\Graphics\Header\orange.bmp"
\!define MUI_HEADERIMAGE_UNBITMAP "${NSISDIR}\Contrib\Graphics\Header\orange-uninstall.bmp"

# 追加のカスタマイズ
\!define MUI_ABORTWARNING
\!define MUI_UNABORTWARNING

# ファイル関連付け（将来用）
; \!define ASSOCIATE_EXT ".mgr"
; \!define ASSOCIATE_PROGID "MultiGrepReplacer.Config"
; \!define ASSOCIATE_DESCRIPTION "Multi Grep Replacer Configuration"

# カスタムページ（必要に応じて）
; \!insertmacro MUI_PAGE_WELCOME
; \!insertmacro MUI_PAGE_LICENSE "LICENSE"
; \!insertmacro MUI_PAGE_COMPONENTS
; \!insertmacro MUI_PAGE_DIRECTORY
; \!insertmacro MUI_PAGE_INSTFILES
; \!insertmacro MUI_PAGE_FINISH

EOF < /dev/null