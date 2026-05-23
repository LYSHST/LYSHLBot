export class PluginContext {
    constructor(manager, plugin) {
        this.manager = manager;
        this.plugin = plugin;
        this.logger = manager.logger;
    }

    getPluginInfo() {
        return {
            id: this.plugin.id,
            name: this.plugin.name,
            version: this.plugin.version,
            author: this.plugin.author,
            description: this.plugin.description,
            priority: this.plugin.priority
        };
    }

    isHigherPriority(otherPluginId) {
        return this.manager.isHigherPriority(this.plugin.id, otherPluginId);
    }

    isLowerPriority(otherPluginId) {
        return this.manager.isLowerPriority(this.plugin.id, otherPluginId);
    }

    canControl(otherPluginId) {
        return this.manager.canControl(this.plugin.id, otherPluginId);
    }

    async sendMessage(message_type, user_id, message, group_id = null) {
        if (this.sandboxMode && this.manager.sandboxAPI) {
            if (message_type === 'group') {
                return await this.manager.sandboxAPI.sendGroupMessage(group_id, message);
            } else {
                return await this.manager.sandboxAPI.sendPrivateMessage(user_id, message);
            }
        }
        return await this.manager.sendMessage(message_type, user_id, message, group_id);
    }

    async sendGroupMessage(group_id, message) {
        return await this.sendMessage('group', null, message, group_id);
    }

    async sendPrivateMessage(user_id, message) {
        return await this.sendMessage('private', user_id, message);
    }

    setConfig(key, value) {
        this.plugin.config[key] = value;
        this.manager.savePluginConfig(this.plugin.id, this.plugin.config);
    }

    getConfig(key, defaultValue = null) {
        return this.plugin.config[key] ?? defaultValue;
    }

    registerUI(tab) {
        this.manager.registerPluginUI(this.plugin.id, tab);
    }

    unregisterUI() {
        this.manager.unregisterPluginUI(this.plugin.id);
    }

    log(level, ...args) {
        this.logger[level](`[${this.plugin.name}]`, ...args);
    }

    debug(...args) { this.log('debug', ...args); }
    info(...args) { this.log('info', ...args); }
    warn(...args) { this.log('warn', ...args); }
    error(...args) { this.log('error', ...args); }

    async getPluginList() {
        return this.manager.getPluginList();
    }

    getDataPath() {
        return this.plugin.dataPath;
    }
}

export class Plugin {
    static id = 'base-plugin';
    static name = 'Base Plugin';
    static version = '1.0.0';
    static author = 'Unknown';
    static description = 'Base plugin class';
    static priority = 50;
    static dependencies = [];

    constructor(context) {
        this.context = context;
        this.enabled = true;
        this.config = {};
    }

    async onLoad() {}
    async onEnable() {}
    async onDisable() {}
    async onUnload() {}

    async onMessage(message) {}
    async onMessageSend(message) {}
    async onGroupMessage(message) {}
    async onPrivateMessage(message) {}
    async onNotice(notice) {}
    async onRequest(request) {}
    async onMetaEvent(event) {}
}

export class MessagePipeline {
    constructor() {
        this.filters = [];
    }

    async process(message, context, filters) {
        let processedMessage = { ...message };

        for (const filter of filters) {
            if (!filter.plugin.enabled) continue;

            try {
                const result = await filter.handler(processedMessage, context);

                if (result === null) {
                    return { dropped: true, message: null, by: filter.plugin.id };
                }

                if (result !== undefined) {
                    processedMessage = result;
                }
            } catch (error) {
                context.error(`Filter ${filter.plugin.name} error:`, error);
            }
        }

        return { dropped: false, message: processedMessage };
    }
}

export default {
    Plugin,
    PluginContext,
    MessagePipeline
};
