import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class WebSocketManager {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.wss = null;
        this.clients = new Map();
        this.reverseConnections = new Map();
        this.groupInfoCache = new Map();
        this.onebotAdapter = null;
        this.clientConnections = new Map();
        this.pluginManager = null;
        this.statusManager = null;
    }

    setOneBotAdapter(adapter) {
        this.onebotAdapter = adapter;
    }

    setStatusManager(manager) {
        this.statusManager = manager;
        if (manager) {
            manager.on('log', (log) => {
                this.broadcastToClients({
                    type: 'log',
                    ...log
                });
            });
        }
    }

    setPluginManager(manager) {
        this.pluginManager = manager;
    }

    async apiCall(clientId, action, params) {
        const client = this.clientConnections.get(clientId);
        if (!client || client.ws.readyState !== 1) {
            throw new Error('Client connection not available');
        }

        return new Promise((resolve, reject) => {
            const echo = uuidv4();
            const request = {
                action,
                params,
                echo
            };

            client.pendingApiRequests.set(echo, { resolve, reject });

            client.ws.send(JSON.stringify(request));

            setTimeout(() => {
                if (client.pendingApiRequests.has(echo)) {
                    client.pendingApiRequests.delete(echo);
                    reject(new Error('API request timeout'));
                }
            }, 5000);
        });
    }

    handleApiResponse(clientId, response) {
        const client = this.clientConnections.get(clientId);
        if (!client) return;

        if (response.echo && client.pendingApiRequests.has(response.echo)) {
            const { resolve, reject } = client.pendingApiRequests.get(response.echo);
            client.pendingApiRequests.delete(response.echo);

            if (response.status === 'ok') {
                resolve(response.data);
            } else {
                reject(new Error(response.retcode));
            }
        }
    }

    async initialize() {
        const server = this.getServer();
        if (!server) {
            throw new Error('HTTP server not available');
        }

        this.wss = new WebSocketServer({
            server,
            path: this.config.get('websocket.reverse_proxy.path')
        });

        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        this.wss.on('error', (error) => {
            this.logger.error('WebSocket server error:', error);
        });

        this.logger.info(`WebSocket server listening on ${this.config.get('websocket.reverse_proxy.path')}`);
    }

    handleConnection(ws, req) {
        const clientId = uuidv4();
        ws.clientId = clientId;

        this.clients.set(clientId, {
            ws,
            connectedAt: Date.now(),
            ip: req.socket.remoteAddress
        });

        this.clientConnections.set(clientId, {
            ws,
            pendingApiRequests: new Map()
        });

        this.logger.info(`Client connected: ${clientId} from ${req.socket.remoteAddress}`);

        ws.on('message', (data) => {
            this.handleMessage(clientId, data);
        });

        ws.on('close', () => {
            this.handleClose(clientId);
        });

        ws.on('error', (error) => {
            this.logger.error(`Client ${clientId} error:`, error);
        });

        ws.send(JSON.stringify({
            type: 'connected',
            client_id: clientId,
            timestamp: Date.now()
        }));
    }

    handleMessage(clientId, data) {
        try {
            const message = JSON.parse(data.toString());

            if (message.echo && message.status) {
                this.handleApiResponse(clientId, message);
                return;
            }

            this.logger.debug(`Message from ${clientId}:`, message);

            if (message.action === 'forward' && message.target) {
                this.forwardToTarget(clientId, message);
            } else if (message.post_type) {
                this.handleOneBotMessage(clientId, message);
            } else if (message.type === 'onebot') {
                this.handleOneBotMessage(clientId, message);
            }
        } catch (error) {
            this.logger.error(`Invalid message from ${clientId}:`, error);
        }
    }

    async handleOneBotMessage(clientId, message) {
        if (message.post_type === 'message') {
            const msgType = message.message_type;
            const userId = message.user_id;
            const groupId = message.group_id;
            const rawMsg = message.raw_message || message.message;
            const sender = message.sender || {};

            const nickname = sender.nickname || sender.card || '未知';
            const userIdStr = String(userId);
            const groupIdStr = groupId ? String(groupId) : null;

            let groupName = null;
            if (groupIdStr) {
                groupName = await this.getGroupName(groupIdStr, clientId) || `群${groupIdStr}`;
            }

            const context = this.createMessageContext(clientId, message);

            if (this.pluginManager) {
                const processed = await this.pluginManager.processMessage(message, context);

                if (processed.dropped) {
                    const logMsg = `消息被插件 ${processed.by} 拦截`;
                    this.logger.info(logMsg);
                    if (this.statusManager) {
                        this.statusManager.addLog('warn', logMsg);
                    }
                    return;
                }

                const finalMessage = processed.message;
                const finalRawMsg = finalMessage.raw_message || finalMessage.message;
                const finalSender = finalMessage.sender || {};

                const finalNickname = finalSender.nickname || finalSender.card || nickname;
                const finalGroupId = finalMessage.group_id;
                const finalGroupIdStr = finalGroupId ? String(finalGroupId) : groupIdStr;
                const finalGroupName = finalGroupIdStr ? (await this.getGroupName(finalGroupIdStr, clientId) || groupName || `群${finalGroupIdStr}`) : groupName;

                let logMsg;
                if (msgType === 'private') {
                    logMsg = `私聊 [${finalNickname}(${finalMessage.user_id})]: ${finalRawMsg}`;
                } else if (msgType === 'group') {
                    logMsg = `群聊 [${finalGroupName}(${finalGroupIdStr})] [${finalNickname}(${finalMessage.user_id})]: ${finalRawMsg}`;
                }

                this.logger.info(logMsg);
                if (this.statusManager) {
                    this.statusManager.incrementMessageCount();
                    this.statusManager.addLog('info', logMsg);
                }

                this.broadcastToClients({
                    type: 'onebot_message',
                    post_type: 'message',
                    message_type: msgType,
                    user_id: String(finalMessage.user_id),
                    group_id: finalGroupIdStr,
                    nickname: finalNickname,
                    group_name: finalGroupName,
                    message: finalRawMsg,
                    raw: finalMessage
                });
            } else {
                if (msgType === 'private') {
                    this.logger.info(`私聊 [${nickname}(${userIdStr})]: ${rawMsg}`);
                } else if (msgType === 'group') {
                    this.logger.info(`群聊 [${groupName}(${groupIdStr})] [${nickname}(${userIdStr})]: ${rawMsg}`);
                }

                this.broadcastToClients({
                    type: 'onebot_message',
                    post_type: 'message',
                    message_type: msgType,
                    user_id: userIdStr,
                    group_id: groupIdStr,
                    nickname: nickname,
                    group_name: groupName || `群${groupIdStr}`,
                    message: rawMsg,
                    raw: message
                });
            }
        } else if (message.post_type === 'meta_event') {
            const eventType = message.meta_event_type;
            if (eventType === 'heartbeat') {
                this.logger.debug(`心跳 from ${message.self_id}`);
            } else {
                this.logger.info(`元事件: ${eventType}`);
            }
        } else if (message.post_type === 'notice') {
            this.logger.info(`通知: ${message.notice_type}`);
        } else if (message.post_type === 'request') {
            this.logger.info(`请求: ${message.request_type}`);
        }
    }

    createMessageContext(clientId, message) {
        return {
            clientId,
            message,
            wsManager: this,
            logger: this.logger
        };
    }

    broadcastToClients(data) {
        this.clients.forEach((client) => {
            if (client.ws.readyState === 1) {
                client.ws.send(JSON.stringify(data));
            }
        });
    }

    async getGroupName(groupId, clientId) {
        if (this.groupInfoCache.has(groupId)) {
            return this.groupInfoCache.get(groupId).group_name;
        }

        if (clientId && this.clientConnections.has(clientId)) {
            try {
                const info = await this.apiCall(clientId, 'get_group_info', {
                    group_id: String(groupId)
                });
                if (info && info.group_name) {
                    this.groupInfoCache.set(groupId, {
                        group_name: info.group_name,
                        timestamp: Date.now()
                    });
                    return info.group_name;
                }
            } catch (e) {
                this.logger.debug(`获取群名失败: ${groupId}`, e);
            }
        }

        return null;
    }

    forwardToTarget(clientId, message) {
        const targetId = message.target;
        const target = this.reverseConnections.get(targetId);

        if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
                ...message.data,
                _source: clientId,
                _timestamp: Date.now()
            }));
        }
    }

    handleClose(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            const duration = Date.now() - client.connectedAt;
            this.logger.info(`Client disconnected: ${clientId} (duration: ${duration}ms)`);
        }

        this.clients.delete(clientId);
        this.clientConnections.delete(clientId);
    }

    async connectToReverseProxy(url, token = null) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(url);

            const connectionId = uuidv4();

            ws.on('open', () => {
                this.reverseConnections.set(connectionId, {
                    ws,
                    connectedAt: Date.now(),
                    url
                });

                if (token) {
                    ws.send(JSON.stringify({
                        type: 'auth',
                        token
                    }));
                }

                this.logger.info(`Connected to reverse proxy: ${url} (${connectionId})`);
                resolve(connectionId);
            });

            ws.on('message', (data) => {
                this.handleReverseMessage(connectionId, data);
            });

            ws.on('close', () => {
                this.logger.info(`Reverse proxy disconnected: ${connectionId}`);
                this.reverseConnections.delete(connectionId);
            });

            ws.on('error', (error) => {
                this.logger.error(`Reverse proxy error (${connectionId}):`, error);
                reject(error);
            });

            setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    handleReverseMessage(connectionId, data) {
        try {
            const message = JSON.parse(data.toString());

            this.clients.forEach((client, clientId) => {
                if (client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(JSON.stringify({
                        type: 'forward',
                        source: connectionId,
                        data: message
                    }));
                }
            });
        } catch (error) {
            this.logger.error(`Invalid message from reverse proxy ${connectionId}:`, error);
        }
    }

    getServer() {
        return this._server;
    }

    setServer(server) {
        this._server = server;
    }

    getConnectionCount() {
        return this.clients.size;
    }

    getReverseConnectionCount() {
        return this.reverseConnections.size;
    }

    async shutdown() {
        this.logger.info('Shutting down WebSocket manager...');

        this.clients.forEach((client) => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.close(1001, 'Server shutdown');
            }
        });

        this.reverseConnections.forEach((conn) => {
            if (conn.ws.readyState === WebSocket.OPEN) {
                conn.ws.close(1001, 'Server shutdown');
            }
        });

        return new Promise((resolve) => {
            if (this.wss) {
                this.wss.close(() => {
                    this.logger.info('WebSocket server closed');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
}
