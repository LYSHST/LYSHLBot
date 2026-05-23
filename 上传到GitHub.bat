@echo off
chcp 65001 >nul
title LYSHLbot - GitHub 上传工具

echo.
echo  ╔═══════════════════════════════════════════════╗
echo  ║       LYSHLbot GitHub 上传工具 v1.0.0      ║
echo  ╚═══════════════════════════════════════════════╝
echo.

:: 检查 Git 是否安装
git --version >nul 2>&1
if errorlevel 1 (
    echo [错误] Git 未安装！
    echo.
    echo 请先安装 Git：
    echo 1. 访问 https://git-scm.com/download/win
    echo 2. 下载并安装
    echo 3. 重新运行此脚本
    echo.
    pause
    exit /b 1
)

echo [检查] Git 已安装
echo.

:: 获取 GitHub 用户名
set /p github_user=请输入你的 GitHub 用户名: 

if "%github_user%"=="" (
    echo [错误] 用户名不能为空！
    pause
    exit /b 1
)

echo.
echo [配置] 设置 Git 用户信息...

:: 设置 Git 用户名和邮箱
git config --global user.name "%github_user%"
git config --global user.email "%github_user%@users.noreply.github.com"

:: 初始化仓库
echo.
echo [初始化] 初始化 Git 仓库...
git init

:: 添加所有文件
echo.
echo [添加] 添加文件到暂存区...
git add .

:: 提交
echo.
echo [提交] 提交代码...
git commit -m "Initial commit - LYSHLbot v1.0.0"

:: 添加远程仓库
echo.
echo [远程] 添加 GitHub 仓库...
git remote add origin https://github.com/%github_user%/LYSHLbot.git

:: 重命名分支
git branch -M main

echo.
echo ═══════════════════════════════════════════════════
echo.
echo [推送] 准备推送到 GitHub...
echo.
echo 请在浏览器中完成以下操作：
echo 1. 打开 https://github.com/new
echo 2. Repository name 输入: LYSHLbot
echo 3. Description 输入: OneBot 协议 QQ 机器人框架
echo 4. 选择 Public 或 Private
echo 5. 点击 Create repository
echo.
echo 完成后按回车继续...
pause >nul

:: 推送
echo.
echo [推送] 正在推送代码...
git push -u origin main

if errorlevel 1 (
    echo.
    echo [错误] 推送失败！
    echo.
    echo 可能需要：
    echo 1. 配置 SSH 公钥到 GitHub
    echo 2. 或使用 Personal Access Token
    echo.
    echo 详细教程请查看: 上传到GitHub指南.md
    pause
    exit /b 1
)

echo.
echo ═══════════════════════════════════════════════════
echo.
echo [成功] 代码已上传到 GitHub！
echo.
echo 访问你的仓库: https://github.com/%github_user%/LYSHLbot
echo.
echo 记得：
echo - 添加 LICENSE 文件（已包含）
echo - 更新项目描述
echo - 添加徽章
echo.
pause
