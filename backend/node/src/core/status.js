import { EventEmitter } from 'events';

export class StatusManager extends EventEmitter {
    constructor(logger) {
        super();
        this.logger = logger;
        this.startTime = Date.now();
        this.messageCount = 0;
        this.logs = [];
        this.maxLogs = 1000;
    }

    getUptime() {
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    incrementMessageCount() {
        this.messageCount++;
        return this.messageCount;
    }

    addLog(level, message, meta = {}) {
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            level,
            message,
            ...meta
        };

        this.logs.push(logEntry);

        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.emit('log', logEntry);
        return logEntry;
    }

    getLogs(limit = 100, offset = 0) {
        return this.logs.slice(offset, offset + limit);
    }

    getStatus() {
        return {
            uptime: this.getUptime(),
            messageCount: this.messageCount,
            startTime: this.startTime,
            logs: this.getLogs(100)
        };
    }

    reset() {
        this.startTime = Date.now();
        this.messageCount = 0;
        this.logs = [];
    }
}

export default StatusManager;
