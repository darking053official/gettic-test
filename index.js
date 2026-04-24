// Kütüphaneyi yükle (aynı klasörde gettic.js varsa)
const { Client } = require('@gettic/core');

// Bot oluştur
const bot = new Client({
    url: 'https://gettic.onrender.com',
    token: 'f0a519f1e8e3039b9de60e1c6a09633a', // Panelden aldığın token
    username: 'GetticBot',
    prefix: '/'
});

// Bot hazır olunca
bot.on('ready', () => {
    console.log('🤖 Bot hazır!');
    bot.send('genel', 'Merhaba Gettic! Ben hazırım. /yardim yazarak komutları görebilirsin.');
});

// Mesaj gelince
bot.on('message', (msg) => {
    console.log(`📩 ${msg.senderName}: ${msg.content}`);
});

// Komutlar
bot.command('ping', (ctx) => {
    ctx.reply('🏓 Pong!');
});

bot.command('sa', (ctx) => {
    ctx.reply(`Aleyküm selam ${ctx.sender}! 👋`);
});

bot.command('yardim', (ctx) => {
    ctx.reply('📋 **Komutlar:**\n/ping - Gecikme testi\n/sa - Selamlaşma\n/sil - Mesaj sil\n/anket - Anket başlat');
});

bot.command('temizle', (ctx) => {
    const sayi = parseInt(ctx.args[0]) || 5;
    ctx.reply(`🧹 ${sayi} mesaj temizleniyor...`);
});

bot.command('anket', (ctx) => {
    ctx.reply('📊 Anket komutu: /anket Başlık|Seçenek1|Seçenek2');
});

bot.command('otorol', (ctx) => {
    ctx.reply('✅ Otorol ayarlandı! Yeni gelenlere @Üye rolü verilecek.');
});

bot.command('sunucu', (ctx) => {
    ctx.reply(`🏠 Sunucu: Gettic\n👥 Aktif: ${ctx.room}`);
});

// Bağlan
bot.connect();
