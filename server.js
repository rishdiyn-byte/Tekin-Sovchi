const express = require('express');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// 1. 'uploads' papkasini vaqtinchalik saqlash uchun tekshirish
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer sozlamasi (Lokal fayllarni qabul qilish uchun)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// 2. MongoDB-ga ulanish
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/tekin_sovchi";
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB muvaffaqiyatli ulandi..."))
  .catch(err => console.error("MongoDB ulanish xatosi:", err));

// Database Schema
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  name: String,
  age: Number,
  gender: String,
  region: String,
  job: String,
  photoUrl: String,
  bio: String,
  isApproved: { type: Boolean, default: false },
  isVip: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 3. Telegram Bot sozlamalari
const BOT_TOKEN = process.env.BOT_TOKEN;
let bot = null;

if (BOT_TOKEN) {
  bot = new Telegraf(BOT_TOKEN);

  bot.start((ctx) => {
    const webAppUrl = process.env.WEB_APP_URL || "https://tekin-sovchi.onrender.com";
    ctx.reply("Assalomu alaykum! Tekin Sovchi loyihasiga xush kelibsiz.", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "Mini App-ni ochish 🚀", web_app: { url: webAppUrl } }]
        ]
      }
    });
  });

  // Moderatsiya: Tasdiqlash
  bot.action(/approve_(.+)/, async (ctx) => {
    try {
      const userId = ctx.match[1];
      await User.findByIdAndUpdate(userId, { isApproved: true });
      await ctx.answerCbQuery("Anketa tasdiqlandi!");
      await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n✅ STATUS: Tasdiqlandi");
    } catch (err) {
      console.error("Tasdiqlashda xatolik:", err);
    }
  });

  // Moderatsiya: Rad etish
  bot.action(/reject_(.+)/, async (ctx) => {
    try {
      const userId = ctx.match[1];
      await User.findByIdAndDelete(userId);
      await ctx.answerCbQuery("Anketa rad etildi va o'chirildi!");
      await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n❌ STATUS: Rad etildi");
    } catch (err) {
      console.error("Rad etishda xatolik:", err);
    }
  });

  bot.launch().catch(err => console.error("Bot launch xatosi:", err));
} else {
  console.warn("⚠️ BOT_TOKEN topilmadi! Telegram bot ishga tushmadi.");
}

// 4. API Endpoints

// 1) Rasm yuklash
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "Rasm yuklanmadi" });
  res.json({ success: true, photoUrl: `/uploads/${req.file.filename}` });
});

// 2) Profil ma'lumotlarini olish
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.id });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3) Anketani saqlash va Adminga Telegram orqali yuborish
app.post('/api/user/save', async (req, res) => {
  try {
    const { telegramId, name, age, gender, region, job, photoUrl, bio } = req.body;

    const user = await User.findOneAndUpdate(
      { telegramId },
      { name, age, gender, region, job, photoUrl, bio, isApproved: false },
      { upsert: true, returnDocument: 'after' }
    );

    const ADMIN_ID = process.env.ADMIN_ID;
    if (ADMIN_ID && bot) {
      const msg = `<b>Yangi anketa!</b>\n\n` +
                  `<b>Ism:</b> ${name}\n` +
                  `<b>Yosh:</b> ${age}\n` +
                  `<b>Jins:</b> ${gender}\n` +
                  `<b>Viloyat:</b> ${region}\n` +
                  `<b>Kasbi:</b> ${job || '-'}\n` +
                  `<b>Haqida:</b> ${bio || '-'}`;

      const keyboard = {
        inline_keyboard: [
          [
            { text: "Tasdiqlash 🟢", callback_data: `approve_${user._id}` },
            { text: "Rad etish 🔴", callback_data: `reject_${user._id}` }
          ]
        ]
      };

      if (photoUrl) {
        const baseUrl = process.env.WEB_APP_URL || `${req.protocol}://${req.get('host')}`;
        const fullPhotoUrl = photoUrl.startsWith('http') ? photoUrl : `${baseUrl}${photoUrl}`;
        
        await bot.telegram.sendPhoto(ADMIN_ID, { url: fullPhotoUrl }, { caption: msg, parse_mode: 'HTML', reply_markup: keyboard });
      } else {
        await bot.telegram.sendMessage(ADMIN_ID, msg, { parse_mode: 'HTML', reply_markup: keyboard });
      }
    }

    res.json({ success: true, message: "Anketa saqlandi va moderatsiyaga yuborildi!" });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4) Katalog uchun nomzodlarni filter orqali olish
app.get('/api/users', async (req, res) => {
  try {
    const { gender, region } = req.query;
    let filter = { isApproved: true };

    if (gender && gender !== 'Barchasi') filter.gender = gender;
    if (region && region !== 'Barchasi') filter.region = new RegExp(region, 'i');

    const users = await User.find(filter).sort({ isVip: -1, createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server ${PORT}-portda muvaffaqiyatli ishlamoqda...`));