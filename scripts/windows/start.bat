@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                      LYSHLbot 启动器                          ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

node backend\node\src\index.js

if %errorlevel% neq 0 (
    echo.
    echo [错误] 服务启动失败
    pause
)
