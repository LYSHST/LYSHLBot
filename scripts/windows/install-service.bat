@echo off
chcp 65001 >nul
echo.
echo  ╔══════════════════════════════════════════════════════════════╗
echo  ║              LYSHLbot Windows 服务安装程序                    ║
echo  ╚══════════════════════════════════════════════════════════════╝
echo.

REM TODO: 在此实现 Windows 服务安装逻辑
REM 可以使用以下工具之一:
REM - NSSM (Non-Sucking Service Manager)
REM - WinSW (Windows Service Wrapper)
REM - srvany (Windows Server 2003 Resource Kit Tools)

echo [提示] 此脚本用于将 LYSHLbot 安装为 Windows 系统服务
echo.
echo [提示] 推荐使用 NSSM (Non-Sucking Service Manager)
echo        下载地址: https://nssm.cc/
echo.
echo [提示] 或者使用 WinSW
echo        下载地址: https://github.com/winsw/winsw/releases
echo.
echo 使用示例 (NSSM):
echo   nssm install LYSHLbot "C:\path\to\node.exe" "C:\path\to\backend\node\src\index.js"
echo   nssm set LYSHLbot AppDirectory "C:\path\to\lyshlbot"
echo   nssm set LYSHLbot DisplayName "LYSHLbot Service"
echo   nssm set LYSHLbot Description "OneBot Protocol Robot Framework"
echo   nssm start LYSHLbot
echo.
echo 使用示例 (WinSW):
echo   1. 将 WinSW.exe 重命名为 lyshlbot.exe
echo   2. 创建 lyshlbot.xml 配置文件
echo   3. 运行: lyshlbot.exe install
echo   4. 运行: lyshlbot.exe start
echo.
pause
