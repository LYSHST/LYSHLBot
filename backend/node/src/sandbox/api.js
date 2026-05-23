export class SandboxAPI {
    constructor(logger, pluginManager, wsManager, broadcastToClients) {
        this.logger = logger;
        this.pluginManager = pluginManager;
        this.wsManager = wsManager;
        this.broadcastToClients = broadcastToClients;

        this.messages = [];
        this.maxMessages = 500;
    }

    setupRoutes(app) {
        app.post('/api/sandbox/send', async (req, res) => {
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

                this.broadcastToClients({
                    type: 'sandbox_message',
                    message: sandboxMessage
                });

                await this.processMessage(sandboxMessage);

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

        app.get('/api/sandbox/messages', (req, res) => {
            const limit = parseInt(req.query.limit) || 100;
            const messages = this.messages.slice(-limit);
            res.json({ messages });
        });

        app.delete('/api/sandbox/messages', (req, res) => {
            this.messages = [];
            res.json({ success: true });
        });

        app.get('/api/sandbox/status', (req, res) => {
            res.json({
                active: true,
                message_count: this.messages.length
            });
        });

        app.get('/api/sandbox/groups', (req, res) => {
            const groups = [
                { group_id: '1000000001', group_name: '测试群聊 A' },
                { group_id: '1000000002', group_name: '测试群聊 B' },
                { group_id: '1000000003', group_name: '开发交流群' }
            ];
            res.json({ groups });
        });

        app.get('/api/sandbox/users', (req, res) => {
            const users = [
                { user_id: '1000000001', nickname: '测试用户 A', card: '' },
                { user_id: '1000000002', nickname: '测试用户 B', card: '群名片B' },
                { user_id: '1000000003', nickname: '开发者', card: '' }
            ];
            res.json({ users });
        });
    }

    async processMessage(message) {
        if (!this.pluginManager) {
            this.logger.warn('[沙箱] 插件管理器未初始化');
            return;
        }

        this.logger.info(`[沙箱] 开始处理消息: ${message.raw_message || message.message}`);

        const context = {
            clientId: 'sandbox',
            message,
            wsManager: this.wsManager,
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

        if (this.broadcastToClients) {
            this.broadcastToClients(data);
        }

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

        if (this.broadcastToClients) {
            this.broadcastToClients(data);
        }

        return { success: true, message_id: `sandbox_send_${Date.now()}` };
    }
}

export default SandboxAPI;
