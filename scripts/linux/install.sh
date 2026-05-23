#!/bin/bash

set -e

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    LYSHLbot 安装程序                          ║"
echo "║                    Linux 版本 v1.0.0                          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# 检查 Root 权限
if [ "$EUID" -eq 0 ]; then
    echo "[警告] 建议不要使用 root 用户运行"
    echo ""
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未检测到 Node.js"
    echo "请先安装 Node.js (>=18.0.0)"
    echo ""
    echo "Ubuntu/Debian:"
    echo "  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -"
    echo "  sudo apt-get install -y nodejs"
    echo ""
    echo "CentOS/RHEL:"
    echo "  curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -"
    echo "  sudo yum install -y nodejs"
    echo ""
    exit 1
fi

echo "[检查] Node.js 版本..."
NODE_VERSION=$(node -v)
echo "       已安装: $NODE_VERSION"

# 检查 npm
if ! command -v npm &> /dev/null; then
    echo "[错误] 未检测到 npm"
    exit 1
fi

echo "[检查] npm 版本..."
NPM_VERSION=$(npm -v)
echo "       已安装: $NPM_VERSION"

echo ""
echo "[安装] 正在安装依赖包..."
npm install
if [ $? -ne 0 ]; then
    echo "[错误] 依赖安装失败"
    exit 1
fi

echo ""
echo "[配置] 正在创建配置文件..."
mkdir -p config logs plugins

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "       已创建 .env 文件"
fi

# 设置权限
chmod +x scripts/linux/*.sh 2>/dev/null || true

echo ""
echo "[完成] 安装完成！"
echo ""
echo "使用以下命令启动:"
echo "  npm start          - 启动服务"
echo "  npm run dev        - 开发模式"
echo "  bash scripts/linux/start-daemon.sh  - 后台运行"
echo ""

# TODO: Linux 服务管理接口
# 在此预留位置对接 systemd, init.d 等服务管理逻辑
echo "[提示] 如需安装为系统服务:"
echo "       sudo cp scripts/linux/lyshlbot.service /etc/systemd/system/"
echo "       sudo systemctl daemon-reload"
echo "       sudo systemctl enable lyshlbot"
echo "       sudo systemctl start lyshlbot"
echo ""

echo "[提示] 如需开机自启:"
echo "       sudo systemctl enable lyshlbot"
echo ""
