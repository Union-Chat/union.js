const EventEmitter = require('events');
const WebSocket = require('ws');


class SelfUser {
    constructor(username, password) {
        this.username = username;
        this.password = password;
    }
}


class Server {
    constructor(data) {
        this.name = data.name;
        this.id = data.id;
        this.messages = [];
    }
}


class Message {
    constructor(client, msg) {
        this.client = client;
        this.server = this.client.servers.get(msg.server);
        this.content = msg.content;
        this.author = msg.author;
        this.self = this.author === this.client.user.username;
    }

    reply(content) {
        if (!this.client.ready) {
            throw new Error('Client isn\'t ready!');
        }
        this.client._ws.send(JSON.stringify({
            op: 8,
            d: {
                content,
                server: this.server.id
            }
        }));
    }
}


class Client extends EventEmitter {
    constructor(options) {
        super();

        if (!(options instanceof Object)) {
            throw new Error('Client options must be an object!');
        }

        if (!options.username) {
            throw new Error('options.username must exist and not be null!');
        }

        if (!options.password) {
            throw new Error('options.password must exist and not be null!');
        }

        this.user = new SelfUser(options.username, options.password);
        this.ready = false;
        this.servers = new Map();
    }

    _connect() {
        if (this._ws) {
            this._ws.terminate();
        }

        const encodedAuth = Buffer.from(`${this.user.username}:${this.user.password}`).toString('base64');
        this._ws = new WebSocket('ws://union.serux.pro:2082', {
            headers: {
                'Authorization': `Basic ${encodedAuth}`
            }
        });

        this._ws.on('error', (error) => {
            this.emit('error', error);
        });

        this._ws.on('close', (code, reason) => {
            this.emit('disconnect', code, reason);
            // TODO: Reconnects
        });

        this._ws.on('message', this._handlePayload.bind(this));
    }

    _handlePayload(payload) {
        this.emit('rawData', payload);

        try {
            payload = JSON.parse(payload);
            
            switch (payload.op) {
                case 1: // Hello
                    this.ready = true;
                    for (let server of payload.d) {
                        this.servers.set(server.id, new Server(server));
                    }
                    this.emit('ready');
                    break;
                case 3: // Message
                    const message = new Message(this, payload.d);
                    this.servers.get(payload.d.server).messages.push(message);
                    this.emit('messageCreate', message);
                    break;
            }
        } catch (e) {
            // Unexpected error parsing json or something
        }
    }

    start() {
        this._connect();
    }
}

module.exports = {
    Client
};
