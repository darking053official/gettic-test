# Gettic Bot Document

Gettic sohbet platformu için resmi bot uygulaması. HTTP paneli ile birlikte gelir.

[![npm version](https://img.shields.io/npm/v/gettic.js.svg)](https://www.npmjs.com/package/gettic.js)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 Hızlı Başlangıç

### 1. Kurulum

```bash
npm install
```

### 2. Token Al

1. gettic.onrender.com [`Git`](https://gettic.onrender.com) adresine git

2. Giriş yap

3. Üst menüden Bot sekmesine tıkla

4. Bot oluştur

5. Token'ı kopyala

6. Token'ı Gir

bot.js dosyasında BOT_TOKEN yazan yere token'ını yapıştır:

```javascript
const bot = new Client({
    url: 'https://gettic.onrender.com',
    token: 'SENIN_TOKENIN',  // ← Buraya
    username: 'GetticBot',
    prefix: '/'
});
```

### 3. Başlat

```bash
npm start
```

---

### 🌐 HTTP Panel

Bot çalışınca otomatik olarak HTTP paneli de başlar:

• URL Method Açıklama

`/ GET` Bot bilgisi (isim, durum, komutlar)

`/ping` GET Ping kontrolü

`/stats` GET Bellek ve uptime bilgisi

`/send POST` Odaya mesaj gönder

### Panel Ekranı Örneği

```json
{
  "bot": "GetticBot",
  "status": "🟢 Çevrimiçi",
  "uptime": "125s",
  "ping": "45ms",
  "commands": ["ping", "sa", "yardim", "stats"]
}
```

### POST ile Mesaj Gönderme

```bash
curl -X POST http://localhost:3000/send \
  -H "Content-Type: application/json" \
  -d '{"room":"genel","message":"Merhaba!"}'
```

---

### 🎮 Sohbet Komutları

Sohbette `/` ile başlayan komutları bot otomatik algılar:

• Komut Cevap Açıklama

`/ping` 🏓 Pong! Gecikme: XXms Gecikme testi

`/sa` Aleyküm selam @kullanıcı! 👋 Selamlaşma

`/yardim` Komut listesi Tüm komutları gösterir

`/stats` Bot istatistikleri Uptime, ping bilgisi

---

### ✏️ Komut Ekleme

bot.js dosyasına yeni komut eklemek çok kolay:

```javascript
bot.command('merhaba', (ctx) => {
    ctx.reply(`Merhaba ${ctx.sender}! Hoş geldin! 🎉`);
});

bot.command('sunucu', (ctx) => {
    ctx.reply(`🏠 Sunucu: Gettic\n📍 Oda: ${ctx.room}`);
});

bot.command('sil', (ctx) => {
    const sayi = parseInt(ctx.args[0]) || 5;
    ctx.reply(`🧹 ${sayi} mesaj siliniyor...`);
});
```

## Context Objesi

### Özellik Tip Açıklama

`ctx.sender string` Mesajı gönderen kullanıcı

`ctx.room string` Mesajın gönderildiği oda

`ctx.args array` Komuttan sonraki kelimeler

`ctx.reply()` function Aynı odaya cevap verir

`ctx.message` object Ham mesaj objesi

`ctx.delete()` function Mesajı siler

`ctx.edit()` function Mesajı düzenler

---

### 📁 Dosya Yapısı

```
gettic-bot/
├── bot.js          # Ana bot dosyası
├── package.json    # Bağımlılıklar
├── README.md       # Bu dosya
└── node_modules/   # Kütüphaneler
```

---

## 🔧 Geliştirme

```bash
# Geliştirme modunda başlat (dosya değişince otomatik yeniden başlar)
npm run dev
```

---

## 📦 Bağımlılıklar

· [`gettic.js`](https://www.npmjs.com/package/gettic.js) - Resmi Gettic kütüphanesi

· `socket.io-client` - WebSocket bağlantısı

· `axios` - HTTP istekleri

---

## 📄 Lisans

MIT © darking053

---

## 🔗 Bağlantılar

· [`Gettic Platform`](https://gettic.onrender.com)

· [`Gettic.js npmjs`](https://www.npmjs.com/package/gettic.js)

· [`GitHub`](https://github.com/darking053official/gettic)

---

Made with ❤️ for Gettic

---
