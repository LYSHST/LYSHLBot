@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║                    LYSHLbot 安装程序                          ║
echo  ║                    Windows 版本 v1.0.0                        ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

REM 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js
    echo 请先安装 Node.js (>=18.0.0)
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo [检查] Node.js 版本...
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo       已安装: %NODE_VERSION%

REM 检查 npm
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 npm
    pause
    exit /b 1
)

echo [检查] npm 版本...
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo       已安装: %NPM_VERSION%

echo.
echo [安装] 正在安装依赖包...
call npm install
if %errorlevel% neq 0 (
    echo [错误] 依赖安装失败
    pause
    exit /b 1
)

echo.
echo [配置] 正在创建配置文件...
if not exist "config" mkdir config
if not exist "logs" mkdir logs
if not exist "plugins" mkdir plugins

if not exist ".env" (
    copy .env.example .env
    echo       已创建 .env 文件
)

echo.
echo [完成] 安装完成！
echo.
echo 使用以下命令启动:
echo   npm start    - 启动服务
echo   npm run dev  - 开发模式
echo.

REM TODO: Windows 服务安装脚本接口
REM 在此预留位置对接 Windows 服务安装逻辑
REM 例如: nssm, winsw 等服务管理工具
echo [提示] 如需安装为 Windows 服务，请运行:
echo        scripts\windows\install-service.bat
echo.

pause
