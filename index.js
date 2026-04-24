const http = require('http');
const { Client } = require('gettic.js');

// Bot oluştur
const bot = new Client({
    url: 'https://gettic.onrender.com',
    token: 'BOT_TOKEN',
    username: 'GetticBot',
    prefix: '/'
});

// HTTP Server
const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    
    // Ana sayfa
    if (req.url === '/') {
        res.end(JSON.stringify({
            bot: bot.username,
            status: bot.ready ? '🟢 Çevrimiçi' : '🔴 Kapalı',
            uptime: bot.uptime ? Math.floor(bot.uptime / 1000) + 's' : '0s',
            ping: bot.ping + 'ms',
            commands: [...bot._commands.keys()],
            endpoints: [
                'GET / - Bot bilgisi',
                'GET /ping - Ping kontrolü',
                'GET /stats - İstatistikler',
                'POST /send - Mesaj gönder'
            ]
        }, null, 2));
    }
    
    // Ping
    else if (req.url === '/ping') {
        res.end(JSON.stringify({ ping: bot.ping + 'ms', status: 'ok' }));
    }
    
    // İstatistikler
    else if (req.url === '/stats') {
        const mem = process.memoryUsage();
        res.end(JSON.stringify({
            uptime: Math.floor(process.uptime()) + 's',
            memory: Math.floor(mem.heapUsed / 1024 / 1024) + 'MB',
            bot: bot.ready ? 'online' : 'offline'
        }));
    }
    
    // Mesaj gönder
    else if (req.url === '/send' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { room, message } = JSON.parse(body);
                bot.send(room || 'genel', message || 'Merhaba!');
                res.end(JSON.stringify({ success: true, room: room || 'genel' }));
            } catch (e) {
                res.end(JSON.stringify({ error: 'Geçersiz JSON' }));
            }
        });
    }
    
    // 404
    else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: 'Sayfa bulunamadı' }));
    }
});

// Bot hazır olunca
bot.on('ready', () => {
    console.log('🤖 Bot hazır!');
    bot.send('genel', 'Merhaba Gettic! Ben hazırım.');
});

// Komutlar
bot.command('ping', (ctx) => {
    ctx.reply(`🏓 Pong! Gecikme: ${bot.ping}ms`);
});

bot.command('sa', (ctx) => {
    ctx.reply(`Aleyküm selam ${ctx.sender}! 👋`);
});

bot.command('yardim', (ctx) => {
    ctx.reply('📋 Komutlar: /ping, /sa, /yardim, /stats');
});

bot.command('stats', (ctx) => {
    ctx.reply(`📊 Bot: ${bot.username}\n⏱ Uptime: ${Math.floor(bot.uptime / 1000)}s\n📡 Ping: ${bot.ping}ms`);
});

// Server'ı başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🌐 HTTP Panel: http://localhost:${PORT}`);
    console.log(`📡 Endpoints:`);
    console.log(`   GET  /       - Bot bilgisi`);
    console.log(`   GET  /ping   - Ping`);
    console.log(`   GET  /stats  - İstatistikler`);
    console.log(`   POST /send   - Mesaj gönder`);
});

// Botu bağla
bot.connect();
