import http from 'http';

export class Server {
    constructor(app, config) {
        this.app = app;
        this.config = config;
        this.server = null;
    }

    async start() {
        const host = this.config.get('app.host', '0.0.0.0');
        const port = this.config.get('app.port', 3000);

        this.server = http.createServer(this.app);

        return new Promise((resolve, reject) => {
            this.server.listen(port, host, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async shutdown() {
        return new Promise((resolve) => {
            if (this.server) {
                this.server.close(() => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    getServer() {
        return this.server;
    }
}
