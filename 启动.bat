@echo off
chcp 65001 >nul
title LYSHLbot - 一键启动

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║         LYSHLbot 一键启动脚本 v1.0.0          ║
echo  ╚═══════════════════════════════════════════════╝
echo.

if not exist "node_modules" (
    echo [安装] 首次运行，正在安装依赖...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败！
        pause
        exit /b 1
    )
    echo.
)

echo [启动] 正在启动 LYSHLbot...
echo.
echo ═══════════════════════════════════════════════════
echo.

npm start

if errorlevel 1 (
    echo.
    echo [错误] 启动失败！
    pause
)
