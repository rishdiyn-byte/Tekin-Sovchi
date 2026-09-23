const express = require('express');
const mongoose = require('mongoose');
const { Telegraf } = require('telegraf');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// Rasm yuklash (Multer) sozlamalari
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// MongoDB Ulanish
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://dasturchi:password@cluster.mongodb.net/tekin_sovchi";
mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB-ga ulandi..."))
  .catch(err => console.error("MongoDB ulanishda xato:", err));

// Schema va Model
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

// Telegram Bot
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply("Tekin Sovchi botiga xush kelibsiz!", {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Mini App-ni ochish 🚀", web_app: { url: process.env.WEB_APP_URL || "https://tekin-sovchi.onrender.com" } }]
      ]
    }
  });
});

// Moderatsiya tugmalarini eshitish (Approve / Reject)
bot.action(/approve_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  await User.findByIdAndUpdate(userId, { isApproved: true });
  await ctx.answerCbQuery("Anketa tasdiqlandi!");
  await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n✅ <b>STATUS: Tasdiqlandi</b>", { parse_mode: 'HTML' });
});

bot.action(/reject_(.+)/, async (ctx) => {
  const userId = ctx.match[1];
  await User.findByIdAndDelete(userId);
  await ctx.answerCbQuery("Anketa rad etildi!");
  await ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n❌ <b>STATUS: Rad etildi va o'chirildi</b>", { parse_mode: 'HTML' });
});

bot.launch();

// --- API ROUTES ---

// 1. Rasm yuklash API
app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: "Rasm yuklanmadi" });
  const photoUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, photoUrl });
});

// 2. Foydalanuvchi profilini olish
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await User.findOne({ telegramId: req.params.id });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Anketani saqlash va adminga yuborish
app.post('/api/user/save', async (req, res) => {
  try {
    const { telegramId, name, age, gender, region, job, photoUrl, bio } = req.body;

    const user = await User.findOneAndUpdate(
      { telegramId },
      { name, age, gender, region, job, photoUrl, bio, isApproved: false },
      { upsert: true, returnDocument: 'after' }
    );

    const ADMIN_ID = process.env.ADMIN_ID;
    if (ADMIN_ID) {
      const msg = `<b>Yangi anketa kelib tushdi!</b>\n\n<b>Ism:</b> ${name}\n<b>Yosh:</b> ${age}\n<b>Jins:</b> ${gender}\n<b>Viloyat:</b> ${region}\n<b>Kasbi:</b> ${job || 'Ko\'rsatilmagan'}\n<b>Haqida:</b> ${bio || '-'}`;

      if (photoUrl) {
        await bot.telegram.sendPhoto(ADMIN_ID, { url: req.protocol + '://' + req.get('host') + photoUrl }, {
          caption: msg,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: "Tasdiqlash 🟢", callback_data: `approve_${user._id}` }],
              [{ text: "Rad etish 🔴", callback_data: `reject_${user._id}` }]
            ]
          }
        });
      } else {
        await bot.telegram.sendMessage(ADMIN_ID, msg, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [{ text: "Tasdiqlash 🟢", callback_data: `approve_${user._id}` }],
              [{ text: "Rad etish 🔴", callback_data: `reject_${user._id}` }]
            ]
          }
        });
      }
    }

    res.json({ success: true, message: "Anketa saqlandi va adminga yuborildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Tasdiqlangan nomzodlar ro'yxatini olish (Katalog)
app.get('/api/users', async (req, res) => {
  try {
    const { gender, region } = req.query;
    let query = { isApproved: true };

    if (gender && gender !== 'Barchasi') query.gender = gender;
    if (region) query.region = new RegExp(region, 'i');

    const users = await User.find(query).sort({ isVip: -1, createdAt: -1 });
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server ${PORT}-portda ishga tushdi..`));