const express = require('express');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

// MongoDB'ga ulanish
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB muvaffaqiyatli ulandi!'))
    .catch((err) => console.error('MongoDB ulanishida xatolik:', err));
}

// Telegram botni yaratish
const bot = new Telegraf(process.env.BOT_TOKEN);

// /start buyrug'i kelganda tugma bilan javob berish
bot.start((ctx) => {
  return ctx.reply('Xush kelibsiz! Mini App-ni ochish uchun pastdagi tugmani bosing:', {
    reply_markup: {
      keyboard: [
        [
          {
            text: "Mini App-ni ochish 🚀",
            web_app: { url: process.env.WEBAPP_URL || "https://tekin-sovchi.onrender.com" }
          }
        ]
      ],
      resize_keyboard: true
    }
  });
});

// Express serveri (Render tekshiruvi uchun)
app.get('/', (req, res) => {
  res.send('Tekin Sovchi API muvaffaqiyatli ishlamoqda!');
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

// Server to'xtatilganda botni to'xtatish
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));