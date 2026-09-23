const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const User = require('./models/User');

const app = express();
app.use(express.json());

// Public va Uploads papkalari
app.use(express.static(path.join(__dirname, 'public')));
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer sozlamalari
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'photo-' + Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Faqat rasm fayllari yuklanishi mumkin!'), false);
  }
});

// MongoDB ulanishi
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB muvaffaqiyatli ulandi!'))
    .catch((err) => console.error('MongoDB ulanishida xatolik:', err));
}

// Telegram Bot
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = process.env.ADMIN_ID; // Admin Telegram ID'si (.env faylidan olinadi)

// API YO'LLARI

// 1. Rasm yuklash
app.post('/api/upload', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Rasm yuklanmadi' });
    res.json({ success: true, photoUrl: `/uploads/${req.file.filename}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Tasdiqlangan katalog anketalarini olish
app.get('/api/users', async (req, res) => {
  try {
    const { gender, region } = req.query;
    let filter = { isApproved: true }; // Faqat admin tasdiqlaganlar ko'rinadi

    if (gender && gender !== 'Barchasi') filter.gender = gender;
    if (region && region.trim() !== '') filter.region = new RegExp(region.trim(), 'i');

    const users = await User.find(filter).sort({ isVip: -1, createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Bitta foydalanuvchi anketasini olish
app.get('/api/user/:telegramId', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.telegramId });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Anketani saqlash va adminga moderatsiyaga yuborish
app.post('/api/user/save', async (req, res) => {
  try {
    const { telegramId, name, age, gender, region, job, photoUrl, bio } = req.body;
    
    // Yangilangan yoki yangi anketa moderatsiyaga o'tadi
    let user = await User.findOneAndUpdate(
      { telegramId },
      { name, age, gender, region, job, photoUrl, bio, isApproved: false },
      { new: true, upsert: true }
    );

    // Adminga bildirishnoma yuborish
    if (ADMIN_ID) {
      const msgText = `<b>🆕 YANGI ANKETA MODERATSIYASI</b>\n\n` +
        `👤 <b>Ismi:</b> ${name}\n` +
        `🎂 <b>Yoshi:</b> ${age}\n` +
        `🚻 <b>Jinsi:</b> ${gender}\n` +
        `📍 <b>Viloyat:</b> ${region}\n` +
        `💼 <b>Kasbi:</b> ${job || 'Ko\'rsatilmagan'}\n` +
        `📝 <b>Bio:</b> ${bio || 'Mavjud emas'}\n` +
        `🆔 <b>ID:</b> <code>${telegramId}</code>`;

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('Tasdiqlash 🟢', `approve_${telegramId}`),
          Markup.button.callback('Rad etish 🔴', `reject_${telegramId}`)
        ]
      ]);

      if (photoUrl) {
        const fullPhotoPath = path.join(__dirname, 'public', photoUrl);
        if (fs.existsSync(fullPhotoPath)) {
          await bot.telegram.sendPhoto(ADMIN_ID, { source: fullPhotoPath }, { caption: msgText, parse_mode: 'HTML', ...keyboard });
        } else {
          await bot.telegram.sendMessage(ADMIN_ID, msgText, { parse_mode: 'HTML', ...keyboard });
        }
      } else {
        await bot.telegram.sendMessage(ADMIN_ID, msgText, { parse_mode: 'HTML', ...keyboard });
      }
    }

    res.json({ success: true, user, message: "Anketangiz moderatsiyaga yuborildi." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bot Callback so'rovlarini ushlash (Admin tasdiqlashi yoki rad etishi)
bot.action(/^approve_(.+)$/, async (ctx) => {
  const targetId = ctx.match[1];
  await User.findOneAndUpdate({ telegramId: targetId }, { isApproved: true });
  
  await ctx.answerCbQuery('Anketa tasdiqlandi!');
  await ctx.editMessageCaption((ctx.callbackQuery.message.caption || '') + '\n\n✅ <b>STATUS: TASDIQLANDI</b>', { parse_mode: 'HTML' }).catch(() => {});
  
  // Foydalanuvchiga xabar yuborish
  bot.telegram.sendMessage(targetId, '🎉 Tabriklaymiz! Anketangiz admin tomonidan tasdiqlandi va katalogga joylashtirildi.').catch(() => {});
});

bot.action(/^reject_(.+)$/, async (ctx) => {
  const targetId = ctx.match[1];
  await User.findOneAndDelete({ telegramId: targetId });
  
  await ctx.answerCbQuery('Anketa rad etildi!');
  await ctx.editMessageCaption((ctx.callbackQuery.message.caption || '') + '\n\n❌ <b>STATUS: RAD ETILDI</b>', { parse_mode: 'HTML' }).catch(() => {});
  
  // Foydalanuvchiga xabar yuborish
  bot.telegram.sendMessage(targetId, '⚠️ Afsuski, anketangiz qoidalarga mos kelmagani sababli rad etildi. Qayta urinib ko\'ring.').catch(() => {});
});

// Start buyrug'i
bot.start((ctx) => {
  let url = process.env.WEBAPP_URL || "https://tekin-sovchi.onrender.com";
  url = url.replace(/[()\[\]]/g, '').trim();

  return ctx.reply('Xush kelibsiz! Mini App-ni ochish uchun pastdagi tugmani bosing:', {
    reply_markup: {
      keyboard: [[{ text: "Mini App-ni ochish 🚀", web_app: { url } }]],
      resize_keyboard: true
    }
  });
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server ${PORT}-portda ishga tushdi..`));

bot.launch().then(() => console.log('Bot ishga tushdi!')).catch(console.error);

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));