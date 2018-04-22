const EventEmitter = require('events');
const WebSocket = require('ws');
const request = require('./requester.js');


class SelfUser {
    constructor(username) {
        this.username = username;
    }
}


class Server {
    constructor(data) {
        this.name = data.name;
        this.id = data.id;
        this.messages = [];
        this.members = new Map();

        for (const member of data.members) {
            this.members.set(member.id, member);
        }
    }
}


class Message {
    constructor(client, msg) {
        this.client = client;
        this.server = this.client.servers.get(msg.server);
        this.content = msg.content;
        this.author = msg.author;
        this.id = msg.id;
        this.createdAt = msg.createdAt;
        this.self = this.author === this.client.user.username;
    }

    reply(content) {
        return this.client.createMessage(this.server.id, content);
    }

    delete() {
        if (this.author !== this.client.user.username) {
            throw new Error('Cannot delete a message not sent by you!');
        }

        return; // TODO
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

        this.user = new SelfUser(options.username);
        this.ready = false;
        this.servers = new Map();
        this._ws = null;
        this.token = Buffer.from(`${options.username}:${options.password}`).toString('base64');
    }

    _connect() {
        if (this._ws) {
            this._ws.terminate();
        }

        this._ws = new WebSocket('wss://union.serux.pro:2096', {
            headers: {
                'Authorization': `Basic ${this.token}`
            }
        });

        this._ws.on('error', (error) => {
            this.emit('error', error);
        });

        this._ws.on('close', (code, reason) => {
            this.emit('disconnect', code, reason);
            setTimeout(() => this._connect.bind(this), 5e3);
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
                    for (const server of payload.d) {
                        this.servers.set(server.id, new Server(server));
                    }
                    this.emit('ready');
                    break;
                case 3: { // Message Received
                    const message = new Message(this, payload.d);
                    this.servers.get(payload.d.server).messages.push(message);
                    this.emit('messageCreate', message);
                    break;
                }
                case 11: // Error processing request
                    this.emit('badRequest', payload.d);
            }
        } catch (e) {
            this.emit('error', e);
        }
    }

    start() {
        this._connect();
    }

    createMessage(server, content) {
        if (!this.ready) {
            throw new Error('Client isn\'t ready!');
        }

        return request.post(request.ENDPOINTS.Message, {
            Authorization: `Basic ${this.token}`
        }, {
            server,
            content
        });
    }
}

module.exports = {
    Client
};
