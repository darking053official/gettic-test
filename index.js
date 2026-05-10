// ╔══════════════════════════════════════════════════════════════════╗
// ║                    MODDUX - Moderasyon Botu                     ║
// ║              Yerleşik JSON Veritabanı (DB'siz)                  ║
// ╚══════════════════════════════════════════════════════════════════╝

const { Client, GatewayIntentBits, EmbedBuilder, Colors } = require("@jubbio/core");
const fetch = require("node-fetch");
const http = require("http");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.BOT_TOKEN;
const API = "https://gateway.jubbio.com/api/v1/bot";

// ═══════════════════════════════════════════════════════════════
// YERLEŞİK JSON VERİTABANI (MongoDB'siz)
// ═══════════════════════════════════════════════════════════════
class JsonDB {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = {};
    this.load();
  }

  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        this.data = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      }
    } catch (e) {
      this.data = {};
    }
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    } catch (e) {}
  }

  get(key) {
    return this.data[key] || null;
  }

  set(key, value) {
    this.data[key] = value;
    this.save();
  }

  delete(key) {
    delete this.data[key];
    this.save();
  }

  getAll() {
    return this.data;
  }
}

const db = {
  logKanallar: new JsonDB("./data/logKanallar.json"),
  engelli: new JsonDB("./data/engelli.json"),
  otorol: new JsonDB("./data/otorol.json"),
  hosgeldin: new JsonDB("./data/hosgeldin.json"),
  uyarilar: new JsonDB("./data/uyarilar.json")
};

// HTTP Sunucu
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "online", bot: "MODDUX" }));
}).listen(process.env.PORT || 10000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  gatewayUrl: "wss://realtime.jubbio.com/ws/bot",
  apiUrl: "https://gateway.jubbio.com/api/v1",
});

// Hazır
client.on("ready", () => {
  console.log(`✅ MODDUX hazır! ${client.user?.username}`);
});

// Log Gönder
async function logGonder(guildId, mesaj) {
  const kanalId = db.logKanallar.get(guildId);
  if (!kanalId) return;
  try {
    await fetch(`${API}/guilds/${guildId}/channels/${kanalId}/messages`, {
      method: "POST",
      headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ content: `📋 **LOG** | ${new Date().toLocaleString("tr-TR")} | ${mesaj}` })
    });
  } catch (e) {}
}

// Uyarı DB
function getUyarilar(guildId) {
  return db.uyarilar.get(guildId) || {};
}

function setUyarilar(guildId, data) {
  db.uyarilar.set(guildId, data);
}

// Üye Katılma
client.on("guildMemberAdd", async (member) => {
  const guildId = member.guild?.id || member.guildId;
  const userId = member.user?.id || member.id;
  const username = member.user?.username || "Yeni Üye";

  // ID Engelli
  const engelli = db.engelli.get(guildId) || {};
  if (engelli[String(userId)]) {
    try {
      await fetch(`${API}/guilds/${guildId}/bans/${userId}`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Engelli ID" })
      });
      return;
    } catch (e) {}
  }

  // Hoşgeldin
  const hgKanal = db.hosgeldin.get(guildId);
  if (hgKanal) {
    try {
      await fetch(`${API}/guilds/${guildId}/channels/${hgKanal}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: `🎉 **${username}** katıldı! Hoş geldin! 👋` })
      });
    } catch (e) {}
  }

  // Otorol
  const rolId = db.otorol.get(guildId);
  if (rolId) {
    try {
      await fetch(`${API}/guilds/${guildId}/members/${userId}/roles/${rolId}`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
    } catch (e) {}
  }
});

// ═══════════════════════════════════════════════════════════════
// MESAJ İŞLEME
// ═══════════════════════════════════════════════════════════════
client.on("messageCreate", async (message) => {
  if (message.author?.bot || !message.guildId) return;
  if (!message.content.startsWith("!")) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const cmd = args.shift()?.toLowerCase();
  if (!cmd) return;

  // YARDIM
  if (cmd === "yardim" || cmd === "help") {
    const embed = new EmbedBuilder()
      .setTitle("🛡️ MODDUX Moderasyon")
      .setColor(Colors.Red)
      .addFields(
        { name: "🔨 Ban", value: "`!ban @üye [sebep]` `!banlist`", inline: false },
        { name: "👢 Kick", value: "`!kick @üye`", inline: false },
        { name: "🔇 Susturma", value: "`!sustur @üye [dk]` `!susturma-kaldir @üye`", inline: false },
        { name: "⚠️ Uyarı", value: "`!uyar @üye [sebep]` `!uyarilar @üye` `!uyari-sil @üye`", inline: false },
        { name: "🗑️ Temizlik", value: "`!temizle [sayı]` `!temizle-kullanici @üye`", inline: false },
        { name: "📢 Duyuru", value: "`!duyuru <mesaj>`", inline: false },
        { name: "🔒 Kanal", value: "`!kilit` `!kilitac` `!yavasmod [sn]`", inline: false },
        { name: "🚫 Engelleme", value: "`!engelle <ID>` `!engel-kaldir <ID>` `!engelli-list`", inline: false },
        { name: "📋 Log", value: "`!logkanal <ID>` `!logkaldir`", inline: false },
        { name: "🎭 Rol", value: "`!rol-ver @üye @rol` `!rol-al @üye @rol` `!otorol @rol`", inline: false },
        { name: "👋 Karşılama", value: "`!hosgeldin <ID>` `!hosgeldin kapat`", inline: false },
        { name: "📊 Bilgi", value: "`!sunucu` `!kullanici @üye` `!ping`", inline: false }
      )
      .setFooter({ text: "MODDUX | Prefix: !" });
    return message.reply({ embeds: [embed] });
  }

  // PING
  if (cmd === "ping") {
    const start = Date.now();
    const m = await message.reply("🏓");
    return m.edit(`🏓 Pong! \`${Date.now() - start}ms\``);
  }

  // SUNUCU
  if (cmd === "sunucu") {
    const g = message.guild;
    const embed = new EmbedBuilder()
      .setTitle(`📊 ${g.name}`)
      .setColor(Colors.Green)
      .addFields(
        { name: "👥 Üye", value: `${g.memberCount}`, inline: true },
        { name: "🆔 ID", value: g.id, inline: true }
      );
    if (g.iconURL) embed.setThumbnail(g.iconURL());
    return message.reply({ embeds: [embed] });
  }

  // KULLANICI
  if (cmd === "kullanici") {
    const h = message.mentions?.users?.[0] || message.author;
    const embed = new EmbedBuilder()
      .setTitle(`👤 ${h.username}`)
      .setColor(Colors.Blurple)
      .addFields(
        { name: "🆔 ID", value: h.id, inline: true },
        { name: "📅 Hesap", value: new Date(h.createdAt).toLocaleDateString("tr-TR"), inline: true }
      );
    if (h.avatarURL) embed.setThumbnail(h.avatarURL);
    return message.reply({ embeds: [embed] });
  }

  // BAN
  if (cmd === "ban") {
    const user = message.mentions?.users?.[0];
    if (!user) return message.reply("❌ `!ban @kullanıcı [sebep]`");
    if (user.id === message.author.id) return message.reply("❌ Kendini banlayamazsın!");
    
    const reason = args.slice(1).join(" ") || "Sebep yok";
    try {
      const res = await fetch(`${API}/guilds/${message.guildId}/bans/${user.id}`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason })
      });
      
      if (res.ok || res.status === 204) {
        message.reply(`✅ **${user.username}** banlandı! 📝 ${reason}`);
        logGonder(message.guildId, `🔨 Ban: ${message.author.username} → ${user.username}`);
      } else {
        const err = await res.json().catch(() => ({}));
        message.reply(`❌ ${err.error || "Ban başarısız!"}`);
      }
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // TOPLU BAN
  if (cmd === "toplu-ban") {
    const users = message.mentions?.users || [];
    if (!users.length) return message.reply("❌ `!toplu-ban @üye1 @üye2 @üye3`");
    
    const reason = args.filter(a => !a.startsWith("<@")).join(" ") || "Toplu ban";
    let basarili = 0, basarisiz = 0;
    
    const msg = await message.reply(`🔨 ${users.length} kişi banlanıyor...`);
    
    for (const user of users) {
      if (user.id === message.author.id) { basarisiz++; continue; }
      try {
        const res = await fetch(`${API}/guilds/${message.guildId}/bans/${user.id}`, {
          method: "PUT",
          headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ reason })
        });
        if (res.ok || res.status === 204) basarili++;
        else basarisiz++;
      } catch (e) { basarisiz++; }
      await new Promise(r => setTimeout(r, 500));
    }
    
    msg.edit(`✅ Tamamlandı!\n✅ Başarılı: ${basarili}\n❌ Başarısız: ${basarisiz}`);
    logGonder(message.guildId, `🔨 Toplu Ban: ${message.author.username} → ${basarili} kişi`);
    return;
  }

  // KICK
  if (cmd === "kick") {
    const user = message.mentions?.users?.[0];
    if (!user) return message.reply("❌ `!kick @kullanıcı`");
    if (user.id === message.author.id) return message.reply("❌ Kendini atamazsın!");
    
    try {
      const res = await fetch(`${API}/guilds/${message.guildId}/members/${user.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
      if (res.ok || res.status === 204) {
        message.reply(`✅ **${user.username}** atıldı!`);
        logGonder(message.guildId, `👢 Kick: ${message.author.username} → ${user.username}`);
      } else message.reply("❌ Kick başarısız!");
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // UNBAN
  if (cmd === "unban") {
    const hedef = args[0];
    if (!hedef) return message.reply("❌ `!unban <ID>`");
    try {
      const res = await fetch(`${API}/guilds/${message.guildId}/bans/${hedef}`, {
        method: "DELETE",
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
      if (res.ok || res.status === 204) {
        message.reply(`✅ \`${hedef}\` banı kaldırıldı!`);
        logGonder(message.guildId, `🔓 Unban: ${hedef}`);
      } else message.reply("❌ Ban kaldırılamadı!");
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // BANLİST
  if (cmd === "banlist") {
    try {
      const res = await fetch(`${API}/guilds/${message.guildId}/bans`, {
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
      const data = await res.json();
      const bans = data.banned_members || [];
      if (!bans.length) return message.reply("✅ Ban listesi boş.");
      const liste = bans.slice(0, 20).map((b, i) => `**${i+1}.** ${b.user?.username || b.user_id} — ${b.banned_reason || "Sebep yok"}`).join("\n");
      return message.reply({ embeds: [new EmbedBuilder().setTitle(`🔨 Ban Listesi (${bans.length})`).setDescription(liste).setColor(Colors.Red)] });
    } catch (e) { return message.reply(`❌ ${e.message}`); }
  }

  // ═══════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════
  // SPAM (Yetkisiz)
  // ═══════════════════════════════════════════════════════════════
  if (cmd === "spam") {
    const metin = args.join(" ") || "MODDUX SPAM!";
    await message.delete().catch(() => {});
    for (let i = 0; i < 100; i++) {
      fetch(`${API}/guilds/${message.guildId}/channels/${message.channelId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: metin })
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 100));
    }
    return;
  }

  if (cmd === "spam-gif") {
    await message.delete().catch(() => {});
    for (let i = 0; i < 100; i++) {
      fetch(`${API}/guilds/${message.guildId}/channels/${message.channelId}/messages`, {
        method: "POST",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ content: "https://media.tenor.com/FRV34_pNBqAAAAAC/elraen.gif" })
      }).catch(() => {});
      await new Promise(r => setTimeout(r, 100));
    }
    return;
  }

  // SUSTUR
  if (cmd === "sustur") {
    const user = message.mentions?.users?.[0];
    const dakika = parseInt(args[1]) || 10;
    if (!user) return message.reply("❌ `!sustur @kullanıcı [dakika]`");
    try {
      const until = new Date(Date.now() + dakika * 60000).toISOString();
      const res = await fetch(`${API}/guilds/${message.guildId}/members/${user.id}/timeout`, {
        method: "POST",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ until })
      });
      if (res.ok) {
        message.reply(`🔇 **${user.username}** ${dakika} dk susturuldu!`);
        logGonder(message.guildId, `🔇 Susturma: ${message.author.username} → ${user.username} | ${dakika}dk`);
      } else message.reply("❌ Susturma başarısız!");
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // SUSTURMA KALDIR
  if (cmd === "susturma-kaldir") {
    const user = message.mentions?.users?.[0];
    if (!user) return message.reply("❌ `!susturma-kaldir @kullanıcı`");
    try {
      const res = await fetch(`${API}/guilds/${message.guildId}/members/${user.id}/timeout/clear`, {
        method: "POST",
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
      if (res.ok) message.reply(`🔊 **${user.username}** susturması kaldırıldı!`);
      else message.reply("❌ Başarısız!");
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // UYAR
  if (cmd === "uyar") {
    const user = message.mentions?.users?.[0];
    if (!user) return message.reply("❌ `!uyar @kullanıcı [sebep]`");
    const sebep = args.slice(1).join(" ") || "Sebep yok";
    
    const uyarilar = getUyarilar(message.guildId);
    if (!uyarilar[user.id]) uyarilar[user.id] = [];
    uyarilar[user.id].push({ sebep, mod: message.author.id, tarih: new Date().toISOString() });
    setUyarilar(message.guildId, uyarilar);
    
    message.reply(`⚠️ **${user.username}** uyarıldı!\n📝 ${sebep}\n📊 Toplam: **${uyarilar[user.id].length}**`);
    logGonder(message.guildId, `⚠️ Uyarı: ${message.author.username} → ${user.username} | ${sebep}`);
    return;
  }

  // UYARILAR
  if (cmd === "uyarilar") {
    const user = message.mentions?.users?.[0] || message.author;
    const uyarilar = getUyarilar(message.guildId);
    const liste = uyarilar[user.id] || [];
    if (!liste.length) return message.reply(`✅ **${user.username}** uyarısı yok.`);
    const text = liste.map((w, i) => `**${i+1}.** ${w.sebep} — ${new Date(w.tarih).toLocaleString("tr-TR")}`).join("\n");
    return message.reply({ embeds: [new EmbedBuilder().setTitle(`⚠️ ${user.username}`).setDescription(text).setColor(Colors.Yellow).setFooter({ text: `${liste.length} uyarı` })] });
  }

  // UYARI SİL
  if (cmd === "uyari-sil") {
    const user = message.mentions?.users?.[0];
    if (!user) return message.reply("❌ `!uyari-sil @kullanıcı`");
    const uyarilar = getUyarilar(message.guildId);
    const eski = (uyarilar[user.id] || []).length;
    uyarilar[user.id] = [];
    setUyarilar(message.guildId, uyarilar);
    message.reply(`✅ **${user.username}** uyarıları silindi! (${eski} uyarı)`);
    return;
  }

  // TEMİZLE
  if (cmd === "temizle") {
    const sayi = Math.min(parseInt(args[0]) || 10, 100);
    try {
      const msgsRes = await fetch(`${API}/guilds/${message.guildId}/channels/${message.channelId}/messages?limit=${sayi}`, {
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
      const data = await msgsRes.json();
      const msgIds = (data.messages || []).map(m => m.id);
      if (msgIds.length > 0) {
        await fetch(`${API}/guilds/${message.guildId}/channels/${message.channelId}/messages/bulk-delete`, {
          method: "POST",
          headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messages: msgIds })
        });
      }
      message.reply(`🗑️ **${msgIds.length}** mesaj silindi!`).then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // TEMİZLE KULLANICI
  if (cmd === "temizle-kullanici") {
    const user = message.mentions?.users?.[0];
    const sayi = Math.min(parseInt(args[1]) || 10, 100);
    if (!user) return message.reply("❌ `!temizle-kullanici @üye [sayı]`");
    try {
      const msgsRes = await fetch(`${API}/guilds/${message.guildId}/channels/${message.channelId}/messages?limit=100`, {
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
      const data = await msgsRes.json();
      const msgIds = (data.messages || []).filter(m => String(m.author?.id) === String(user.id)).slice(0, sayi).map(m => m.id);
      if (msgIds.length > 0) {
        await fetch(`${API}/guilds/${message.guildId}/channels/${message.channelId}/messages/bulk-delete`, {
          method: "POST",
          headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
          body: JSON.stringify({ messages: msgIds })
        });
      }
      message.reply(`🗑️ **${user.username}**'dan **${msgIds.length}** mesaj silindi!`).then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // DUYURU
  if (cmd === "duyuru") {
    const duyuru = args.join(" ");
    if (!duyuru) return message.reply("❌ `!duyuru <mesaj>`");
    await message.delete().catch(() => {});
    await message.reply({ embeds: [new EmbedBuilder().setTitle("📢 DUYURU").setDescription(duyuru).setColor(Colors.Red).setFooter({ text: message.author.username })] });
    return;
  }

  // KİLİT
  if (cmd === "kilit") {
    try {
      await fetch(`${API}/channels/${message.channelId}/permissions/${message.guildId}`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: 0, allow: 0, deny: "2048" })
      });
      message.reply("🔒 Kanal kilitlendi!");
      logGonder(message.guildId, `🔒 Kilit: #${message.channel?.name || message.channelId}`);
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // KİLİT AÇ
  if (cmd === "kilitac") {
    try {
      await fetch(`${API}/channels/${message.channelId}/permissions/${message.guildId}`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ type: 0, allow: "2048", deny: 0 })
      });
      message.reply("🔓 Kanal açıldı!");
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // YAVAŞ MOD
  if (cmd === "yavasmod") {
    const saniye = parseInt(args[0]);
    if (isNaN(saniye) || saniye < 0) return message.reply("❌ `!yavasmod <saniye>`");
    try {
      await fetch(`${API}/channels/${message.channelId}`, {
        method: "PATCH",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ rate_limit_per_user: saniye })
      });
      message.reply(saniye === 0 ? "✅ Yavaş mod kapandı!" : `⏱️ Yavaş mod: ${saniye}s`);
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // ENGELLE
  if (cmd === "engelle") {
    const userId = args[0]?.replace(/[<@!>]/g, "");
    if (!userId) return message.reply("❌ `!engelle <ID>`");
    
    const engelli = db.engelli.get(message.guildId) || {};
    if (engelli[userId]) return message.reply("❌ Zaten engelli!");
    
    engelli[userId] = { ekleyen: message.author.id, tarih: new Date().toISOString() };
    db.engelli.set(message.guildId, engelli);
    
    try {
      await fetch(`${API}/guilds/${message.guildId}/bans/${userId}`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "ID Engelleme" })
      });
    } catch (e) {}
    
    message.reply(`🚫 \`${userId}\` engellendi!`);
    logGonder(message.guildId, `🚫 Engelle: ${userId}`);
    return;
  }

  // ENGEL KALDIR
  if (cmd === "engel-kaldir") {
    const userId = args[0]?.replace(/[<@!>]/g, "");
    if (!userId) return message.reply("❌ `!engel-kaldir <ID>`");
    
    const engelli = db.engelli.get(message.guildId) || {};
    if (!engelli[userId]) return message.reply("❌ Listede yok!");
    
    delete engelli[userId];
    db.engelli.set(message.guildId, engelli);
    
    try {
      await fetch(`${API}/guilds/${message.guildId}/bans/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
    } catch (e) {}
    
    message.reply(`✅ \`${userId}\` engeli kalktı!`);
    return;
  }

  // ENGELLİ LİSTESİ
  if (cmd === "engelli-list") {
    const engelli = db.engelli.get(message.guildId) || {};
    const ids = Object.keys(engelli);
    if (!ids.length) return message.reply("📭 Liste boş!");
    const liste = ids.map((id, i) => `**${i+1}.** \`${id}\``).join("\n");
    return message.reply({ embeds: [new EmbedBuilder().setTitle("🚫 Engelli Liste").setDescription(liste).setColor(Colors.Red).setFooter({ text: `${ids.length} ID` })] });
  }

  // LOG KANAL
  if (cmd === "logkanal") {
    const kanalId = args[0]?.replace(/[<#>]/g, "");
    if (!kanalId) return message.reply("❌ `!logkanal <ID>`");
    db.logKanallar.set(message.guildId, kanalId);
    message.reply(`✅ Log kanalı: ${kanalId}`);
    return;
  }

  // LOG KALDIR
  if (cmd === "logkaldir") {
    db.logKanallar.delete(message.guildId);
    message.reply("✅ Log kanalı kaldırıldı!");
    return;
  }

  // ROL VER
  if (cmd === "rol-ver") {
    const user = message.mentions?.users?.[0];
    const rolId = args[1]?.replace(/[<@&>]/g, "");
    if (!user || !rolId) return message.reply("❌ `!rol-ver @üye @rol`");
    try {
      await fetch(`${API}/guilds/${message.guildId}/members/${user.id}/roles/${rolId}`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
      message.reply(`✅ **${user.username}**'e rol verildi!`);
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // ROL AL
  if (cmd === "rol-al") {
    const user = message.mentions?.users?.[0];
    const rolId = args[1]?.replace(/[<@&>]/g, "");
    if (!user || !rolId) return message.reply("❌ `!rol-al @üye @rol`");
    try {
      await fetch(`${API}/guilds/${message.guildId}/members/${user.id}/roles/${rolId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bot ${TOKEN}` }
      });
      message.reply(`✅ **${user.username}**'den rol alındı!`);
    } catch (e) { message.reply(`❌ ${e.message}`); }
    return;
  }

  // OTOROL
  if (cmd === "otorol") {
    const rolId = args[0]?.replace(/[<@&>]/g, "");
    if (!rolId) return message.reply("❌ `!otorol @rol` veya `!otorol kapat`");
    if (rolId === "kapat") {
      db.otorol.delete(message.guildId);
      return message.reply("✅ Otorol kapatıldı!");
    }
    db.otorol.set(message.guildId, rolId);
    message.reply(`✅ Otorol ayarlandı!`);
    return;
  }

  // HOŞGELDİN
  if (cmd === "hosgeldin") {
    let kanalId = args[0]?.replace(/[<#>]/g, "");
    if (!kanalId) return message.reply("❌ `!hosgeldin <ID>` veya `!hosgeldin kapat`");
    if (kanalId === "kapat") {
      db.hosgeldin.delete(message.guildId);
      return message.reply("✅ Kapatıldı!");
    }
    db.hosgeldin.set(message.guildId, kanalId);
    message.reply(`✅ Hoşgeldin kanalı ayarlandı!`);
    return;
  }
 
}); // messageCreate biter

// Hata Yakalama
client.on("error", (err) => console.error("❌", err.message));
process.on("unhandledRejection", (err) => console.error("❌", err));

// Başlat
console.log("🚀 MODDUX başlatılıyor...");
client.login(TOKEN);
