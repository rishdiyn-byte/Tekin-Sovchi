const express = require('express');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(express.json());

// Public papkasidagi HTML/CSS/JS fayllarni uzatish
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB ulanishi
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB muvaffaqiyatli ulandi!'))
    .catch((err) => console.error('MongoDB ulanishida xatolik:', err));
}

// Telegram Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

// /start buyrug'i
bot.start((ctx) => {
  let url = process.env.WEBAPP_URL || "https://tekin-sovchi.onrender.com";
  url = url.replace(/[()\[\]]/g, '').trim();

  return ctx.reply('Xush kelibsiz! Mini App-ni ochish uchun pastdagi tugmani bosing:', {
    reply_markup: {
      keyboard: [
        [
          {
            text: "Mini App-ni ochish 🚀",
            web_app: { url: url }
          }
        ]
      ],
      resize_keyboard: true
    }
  });
});

// Telegram WebApp so'rovlariga public/index.html faylini qaytarish
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Portni sozlash
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi..`);
});

// Botni Polling rejimida ishga tushirish
bot.launch()
  .then(() => console.log('Bot muvaffaqiyatli ishga tushdi!'))
  .catch((err) => console.error('Botni ishga tushirishda xatolik:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));