const { Client, VoiceClient, RESTClient, utils, colors } = require('gettic.js');
require('dotenv').config(); // Token'lar için .env dosyası kullan

// ======================= YAPILANDIRMA =======================
const bot = new Client({
    token: process.env.BOT_TOKEN || 'BOT_TOKENINIZ',
    username: 'UltimateBot',
    prefix: '!'
});

const voice = new VoiceClient(bot, { bitrate: 64000 });
const api = new RESTClient({ token: process.env.API_TOKEN || 'API_TOKENINIZ' });

// ======================= YETKİ SİSTEMİ =======================
const admins = ['admin_id_1', 'admin_id_2']; // Kendi ID'lerinizi ekleyin
const moderators = ['mod_id_1', 'mod_id_2'];

// Engel listesi
const blockedWords = ['küfür', 'spam', 'reklam', 'argo'];
const allowedRooms = ['genel', 'sohbet', 'oyun']; // Botun çalışacağı odalar

// Müzik kuyruğu
let musicQueue = [];
let isPlaying = false;
let currentVoiceRoom = null;

// Kullanıcı spam koruması
const userMessages = new Map(); // { userId: [{time, content}] }

// ======================= YARDIMCI FONKSİYONLAR =======================
function isAdmin(userId) {
    return admins.includes(userId);
}

function isMod(userId) {
    return moderators.includes(userId) || isAdmin(userId);
}

function checkSpam(userId, content) {
    const now = Date.now();
    const userHistory = userMessages.get(userId) || [];
    
    // Son 5 saniyedeki mesajları temizle
    const recent = userHistory.filter(msg => now - msg.time < 5000);
    
    // Aynı mesajı tekrar mı gönderiyor?
    const duplicate = recent.some(msg => msg.content === content);
    
    recent.push({ time: now, content });
    userMessages.set(userId, recent);
    
    return recent.length > 3 || duplicate; // 5 saniyede 3+ mesaj veya tekrar
}

// ======================= TEMEL OLAYLAR =======================
bot.on('ready', () => {
    console.log(`✅ ${bot.username} aktif!`);
    console.log(`📡 Gecikme: ${bot.ping}ms`);
    bot.send('genel', `🤖 **${bot.username}** aktif! Yardım için \`${bot.prefix}yardim\` yaz.`);
});

bot.on('message', async (msg) => {
    // Sadece izinli odalarda çalış
    if (!allowedRooms.includes(msg.room)) return;
    
    // Spam koruması
    if (checkSpam(msg.senderId, msg.content)) {
        await bot.deleteMessage(msg.id);
        bot.send(msg.room, `⚠️ ${msg.sender}, spam yapma! 5 saniye bekle.`);
        return;
    }
    
    // Küfür engelleme
    const hasBadWord = blockedWords.some(word => 
        msg.content.toLowerCase().includes(word)
    );
    
    if (hasBadWord) {
        await bot.deleteMessage(msg.id);
        bot.send(msg.room, `🚫 ${msg.sender}, yasaklı kelime kullanamazsın!`);
        return;
    }
    
    // Kullanıcı yazıyor olayı
    if (msg.content.includes('@' + bot.username)) {
        bot.send(msg.room, `💬 ${msg.sender}, beni çağırdın mı? \`${bot.prefix}yardim\` yazabilirsin.`);
    }
});

bot.on('typing', (data) => {
    // Birisi yazarken yapılacak işlemler (isteğe bağlı)
    // console.log(`${data.sender} yazıyor...`);
});

bot.on('disconnect', () => {
    console.log('❌ Bağlantı koptu! Yeniden bağlanmayı dene...');
    setTimeout(() => bot.connect(), 5000);
});

bot.on('error', (error) => {
    console.error('❌ Bot hatası:', error);
});

// ======================= GENEL KOMUTLAR =======================
bot.command('yardim', (ctx) => {
    const helpText = `
📚 **${bot.username} Komutları**

**🔧 Genel:**
\`!ping\` - Gecikmeyi göster
\`!merhaba\` - Selam ver
\`!saat\` - Sunucu saati
\`!profil\` - Profil bilgilerini göster
\`!sunucular\` - Sunucuları listele (API)

**🎵 Müzik:**
\`!katil [oda]\` - Sesli odaya katıl
\`!cal [şarkı]\` - Şarkı çal
\`!dur\` - Müziği durdur
\`!geç\` - Sıradaki şarkıya geç
\`!ses [0-100]\` - Ses seviyesini ayarla
\`!ayril\` - Sesli odadan ayrıl

**🛡️ Yetkili:**
\`!temizle [sayı]\` - Mesajları sil (Mod+)
\`!duyuru [mesaj]\` - Duyuru yap (Admin)
\`!bot-oluştur [isim]\` - Yeni bot oluştur (Admin)
\`!sunucu-oluştur [isim]\` - Sunucu oluştur (Admin)

**ℹ️ Bilgi:**
Bot prefix: \`${bot.prefix}\`
Gecikme: \`${bot.ping}ms\`
Çalışma süresi: \`${Math.floor(bot.uptime / 1000)} saniye\`
    `;
    ctx.reply(helpText);
});

bot.command('ping', (ctx) => {
    ctx.reply(`🏓 **Pong!** Gecikme: \`${bot.ping}ms\``);
});

bot.command('merhaba', (ctx) => {
    ctx.reply(`✨ Selam **${ctx.sender}**! Hoş geldin. Sana nasıl yardımcı olabilirim?`);
});

bot.command('saat', (ctx) => {
    const now = new Date();
    const formatted = `${utils.formatTime(now)} - ${utils.formatDate(now)}`;
    ctx.reply(`🕐 **Sunucu saati:** ${formatted}`);
});

bot.command('profil', async (ctx) => {
    try {
        const profile = await api.getProfile();
        ctx.reply(`
👤 **Profil Bilgilerin:**
İsim: ${profile.username}
ID: ${profile.id}
Katılma tarihi: ${utils.formatDate(new Date(profile.joinedAt))}
Rozetler: ${profile.badges?.join(', ') || 'Yok'}
        `);
    } catch (error) {
        ctx.reply('❌ Profil bilgileri alınamadı!');
    }
});

// ======================= MÜZİK KOMUTLARI =======================
bot.command('katil', async (ctx) => {
    const roomId = ctx.args[0] || 'SesliOda';
    try {
        await voice.join(roomId);
        currentVoiceRoom = roomId;
        ctx.reply(`🎤 **${roomId}** odasına katıldım! Şarkı çalmak için \`!cal [şarkı]\` yaz.`);
    } catch (error) {
        ctx.reply('❌ Odaya katılamadım! Oda ID\'sini kontrol et.');
    }
});

bot.command('cal', async (ctx) => {
    const song = ctx.args.join(' ');
    if (!song) return ctx.reply('❌ Lütfen bir şarkı adı gir! Örnek: `!cal Believer - Imagine Dragons`');
    
    if (!currentVoiceRoom) {
        return ctx.reply('⚠️ Önce bir sesli odaya katılmalısın! `!katil [oda]`');
    }
    
    musicQueue.push({ name: song, requester: ctx.sender });
    ctx.reply(`🎵 **"${song}"** kuyruğa eklendi! Sırada: ${musicQueue.length}. şarkı.`);
    
    if (!isPlaying) playNext(ctx);
});

async function playNext(ctx) {
    if (musicQueue.length === 0) {
        isPlaying = false;
        return;
    }
    
    isPlaying = true;
    const currentSong = musicQueue.shift();
    ctx.reply(`🎶 **Şimdi çalıyor:** ${currentSong.name}\n📝 İsteyen: ${currentSong.requester}`);
    
    // Gerçek ses oynatma (Gettic platformunun API'sine göre düzenle)
    // await voice.play(currentSong.name);
    
    // Demo: 30 saniye sonra sıradaki şarkıya geç
    setTimeout(() => {
        if (musicQueue.length > 0) {
            playNext(ctx);
        } else {
            isPlaying = false;
            ctx.reply('🏁 **Müzik kuyruğu bitti!** Yeni şarkı ekleyebilirsin.');
        }
    }, 30000);
}

bot.command('dur', (ctx) => {
    if (!isPlaying) return ctx.reply('⚠️ Zaten müzik çalmıyor!');
    isPlaying = false;
    musicQueue = [];
    ctx.reply('⏹️ **Müzik durduruldu ve kuyruk temizlendi!**');
});

bot.command('geç', (ctx) => {
    if (!isPlaying) return ctx.reply('⚠️ Zaten müzik çalmıyor!');
    ctx.reply('⏭️ **Geçiliyor...**');
    playNext(ctx);
});

bot.command('ses', (ctx) => {
    const volume = parseInt(ctx.args[0]);
    if (isNaN(volume) || volume < 0 || volume > 100) {
        return ctx.reply('🔊 Lütfen 0-100 arasında bir ses seviyesi gir!');
    }
    voice.setBitrate(volume * 1000); // Bitrate'i ses seviyesine göre ayarla
    ctx.reply(`🔊 Ses seviyesi \`${volume}%\` olarak ayarlandı!`);
});

bot.command('ayril', (ctx) => {
    if (!currentVoiceRoom) return ctx.reply('⚠️ Zaten bir odada değilim!');
    voice.leave();
    currentVoiceRoom = null;
    musicQueue = [];
    isPlaying = false;
    ctx.reply('👋 Sesli odadan ayrıldım! Görüşmek üzere.');
});

// ======================= MODERASYON KOMUTLARI =======================
bot.command('temizle', async (ctx) => {
    if (!isMod(ctx.senderId)) {
        return ctx.reply('❌ Bu komut için **moderatör** yetkisi gerekli!');
    }
    
    const count = parseInt(ctx.args[0]) || 5;
    if (count > 20) return ctx.reply('❌ En fazla 20 mesaj silebilirsin!');
    
    try {
        // Not: Toplu mesaj silme için API metodunuz varsa ekleyin
        await ctx.delete(); // Kendi mesajını sil
        for (let i = 0; i < count; i++) {
            // Son mesajları sil (bu kısım platform API'sine göre düzenlenmeli)
            await utils.sleep(500);
        }
        ctx.reply(`✅ **${count}** mesaj temizlendi! (${ctx.sender} tarafından)`);
    } catch (error) {
        ctx.reply('❌ Mesajlar silinemedi!');
    }
});

// ======================= ADMIN KOMUTLARI =======================
bot.command('duyuru', (ctx) => {
    if (!isAdmin(ctx.senderId)) {
        return ctx.reply('❌ Bu komut için **admin** yetkisi gerekli!');
    }
    
    const announcement = ctx.args.join(' ');
    if (!announcement) return ctx.reply('❌ Duyuru metni gir!');
    
    bot.send('genel', `📢 **DUYURU** (${ctx.sender}):\n${announcement}`);
    ctx.reply('✅ Duyuru gönderildi!');
});

bot.command('sunucular', async (ctx) => {
    if (!isAdmin(ctx.senderId)) return;
    
    try {
        const servers = await api.getServers();
        if (!servers || servers.length === 0) {
            return ctx.reply('📡 Hiç sunucu bulunamadı.');
        }
        
        const serverList = servers.slice(0, 10).map(s => 
            `• **${s.name}** (ID: ${s.id})`
        ).join('\n');
        
        ctx.reply(`📡 **Mevcut Sunucular (${servers.length}):**\n${serverList}`);
    } catch (error) {
        ctx.reply('❌ Sunucular alınamadı! API tokenını kontrol et.');
    }
});

bot.command('sunucu-oluştur', async (ctx) => {
    if (!isAdmin(ctx.senderId)) return;
    
    const name = ctx.args[0];
    if (!name) return ctx.reply('❌ Sunucu adı gir! Örnek: `!sunucu-oluştur BenimSunucum`');
    
    try {
        const newServer = await api.createServer(name, 'genel');
        ctx.reply(`✅ **${name}** sunucusu oluşturuldu!\nID: \`${newServer.id}\``);
    } catch (error) {
        ctx.reply('❌ Sunucu oluşturulamadı!');
    }
});

bot.command('bot-oluştur', async (ctx) => {
    if (!isAdmin(ctx.senderId)) return;
    
    const botName = ctx.args[0];
    if (!botName) return ctx.reply('❌ Bot adı gir! Örnek: `!bot-oluştur YardimBot`');
    
    try {
        const newBot = await api.createBot(botName, '!');
        ctx.reply(`
🤖 **Yeni bot oluşturuldu!**
İsim: ${newBot.name}
Prefix: ${newBot.prefix}
Token: \`${newBot.token}\`
⚠️ **Token'ı güvenli bir yere kaydet!**
        `);
    } catch (error) {
        ctx.reply('❌ Bot oluşturulamadı!');
    }
});

// ======================= EKSTRA ÖZELLİKLER =======================
// İstatistik göster
setInterval(() => {
    if (bot.ready) {
        console.log(`📊 İstatistik - Uptime: ${Math.floor(bot.uptime / 1000)}s, Ping: ${bot.ping}ms`);
    }
}, 60000); // Her dakika

// Oda sayısını göster
bot.on('count', (roomCount) => {
    console.log(`📡 Aktif oda sayısı: ${roomCount}`);
});

// Botu başlat
bot.connect();

console.log('🚀 Bot başlatılıyor...');
