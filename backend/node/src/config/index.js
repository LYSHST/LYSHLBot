import fs from 'fs';
import path from 'path';
import yaml from 'yaml';

export class Config {
    constructor() {
        this.config = {};
        this.configPath = path.resolve(process.cwd(), 'config', 'config.yaml');
    }

    load() {
        try {
            if (fs.existsSync(this.configPath)) {
                const content = fs.readFileSync(this.configPath, 'utf-8');
                this.config = yaml.parse(content) || {};
            } else {
                this.config = this.getDefaults();
            }

            this.applyEnvOverrides();
            return this.config;
        } catch (error) {
            console.error('Config load error:', error);
            this.config = this.getDefaults();
            return this.config;
        }
    }

    getDefaults() {
        return {
            app: {
                name: 'LYSHLbot',
                version: '1.0.0',
                host: process.env.HOST || '0.0.0.0',
                port: parseInt(process.env.PORT) || 3000,
                env: process.env.NODE_ENV || 'development'
            },
            server: {
                enable: true,
                type: 'express',
                cors: {
                    enabled: process.env.ENABLE_CORS !== 'false',
                    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['*']
                }
            },
            websocket: {
                enable: true,
                reverse_proxy: {
                    enabled: true,
                    path: process.env.WS_REVERSE_PATH || '/ws/reverse',
                    reconnect_interval: 3000,
                    max_reconnect_attempts: 10
                }
            },
            onebot: {
                enable: true,
                protocol: process.env.ONEBOT_PROTOCOL || 'v11',
                access_token: process.env.ONEBOT_ACCESS_TOKEN || '',
                universal: process.env.ONEBOT_UNIVERSAL || 'ws://127.0.0.1:3001'
            },
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: process.env.LOG_FILE || './logs/app.log',
                console: true
            },
            plugins: {
                enabled: true,
                directory: process.env.PLUGIN_DIR || './plugins',
                auto_load: process.env.PLUGIN_AUTO_LOAD !== 'false'
            }
        };
    }

    applyEnvOverrides() {
        if (process.env.ONEBOT_NAPCAT_WS) {
            this.config.onebot = this.config.onebot || {};
            this.config.onebot.adapters = this.config.onebot.adapters || {};
            this.config.onebot.adapters.napcat = this.config.onebot.adapters.napcat || {};
            this.config.onebot.adapters.napcat.ws_url = process.env.ONEBOT_NAPCAT_WS;
        }
    }

    get(path, defaultValue = null) {
        const keys = path.split('.');
        let value = this.config;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }

        return value;
    }

    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = this.config;

        for (const key of keys) {
            if (!(key in target)) {
                target[key] = {};
            }
            target = target[key];
        }

        target[lastKey] = value;
    }

    save() {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, yaml.stringify(this.config), 'utf-8');
        } catch (error) {
            console.error('Config save error:', error);
        }
    }
}
