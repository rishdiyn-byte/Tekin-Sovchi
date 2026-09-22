const express = require('express');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const path = require('path');
const User = require('./models/User');

const app = express();
app.use(express.json());

// Public papkasidagi statik fayllarni ulash
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB ulanishi
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB muvaffaqiyatli ulandi!'))
    .catch((err) => console.error('MongoDB ulanishida xatolik:', err));
}

// REST API YO'LLARI

// 1. Katalog uchun barcha nomzodlarni (filter bilan) olish
app.get('/api/users', async (req, res) => {
  try {
    const { gender, region } = req.query;
    let filter = {};

    if (gender && gender !== 'Barchasi') filter.gender = gender;
    if (region && region.trim() !== '') filter.region = new RegExp(region.trim(), 'i');

    const users = await User.find(filter).sort({ isVip: -1, createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Bitta foydalanuvchi anketasini olish
app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Anketani saqlash va yangilash
app.post('/api/user/save', async (req, res) => {
  try {
    const { telegramId, name, age, gender, region, job, bio } = req.body;
    
    let user = await User.findOneAndUpdate(
      { telegramId },
      { name, age, gender, region, job, bio },
      { new: true, upsert: true }
    );

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Telegram Bot
const bot = new Telegraf(process.env.BOT_TOKEN);

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi..`);
});

bot.launch()
  .then(() => console.log('Bot muvaffaqiyatli ishga tushdi!'))
  .catch((err) => console.error('Botni ishga tushirishda xatolik:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));