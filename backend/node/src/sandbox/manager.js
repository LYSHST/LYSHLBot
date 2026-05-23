import express from 'express';
import { WebSocketServer } from 'ws';

export class SandboxManager {
    constructor(logger) {
        this.logger = logger;
        this.app = express();
        this.server = null;
        this.wss = null;
        this.port = 3002;
        this.pluginManager = null;
        this.wsManager = null;

        this.messages = [];
        this.maxMessages = 500;

        this.setupRoutes();
    }

    setPluginManager(pluginManager) {
        this.pluginManager = pluginManager;
    }

    setWsManager(wsManager) {
        this.wsManager = wsManager;
    }

    setupRoutes() {
        this.app.use(express.json());

        this.app.post('/api/sandbox/send', async (req, res) => {
            try {
                const { user_id, group_id, message, nickname, card } = req.body;

                if (!message) {
                    return res.status(400).json({ error: '消息内容不能为空' });
                }

                const sandboxMessage = {
                    post_type: 'message',
                    message_type: group_id ? 'group' : 'private',
                    user_id: user_id || '1000000001',
                    group_id: group_id || null,
                    message: message,
                    raw_message: message,
                    message_id: `sandbox_${Date.now()}`,
                    self_id: '9999999999',
                    time: Math.floor(Date.now() / 1000),
                    sender: {
                        user_id: user_id || '1000000001',
                        nickname: nickname || '沙箱用户',
                        card: card || ''
                    }
                };

                this.messages.push(sandboxMessage);
                if (this.messages.length > this.maxMessages) {
                    this.messages.shift();
                }

                this.logger.info(`[沙箱] 收到测试消息: ${message}`);

                this.broadcastSandbox({
                    type: 'sandbox_message',
                    message: sandboxMessage
                });

                this.logger.info(`[沙箱] pluginManager存在: ${!!this.pluginManager}`);

                if (this.pluginManager) {
                    this.logger.info(`[沙箱] 调用processSandboxMessage...`);
                    await this.processSandboxMessage(sandboxMessage);
                    this.logger.info(`[沙箱] processSandboxMessage完成`);
                } else {
                    this.logger.warn('[沙箱] pluginManager未初始化');
                }

                res.json({
                    success: true,
                    message_id: sandboxMessage.message_id,
                    echo: sandboxMessage
                });
            } catch (error) {
                this.logger.error('[沙箱] 处理消息失败:', error);
                res.status(500).json({ error: error.message });
            }
        });

        this.app.get('/api/sandbox/messages', (req, res) => {
            const limit = parseInt(req.query.limit) || 100;
            const messages = this.messages.slice(-limit);
            res.json({ messages });
        });

        this.app.delete('/api/sandbox/messages', (req, res) => {
            this.messages = [];
            res.json({ success: true });
        });

        this.app.get('/api/sandbox/status', (req, res) => {
            res.json({
                active: this.server !== null,
                port: this.port,
                message_count: this.messages.length
            });
        });

        this.app.get('/api/sandbox/groups', (req, res) => {
            const groups = [
                { group_id: '1000000001', group_name: '测试群聊 A' },
                { group_id: '1000000002', group_name: '测试群聊 B' },
                { group_id: '1000000003', group_name: '开发交流群' }
            ];
            res.json({ groups });
        });

        this.app.get('/api/sandbox/users', (req, res) => {
            const users = [
                { user_id: '1000000001', nickname: '测试用户 A', card: '' },
                { user_id: '1000000002', nickname: '测试用户 B', card: '群名片B' },
                { user_id: '1000000003', nickname: '开发者', card: '' }
            ];
            res.json({ users });
        });
    }

    async start() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, '127.0.0.1', () => {
                this.logger.info(`[沙箱] 测试服务器已启动: http://127.0.0.1:${this.port}`);
                resolve();
            });

            this.server.on('error', (error) => {
                this.logger.error('[沙箱] 服务器启动失败:', error);
                reject(error);
            });
        });
    }

    stop() {
        if (this.wss) {
            this.wss.close();
        }
        if (this.server) {
            this.server.close();
            this.server = null;
        }
        this.logger.info('[沙箱] 测试服务器已停止');
    }

    broadcastSandbox(data) {
        if (this.wss) {
            const message = JSON.stringify(data);
            this.wss.clients.forEach(client => {
                if (client.readyState === 1) {
                    client.send(message);
                }
            });
        }
    }

    async processSandboxMessage(message) {
        if (!this.pluginManager) {
            this.logger.warn('[沙箱] 插件管理器未初始化');
            return;
        }

        this.logger.info(`[沙箱] 开始处理消息: ${message.raw_message || message.message}`);

        const context = {
            clientId: 'sandbox',
            message,
            wsManager: this,
            logger: this.logger,
            sandboxMode: true
        };

        try {
            this.logger.info(`[沙箱] 调用插件管理器...`);
            const processed = await this.pluginManager.processMessage(message, context);
            this.logger.info(`[沙箱] 插件处理完成: dropped=${processed.dropped}`);

            if (processed.dropped) {
                this.logger.info(`[沙箱] 消息被插件 ${processed.by} 拦截`);
                return { dropped: true, by: processed.by };
            }

            return { dropped: false, message: processed.message };
        } catch (error) {
            this.logger.error('[沙箱] 消息处理失败:', error);
            return { error: error.message };
        }
    }

    async sendGroupMessage(group_id, message) {
        this.logger.info(`[沙箱] 发送群消息 [${group_id}]: ${message}`);

        const data = {
            type: 'sandbox_send',
            message_type: 'group',
            group_id: group_id,
            message: message,
            time: Date.now()
        };

        if (this.wsManager) {
            this.wsManager.broadcastToClients(data);
        }

        this.broadcastSandbox(data);

        return { success: true, message_id: `sandbox_send_${Date.now()}` };
    }

    async sendPrivateMessage(user_id, message) {
        this.logger.info(`[沙箱] 发送私聊消息 [${user_id}]: ${message}`);

        const data = {
            type: 'sandbox_send',
            message_type: 'private',
            user_id: user_id,
            message: message,
            time: Date.now()
        };

        if (this.wsManager) {
            this.wsManager.broadcastToClients(data);
        }

        this.broadcastSandbox(data);

        return { success: true, message_id: `sandbox_send_${Date.now()}` };
    }
}

export default SandboxManager;
