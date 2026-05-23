@echo off
chcp 65001 >nul
title LYSHLbot - 打包工具

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║         LYSHLbot 打包工具 v1.0.0          ║
echo  ╚═══════════════════════════════════════════════╝
echo.

set CURRENT_DIR=%~dp0
set ZIP_NAME=LYSHLbot-v1.0.0

echo [打包] 正在创建压缩包...
echo.

if exist "%ZIP_NAME%.zip" (
    del /q "%ZIP_NAME%.zip"
    echo [清理] 已删除旧压缩包
)

echo [打包] 正在压缩文件...
echo.

powershell -Command "Add-Type -Assembly 'System.IO.Compression.FileSystem'; $source = '%CURRENT_DIR:~0,-1%'; $zip = '%CURRENT_DIR%%ZIP_NAME%.zip'; $exclusions = @('node_modules', '.git', '*.zip', '.DS_Store', 'Thumbs.db'); Compress-Archive -Path $source -DestinationPath $zip -Force -ExcludeItem @('node_modules', '.git')"

if errorlevel 1 (
    echo.
    echo [错误] 打包失败！
    echo [提示] 请确保已安装 PowerShell 5.0+
    pause
    exit /b 1
)

for %%A in ("%ZIP_NAME%.zip") do set SIZE=%%~zA
set /a SIZE_MB=%SIZE:~0,-3% / 1024

echo.
echo ═══════════════════════════════════════════════════
echo.
echo [完成] 打包成功！
echo.
echo 文件：%ZIP_NAME%.zip
echo 大小：约 %SIZE_MB% MB
echo.
echo 包含内容：
echo   - 源代码
echo   - 示例插件
echo   - 启动脚本
echo   - 使用文档
echo.
echo 不包含：
echo   - node_modules（需运行安装）
echo.
pause
