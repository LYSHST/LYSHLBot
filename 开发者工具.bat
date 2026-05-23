@echo off
chcp 65001 >nul
title LYSHLbot - 开发者模式

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║         LYSHLbot 开发者模式                ║
echo  ╚═══════════════════════════════════════════════╝
echo.

:menu
echo 请选择操作：
echo   [1] 安装依赖
echo   [2] 启动服务
echo   [3] 完整安装并启动
echo   [4] 退出
echo.
set /p choice=请输入选项 [1-4]:

if "%choice%"=="1" goto install
if "%choice%"=="2" goto start
if "%choice%"=="3" goto full
if "%choice%"=="4" goto end

echo 无效选项，请重新选择！
echo.
goto menu

:install
echo.
echo [安装] 正在安装依赖...
call npm install
if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败！
    pause
    goto menu
)
echo.
echo [完成] 依赖安装完成！
echo.
pause
goto menu

:start
echo.
echo [启动] 正在启动服务...
echo.
call npm start
goto menu

:full
echo.
echo [安装] 正在安装依赖...
call npm install
if errorlevel 1 (
    echo.
    echo [错误] 依赖安装失败！
    pause
    goto menu
)
echo.
echo [启动] 正在启动服务...
echo.
call npm start
goto menu

:end
echo.
echo 再见！
timeout /t 2 >nul
exit
