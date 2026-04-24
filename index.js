const { Client } = require('gettic.js');
const bot = new Client({ token: 'f0a519f1e8e3039b9de60e1c6a09633a' });
bot.on('ready', () => bot.send('genel', 'Merhaba!'));
bot.command('ping', ctx => ctx.reply('Pong!'));
bot.connect();
