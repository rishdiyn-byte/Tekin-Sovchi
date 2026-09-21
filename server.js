require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Telegraf } = require('telegraf');
const connectDB = require('./config/db.js');
const userRoutes = require('./routes/userRoutes.js');

const app = express();

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/users', userRoutes);

// Telegram Botni ishga tushirish
const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://tekin-sovchi.onrender.com";

console.log("Qidirilayotgan BOT_TOKEN statusi:", BOT_TOKEN ? "Mavjud" : "Yo'q");

if (BOT_TOKEN) {
  const bot = new Telegraf(BOT_TOKEN);

  bot.start(async (ctx) => {
    console.log("/start buyrug'i qabul qilindi!");
    await ctx.reply(`Xush kelibsiz, ${ctx.from.first_name}! "Tekin Sovchi" botiga xush kelibsiz.`, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Mini App'ni ochish",
              web_app: { url: WEBAPP_URL }
            }
          ]
        ]
      }
    });
  });

  bot.launch()
    .then(() => console.log('Telegram Bot muvaffaqiyatli ishga tushdi!'))
    .catch((err) => console.error('Botni ishga tushirishda xatolik:', err));

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
} else {
  console.warn("XATO: BOT_TOKEN Environment Variables ichida topilmadi!");
}

app.get('/', (req, res) => {
  res.send('Tekin Sovchi API muvaffaqiyatli ishlamoqda!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi...`);
});