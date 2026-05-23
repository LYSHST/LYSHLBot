import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';

export class OneBotAdapter {
    constructor(config, wsManager, logger) {
        this.config = config;
        this.wsManager = wsManager;
        this.logger = logger;
        this.connections = new Map();
        this.handlers = new Map();
        this.eventListeners = new Map();
    }

    async initialize() {
        this.registerDefaultHandlers();
        await this.connectToAdapters();
    }

    registerDefaultHandlers() {
        this.registerHandler('heartbeat', this.handleHeartbeat.bind(this));
        this.registerHandler('meta_event.heartbeat', this.handleHeartbeat.bind(this));
        this.registerHandler('message', this.handleMessage.bind(this));
        this.registerHandler('notice', this.handleNotice.bind(this));
        this.registerHandler('request', this.handleRequest.bind(this));
    }

    registerHandler(action, handler) {
        this.handlers.set(action, handler);
    }

    async connectToAdapters() {
        const adapters = this.config.get('onebot.adapters');

        if (adapters?.napcat?.enable) {
            await this.connectToNapcat(adapters.napcat);
        }
    }

    async connectToNapcat(config) {
        const connectionId = `napcat_${Date.now()}`;
        const wsUrl = config.ws_url || 'ws://127.0.0.1:3001';

        this.logger.info(`Connecting to NapCat at ${wsUrl}...`);

        const ws = new WebSocket(wsUrl);

        ws.on('open', () => {
            this.connections.set(connectionId, {
                ws,
                type: 'napcat',
                connectedAt: Date.now()
            });

            this.logger.success(`Connected to NapCat (${connectionId})`);

            if (config.reconnect) {
                this.setupHeartbeat(connectionId, config.heartbeat);
            }
        });

        ws.on('message', (data) => {
            this.handleIncomingMessage(connectionId, data);
        });

        ws.on('close', () => {
            this.logger.warn(`NapCat connection closed (${connectionId})`);
            this.connections.delete(connectionId);
        });

        ws.on('error', (error) => {
            this.logger.error(`NapCat connection error (${connectionId}):`, error);
        });
    }

    setupHeartbeat(connectionId, config) {
        const interval = config?.interval || 15000;

        const heartbeatTimer = setInterval(() => {
            const conn = this.connections.get(connectionId);
            if (conn && conn.ws.readyState === WebSocket.OPEN) {
                this.sendApiRequest(connectionId, 'ping', {});
            }
        }, interval);

        this.connections.get(connectionId).heartbeatTimer = heartbeatTimer;
    }

    handleIncomingMessage(connectionId, data) {
        try {
            const message = JSON.parse(data.toString());

            if (message.echo) {
                this.handleApiResponse(connectionId, message);
            } else if (message.post_type) {
                this.handleEvent(connectionId, message);
            }
        } catch (error) {
            this.logger.error('Invalid OneBot message:', error);
        }
    }

    handleEvent(connectionId, event) {
        const eventType = `${event.post_type}.${event.message_type || ''}`;

        if (this.eventListeners.has(eventType)) {
            this.eventListeners.get(eventType).forEach(handler => {
                handler(event, connectionId);
            });
        }

        const handler = this.handlers.get(event.post_type);
        if (handler) {
            handler(event, connectionId);
        }
    }

    handleHeartbeat(event, connectionId) {
        this.logger.debug(`Heartbeat received from ${connectionId}:`, event);
    }

    handleMessage(event, connectionId) {
        this.logger.info(`Message received: ${event.message_type}`, {
            user_id: event.user_id,
            group_id: event.group_id,
            message_id: event.message_id
        });
    }

    handleNotice(event, connectionId) {
        this.logger.debug(`Notice received:`, event);
    }

    handleRequest(event, connectionId) {
        this.logger.debug(`Request received:`, event);
    }

    async sendApiRequest(connectionId, action, params = {}) {
        return new Promise((resolve, reject) => {
            const conn = this.connections.get(connectionId);
            if (!conn || conn.ws.readyState !== WebSocket.OPEN) {
                reject(new Error('Connection not available'));
                return;
            }

            const echo = uuidv4();
            const request = {
                action,
                params,
                echo
            };

            conn.ws.send(JSON.stringify(request));

            const timeout = setTimeout(() => {
                this.pendingRequests.delete(echo);
                reject(new Error('Request timeout'));
            }, 10000);

            this.pendingRequests = this.pendingRequests || new Map();
            this.pendingRequests.set(echo, { resolve, reject, timeout });
        });
    }

    handleApiResponse(connectionId, response) {
        const { echo } = response;

        if (this.pendingRequests && this.pendingRequests.has(echo)) {
            const { resolve, reject, timeout } = this.pendingRequests.get(echo);
            clearTimeout(timeout);
            this.pendingRequests.delete(echo);

            if (response.status === 'ok') {
                resolve(response.data);
            } else {
                reject(new Error(response.retcode));
            }
        }
    }

    async sendMessage(message_type, user_id, message, group_id = null) {
        const params = {
            message_type,
            user_id,
            message
        };

        if (group_id) {
            params.group_id = group_id;
        }

        return await this.sendApiRequest('send_msg', params);
    }

    async getGroupInfo(group_id) {
        const connectionIds = Array.from(this.connections.keys());
        if (connectionIds.length === 0) {
            throw new Error('No connections available');
        }

        const connectionId = connectionIds[0];
        return await this.sendApiRequest('get_group_info', {
            group_id: String(group_id)
        });
    }

    async getLoginInfo() {
        const connectionIds = Array.from(this.connections.keys());
        if (connectionIds.length === 0) {
            throw new Error('No connections available');
        }

        const connectionId = connectionIds[0];
        return await this.sendApiRequest('get_login_info', {});
    }

    on(event, handler) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
    }

    async shutdown() {
        this.logger.info('Shutting down OneBot adapter...');

        this.connections.forEach((conn, id) => {
            if (conn.heartbeatTimer) {
                clearInterval(conn.heartbeatTimer);
            }
            if (conn.ws.readyState === WebSocket.OPEN) {
                conn.ws.close(1001, 'Adapter shutdown');
            }
        });

        if (this.pendingRequests) {
            this.pendingRequests.forEach(({ timeout }) => {
                clearTimeout(timeout);
            });
        }
    }
}
