# LYSHLbot 使用指南

[点击打开文档](https://doc.styyds.qzz.io/)
---
## 快速启动

### 方式一：手动安装（已修复）
下载项目
```
git clone https://github.com/LYSHST/LYSHLBot.git
cd LYSHLBot
```
安装依赖并启动
```
npm install
npm audit fix --force
npm start
```

### 这是专门为Windows制作的的框架，其他系统可能会出现问题。

### 方式二：一键启动（未修复）
直接双击运行 `启动.bat`，会自动检测并安装依赖，然后启动服务。

### 方式三：开发者模式（未修复）
运行 `开发者工具.bat`，可以选择：
- 安装依赖
- 启动服务
- 完整安装并启动

## 访问地址

启动后访问：**http://localhost:3000**

## 功能概览

### 1. 仪表盘
- 查看运行时间
- 查看连接数
- 查看消息数量
- 查看协议版本

### 2. 连接管理
- WebSocket 反向代理配置
- NapCat 连接管理

### 3. 插件管理
- 查看已安装插件
- 启用/禁用插件
- 修改插件优先级

### 4. 沙箱测试
- 模拟发送消息
- 测试插件功能
- 实时查看插件响应

### 5. 日志
- 查看系统日志
- 清空日志

## 插件开发

### 插件目录结构
```
data/plugins/
├── 插件文件夹/
│   ├── config.js     # 插件信息
│   └── main.js      # 插件主入口
```

### config.js 示例
```javascript
export default {
    name: '插件名称',
    version: '1.0.0',
    author: '作者',
    description: '描述',
    priority: 50
};
```

### main.js 示例
```javascript
export default {
    greeting: '你好',

    onLoad(ctx, plugin) {
        this.greeting = '你好';
    },

    async onMessage(message, ctx) {
        const rawMsg = (message.raw_message || message.message || '').trim();

        if (rawMsg === '/hello') {
            await ctx.sendPrivateMessage(message.user_id, `${this.greeting}! v${plugin.version}`);
            return null;
        }

        return message;
    }
};
```

## 技术栈

- **后端**：Node.js + Express + WebSocket
- **前端**：原生 HTML/CSS/JavaScript
- **协议**：OneBot v11
- **日志**：Chalk + Figlet

## 端口说明

| 端口 | 用途 |
|------|------|
| 3000 | 主服务 + WebUI |
| 3001 | NapCat 连接（需要 NapCat 运行） |

## 常见问题

### 1. NapCat 连接失败
这是正常的，如果不需要主动连接 NapCat 可以忽略。服务本身可以正常运行。

### 2. 插件不响应
- 检查插件是否启用
- 检查消息类型（群聊/私聊）
- 使用沙箱测试插件功能

### 3. 端口被占用
修改 `backend/node/src/config/index.js` 中的端口配置。

## 开发者

如需重新打包：
```bash
npm run build
```

## 版本

当前版本：1.0.0
