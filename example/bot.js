const union = require('union.js');
const client = new union.Client({
    username: '',
    password: ''
});


const prefix = 'self.'; // Bad prefix is bad

client.on('ready', () => console.info(`Logged in as ${client.user.username}`))

client.on('messageCreate', (msg) => {
    if (!msg.self || !msg.content.startsWith(prefix)) {
        return;
    }

    const [command, ...args] = msg.content.substring(prefix.length).split(' ');

    if (command === 'ping') {
        msg.reply('Hello!');
    }
});

client.start();
