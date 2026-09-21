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

// Telegram Botni sozlash
const bot = new Telegraf(process.env.BOT_TOKEN);

// /start buyrug'i uchun javob
bot.start((ctx) => {
  return ctx.reply('Xush kelibsiz! Mini App-dan foydalanish uchun pastdagi menyu tugmasini bosing.');
});

// Express marshruti (Render tekshiruvi uchun)
app.get('/', (req, res) => {
  res.send('Tekin Sovchi API muvaffaqiyatli ishlamoqda!');
});

// Express serverini ishga tushirish
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi..`);
});

// Botni Polling rejimida ishga tushirish
bot.launch().then(() => {
  console.log('Bot muvaffaqiyatli ishga tushdi!');
}).catch((err) => {
  console.error('Botni ishga tushirishda xatolik:', err);
});

// Server to'xtatilganda botni xavfsiz o'chirish
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));