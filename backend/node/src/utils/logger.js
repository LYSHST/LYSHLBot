import winston from 'winston';
import path from 'path';
import fs from 'fs';

export class Logger {
    constructor() {
        const logDir = path.resolve(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        this.logger = winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: winston.format.combine(
                winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                winston.format.errors({ stack: true }),
                winston.format.printf(({ timestamp, level, message, ...meta }) => {
                    let metaStr = '';
                    if (Object.keys(meta).length > 0) {
                        metaStr = ' ' + JSON.stringify(meta);
                    }
                    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
                })
            ),
            transports: [
                new winston.transports.File({
                    filename: path.join(logDir, 'error.log'),
                    level: 'error',
                    maxsize: 5242880,
                    maxFiles: 5
                }),
                new winston.transports.File({
                    filename: path.join(logDir, 'app.log'),
                    maxsize: 5242880,
                    maxFiles: 5
                })
            ]
        });

        if (process.stdout.isTTY) {
            this.logger.add(new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.printf(({ timestamp, level, message, ...meta }) => {
                        let metaStr = '';
                        if (Object.keys(meta).length > 0 && meta.stack) {
                            metaStr = '\n' + meta.stack;
                        }
                        return `[${timestamp}] ${level} ${message}${metaStr}`;
                    })
                )
            }));
        }
    }

    info(message, ...meta) {
        this.logger.info(message, meta.length > 0 ? meta[0] : {});
    }

    warn(message, ...meta) {
        this.logger.warn(message, meta.length > 0 ? meta[0] : {});
    }

    error(message, ...meta) {
        this.logger.error(message, meta.length > 0 ? meta[0] : {});
    }

    debug(message, ...meta) {
        this.logger.debug(message, meta.length > 0 ? meta[0] : {});
    }

    success(message) {
        this.logger.info(`✓ ${message}`);
    }
}
