require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db.js');
const userRoutes = require('./routes/userRoutes.js');

const app = express();

// 1. Ma'lumotlar bazasiga ulanish
connectDB();

// 2. Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // <-- MANA SHU QATORNI QO'SHING

// 3. API Route'larni ulashtirish
app.use('/api/users', userRoutes);

// 4. Asosiy sahifa (Sog'lomlik testi)
app.get('/', (req, res) => {
  res.send('Tekin Sovchi API muvaffaqiyatli ishlamoqda!');
});

// 5. Serverni ishga tushirish
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server ${PORT}-portda ishga tushdi...`);
});