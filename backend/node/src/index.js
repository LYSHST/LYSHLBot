import express from 'express';
import cors from 'cors';
import chalk from 'chalk';
import figlet from 'figlet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from './core/Server.js';
import { WebSocketManager } from './websocket/manager.js';
import { OneBotAdapter } from './protocols/onebot/adapter.js';
import { Logger } from './utils/logger.js';
import { Config } from './config/index.js';
import { PluginManager } from './core/plugin/manager.js';
import { StatusManager } from './core/status.js';
import { SandboxAPI } from './sandbox/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../..');

dotenv.config();

class LYSHLbot {
    constructor() {
        this.app = express();
        this.server = null;
        this.wsManager = null;
        this.onebotAdapter = null;
        this.pluginManager = null;
        this.logger = new Logger();
        this.config = new Config();
        this.statusManager = new StatusManager(this.logger);
        this.sandboxAPI = null;
    }

    async initialize() {
        this.printBanner();
        this.logger.info('Initializing LYSHLbot...');

        try {
            this.config.load();
            this.setupMiddleware();
            this.setupRoutes();

            this.server = new Server(this.app, this.config);
            await this.server.start();

            await this.setupWebSocket();
            await this.setupOneBot();
            await this.setupPlugins();
            await this.setupPluginRoutes();

            this.wsManager.setOneBotAdapter(this.onebotAdapter);
            this.wsManager.setPluginManager(this.pluginManager);

            this.setupSandbox();

            this.logger.success('LYSHLbot started successfully');
            this.printStatus();
        } catch (error) {
            this.logger.error('Failed to initialize:', error);
            process.exit(1);
        }
    }

    printBanner() {
        console.log(
            chalk.cyan(
                figlet.textSync('LYSHLbot', {
                    font: 'Standard',
                    horizontalLayout: 'default',
                    verticalLayout: 'default'
                })
            )
        );
        console.log(chalk.yellow('  OneBot Protocol Robot Framework\n'));
        console.log(chalk.gray('─').repeat(50));
    }

    setupMiddleware() {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        if (this.config.get('server.cors.enabled')) {
            this.app.use(cors({
                origin: this.config.get('server.cors.origins'),
                credentials: true
            }));
        }

        this.app.use((req, res, next) => {
            this.logger.debug(`${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        const apiRouter = express.Router();

        apiRouter.get('/status', (req, res) => {
            res.json({
                uptime: this.statusManager.getUptime(),
                startTime: this.statusManager.startTime,
                connections: this.wsManager ? this.wsManager.getConnectionCount() : 0,
                messageCount: this.statusManager.messageCount
            });
        });

        apiRouter.get('/logs', (req, res) => {
            const limit = parseInt(req.query.limit) || 100;
            const offset = parseInt(req.query.offset) || 0;
            res.json(this.statusManager.getLogs(limit, offset));
        });

        apiRouter.post('/logs/clear', (req, res) => {
            this.statusManager.logs = [];
            res.json({ success: true });
        });

        apiRouter.get('/config', (req, res) => {
            const publicConfig = {
                app: {
                    name: this.config.get('app.name'),
                    version: this.config.get('app.version')
                },
                websocket: {
                    reverse_proxy: this.config.get('websocket.reverse_proxy')
                }
            };
            res.json(publicConfig);
        });

        apiRouter.post('/ws/connect', async (req, res) => {
            try {
                const { url, token } = req.body;
                await this.wsManager.connectToReverseProxy(url, token);
                res.json({ success: true, message: 'Connection initiated' });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        this.app.use('/api', apiRouter);

        this.app.get('/', (req, res) => {
            res.sendFile(path.join(rootDir, 'frontend', 'dist', 'index.html'));
        });
    }

    async setupWebSocket() {
        this.wsManager = new WebSocketManager(this.config, this.logger);
        this.wsManager.setServer(this.server.getServer());
        this.wsManager.setStatusManager(this.statusManager);
        await this.wsManager.initialize();
        this.logger.info('WebSocket manager initialized');
    }

    async setupOneBot() {
        this.onebotAdapter = new OneBotAdapter(this.config, this.wsManager, this.logger);
        await this.onebotAdapter.initialize();
        this.logger.info('OneBot adapter initialized');
    }

    async setupPlugins() {
        this.pluginManager = new PluginManager(this.config, this.logger, this.wsManager, null);
        await this.pluginManager.initialize();
        this.logger.info('Plugin manager initialized');
    }

    async setupPluginRoutes() {
        this.app.get('/api/plugins', (req, res) => {
            res.json(this.pluginManager.getPluginList());
        });

        this.app.get('/api/plugins/ui', (req, res) => {
            res.json(this.pluginManager.getAllPluginUI());
        });

        this.app.post('/api/plugins/:id/enable', async (req, res) => {
            try {
                await this.pluginManager.enablePlugin(req.params.id);
                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.post('/api/plugins/:id/disable', async (req, res) => {
            try {
                await this.pluginManager.disablePlugin(req.params.id);
                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.get('/api/plugins/:id/config', async (req, res) => {
            const plugin = this.pluginManager.plugins.get(req.params.id);
            if (!plugin) {
                return res.status(404).json({ error: 'Plugin not found' });
            }
            res.json(plugin.config);
        });

        this.app.post('/api/plugins/:id/config', async (req, res) => {
            try {
                const plugin = this.pluginManager.plugins.get(req.params.id);
                if (!plugin) {
                    return res.status(404).json({ error: 'Plugin not found' });
                }

                Object.assign(plugin.config, req.body);
                await this.pluginManager.savePluginConfig(req.params.id, plugin.config);

                res.json({ success: true });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });

        this.app.post('/api/plugins/:id/priority', async (req, res) => {
            try {
                const plugin = this.pluginManager.plugins.get(req.params.id);
                if (!plugin) {
                    return res.status(404).json({ error: 'Plugin not found' });
                }

                const { priority } = req.body;
                if (typeof priority !== 'number' || priority < 0 || priority > 100) {
                    return res.status(400).json({ error: 'Priority must be a number between 0 and 100' });
                }

                plugin.priority = priority;
                plugin.context.plugin.priority = priority;
                await this.pluginManager.savePluginConfig(req.params.id, {
                    ...plugin.config,
                    _priority: priority
                });

                this.pluginManager.sortFilters();

                res.json({ success: true, priority: plugin.priority });
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        });
    }

    setupSandbox() {
        this.sandboxAPI = new SandboxAPI(
            this.logger,
            this.pluginManager,
            this.wsManager,
            (data) => this.wsManager.broadcastToClients(data)
        );
        this.sandboxAPI.setupRoutes(this.app);
        this.pluginManager.setSandboxAPI(this.sandboxAPI);
        this.logger.info('Sandbox API initialized');
    }

    printStatus() {
        const plugins = this.pluginManager ? this.pluginManager.getPluginList() : [];
        const enabledPlugins = plugins.filter(p => p.enabled).length;

        console.log(chalk.gray('─').repeat(50));
        console.log(chalk.green('✓ Server:      ') + `http://${this.config.get('app.host')}:${this.config.get('app.port')}`);
        console.log(chalk.green('✓ WebSocket:   ') + `${this.config.get('websocket.reverse_proxy.path')}`);
        console.log(chalk.green('✓ OneBot:      ') + `Protocol v${this.config.get('onebot.protocol')}`);
        console.log(chalk.green('✓ Plugins:     ') + `${enabledPlugins}/${plugins.length} enabled`);
        console.log(chalk.gray('─').repeat(50));
        console.log();
    }

    async shutdown() {
        this.logger.warn('Shutting down LYSHLbot...');
        if (this.pluginManager) await this.pluginManager.shutdown();
        if (this.wsManager) await this.wsManager.shutdown();
        if (this.server) await this.server.shutdown();
        this.logger.info('Shutdown complete');
        process.exit(0);
    }
}

const bot = new LYSHLbot();

process.on('SIGINT', () => bot.shutdown());
process.on('SIGTERM', () => bot.shutdown());

bot.initialize().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});
