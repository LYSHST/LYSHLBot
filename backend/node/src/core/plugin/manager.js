import { PluginContext } from './base.js';
import { readdir, readFile, writeFile, mkdir, access, constants } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PluginManager {
    constructor(config, logger, wsManager, sandboxAPI) {
        this.config = config;
        this.logger = logger;
        this.wsManager = wsManager;
        this.sandboxAPI = sandboxAPI;

        this.plugins = new Map();
        this.pluginContexts = new Map();
        this.pluginUI = new Map();

        this.messageFilters = [];
        this.sendFilters = [];
        this.groupFilters = [];
        this.privateFilters = [];

        this.pluginsDir = path.resolve(__dirname, '../../../../../data/plugins');
        this.pluginDataDir = path.resolve(__dirname, '../../../../../data/plugin_data');
    }

    setSandboxAPI(sandboxAPI) {
        this.sandboxAPI = sandboxAPI;
    }

    async initialize() {
        this.logger.info('Initializing plugin manager...');
        this.logger.info(`Plugins dir: ${this.pluginsDir}`);
        this.logger.info(`Plugin data dir: ${this.pluginDataDir}`);

        await this.ensureDirectories();
        await this.loadPlugins();

        this.logger.info(`Plugin manager initialized with ${this.plugins.size} plugins`);
    }

    async ensureDirectories() {
        if (!existsSync(this.pluginsDir)) {
            await mkdir(this.pluginsDir, { recursive: true });
            this.logger.info(`Created plugins directory: ${this.pluginsDir}`);
        }

        if (!existsSync(this.pluginDataDir)) {
            await mkdir(this.pluginDataDir, { recursive: true });
            this.logger.info(`Created plugin data directory: ${this.pluginDataDir}`);
        }
    }

    async loadPlugins() {
        try {
            const entries = await readdir(this.pluginsDir, { withFileTypes: true });

            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const pluginPath = path.join(this.pluginsDir, entry.name);
                    const configFile = path.join(pluginPath, 'config.js');
                    const mainFile = path.join(pluginPath, 'main.js');

                    if (existsSync(configFile)) {
                        try {
                            await this.loadPlugin(entry.name, pluginPath, configFile, mainFile);
                        } catch (error) {
                            this.logger.error(`Failed to load plugin ${entry.name}:`, error);
                        }
                    } else {
                        this.logger.warn(`Plugin ${entry.name} has no config.js`);
                    }
                }
            }
        } catch (error) {
            this.logger.error('Failed to read plugins directory:', error);
        }
    }

    async loadPlugin(id, pluginPath, configFile, mainFile) {
        try {
            const configModule = await import(`file://${configFile}`);
            const pluginConfig = configModule.default || configModule.config || {};

            const pluginName = pluginConfig.name || id;
            const pluginVersion = pluginConfig.version || '1.0.0';
            const pluginPriority = pluginConfig.priority ?? 50;

            this.logger.info(`Loading plugin: ${pluginName} v${pluginVersion} (priority: ${pluginPriority})`);

            const pluginInstance = {
                id,
                name: pluginName,
                version: pluginVersion,
                author: pluginConfig.author || 'Unknown',
                description: pluginConfig.description || '',
                priority: pluginPriority,
                enabled: true,
                path: pluginPath,
                dataPath: path.join(this.pluginDataDir, id),
                main: null
            };

            const context = new PluginContext(this, pluginInstance);
            pluginInstance.context = context;

            this.plugins.set(id, pluginInstance);
            this.pluginContexts.set(id, context);

            await this.ensurePluginDataDir(id);

            if (existsSync(mainFile)) {
                try {
                    const mainModule = await import(`file://${mainFile}`);
                    const mainExport = mainModule.default || mainModule;

                    if (typeof mainExport === 'function') {
                        pluginInstance.main = mainExport(context, pluginInstance);
                    } else if (typeof mainExport === 'object') {
                        pluginInstance.main = mainExport;
                    }

                    if (pluginInstance.main) {
                        if (typeof pluginInstance.main.onLoad === 'function') {
                            await pluginInstance.main.onLoad(context, pluginInstance);
                        }

                        if (typeof pluginInstance.main.onMessage === 'function') {
                            this.messageFilters.push({
                                plugin: pluginInstance,
                                handler: pluginInstance.main.onMessage.bind(pluginInstance.main),
                                priority: pluginInstance.priority
                            });
                        }

                        if (typeof pluginInstance.main.onMessageSend === 'function') {
                            this.sendFilters.push({
                                plugin: pluginInstance,
                                handler: pluginInstance.main.onMessageSend.bind(pluginInstance.main),
                                priority: pluginInstance.priority
                            });
                        }

                        if (typeof pluginInstance.main.onGroupMessage === 'function') {
                            this.groupFilters.push({
                                plugin: pluginInstance,
                                handler: pluginInstance.main.onGroupMessage.bind(pluginInstance.main),
                                priority: pluginInstance.priority
                            });
                        }

                        if (typeof pluginInstance.main.onPrivateMessage === 'function') {
                            this.privateFilters.push({
                                plugin: pluginInstance,
                                handler: pluginInstance.main.onPrivateMessage.bind(pluginInstance.main),
                                priority: pluginInstance.priority
                            });
                        }
                    }
                } catch (mainError) {
                    this.logger.error(`Failed to load plugin main: ${mainError.message}`);
                }
            }

            this.sortFilters();

            this.logger.info(`Successfully loaded plugin: ${pluginName}`);
        } catch (error) {
            this.logger.error(`Error loading plugin from ${configFile}:`, error);
            throw error;
        }
    }

    async ensurePluginDataDir(pluginId) {
        const dataPath = path.join(this.pluginDataDir, pluginId);
        if (!existsSync(dataPath)) {
            await mkdir(dataPath, { recursive: true });
        }
        return dataPath;
    }

    sortFilters() {
        const sortByPriority = (a, b) => b.priority - a.priority;

        this.messageFilters.sort(sortByPriority);
        this.sendFilters.sort(sortByPriority);
        this.groupFilters.sort(sortByPriority);
        this.privateFilters.sort(sortByPriority);
    }

    async enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        if (plugin.enabled) {
            return;
        }

        if (plugin.main && typeof plugin.main.onEnable === 'function') {
            await plugin.main.onEnable.call(plugin.main, plugin.context, plugin);
        }

        plugin.enabled = true;
        this.logger.info(`Enabled plugin: ${plugin.name}`);
    }

    async disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        if (!plugin.enabled) {
            return;
        }

        if (plugin.main && typeof plugin.main.onDisable === 'function') {
            await plugin.main.onDisable.call(plugin.main, plugin.context, plugin);
        }

        plugin.enabled = false;
        this.logger.info(`Disabled plugin: ${plugin.name}`);
    }

    isHigherPriority(pluginId1, pluginId2) {
        const p1 = this.plugins.get(pluginId1);
        const p2 = this.plugins.get(pluginId2);

        if (!p1 || !p2) return false;

        return p1.priority > p2.priority;
    }

    isLowerPriority(pluginId1, pluginId2) {
        const p1 = this.plugins.get(pluginId1);
        const p2 = this.plugins.get(pluginId2);

        if (!p1 || !p2) return false;

        return p1.priority < p2.priority;
    }

    canControl(controllerId, targetId) {
        const controller = this.plugins.get(controllerId);
        const target = this.plugins.get(targetId);

        if (!controller || !target) return false;

        return controller.priority > target.priority;
    }

    async processMessage(message, wsContext) {
        let result = { dropped: false, message };

        for (const filter of this.messageFilters) {
            if (!filter.plugin.enabled) continue;

            try {
                const pluginContext = this.pluginContexts.get(filter.plugin.id);
                const context = Object.create(pluginContext);
                context.clientId = wsContext.clientId;
                context.message = message;
                context.wsManager = wsContext.wsManager || this.wsManager;
                context.logger = this.logger;
                context.plugin = filter.plugin;
                context.sandboxMode = wsContext.sandboxMode || false;

                const filterResult = await filter.handler(message, context);

                if (filterResult === null) {
                    result = { dropped: true, message: null, by: filter.plugin.id };
                    break;
                }

                if (filterResult !== undefined && filterResult !== message) {
                    message = filterResult;
                }
            } catch (error) {
                this.logger.error(`Message filter ${filter.plugin.name} error:`, error);
            }
        }

        result.message = message;
        return result;
    }

    registerPluginUI(pluginId, uiConfig) {
        this.pluginUI.set(pluginId, uiConfig);
    }

    unregisterPluginUI(pluginId) {
        this.pluginUI.delete(pluginId);
    }

    getPluginUI(pluginId) {
        return this.pluginUI.get(pluginId);
    }

    getAllPluginUI() {
        return Array.from(this.pluginUI.entries()).map(([id, ui]) => ({
            pluginId: id,
            ...ui
        }));
    }

    async savePluginConfig(pluginId, config) {
        const configPath = path.join(this.pluginsDir, pluginId, 'config.js');

        try {
            let configContent = `export default {\n`;
            configContent += `    name: '${config.name || pluginId}',\n`;
            configContent += `    version: '${config.version || '1.0.0'}',\n`;
            configContent += `    author: '${config.author || 'Unknown'}',\n`;
            configContent += `    description: '${config.description || ''}',\n`;
            configContent += `    priority: ${config.priority || 50},\n`;
            configContent += `};\n`;

            await writeFile(configPath, configContent, 'utf-8');
            this.logger.info(`Saved config for plugin ${pluginId}`);
        } catch (error) {
            this.logger.error(`Failed to save config for ${pluginId}:`, error);
        }
    }

    async sendMessage(message_type, user_id, message, group_id = null) {
        if (this.wsManager && this.wsManager.clientConnections.size > 0) {
            const clientId = this.wsManager.clientConnections.keys().next().value;

            return await this.wsManager.apiCall(clientId, 'send_msg', {
                message_type,
                user_id,
                message,
                group_id
            });
        }

        throw new Error('No available connections to send message');
    }

    getPluginList() {
        return Array.from(this.plugins.values()).map(plugin => ({
            id: plugin.id,
            name: plugin.name,
            version: plugin.version,
            author: plugin.author,
            description: plugin.description,
            priority: plugin.priority,
            enabled: plugin.enabled
        }));
    }

    async shutdown() {
        this.logger.info('Shutting down plugin manager...');

        for (const [id, plugin] of this.plugins) {
            try {
                if (plugin.enabled && plugin.main && typeof plugin.main.onDisable === 'function') {
                    await plugin.main.onDisable.call(plugin.main, plugin.context, plugin);
                }
                if (plugin.main && typeof plugin.main.onUnload === 'function') {
                    await plugin.main.onUnload.call(plugin.main, plugin.context, plugin);
                }
            } catch (error) {
                this.logger.error(`Error shutting down plugin ${plugin.name}:`, error);
            }
        }

        this.plugins.clear();
        this.pluginContexts.clear();
        this.pluginUI.clear();

        this.logger.info('Plugin manager shut down');
    }
}

export default PluginManager;
