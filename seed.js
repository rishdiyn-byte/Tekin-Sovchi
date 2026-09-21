require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Eski test ma'lumotlarini tozalaymiz
    await User.deleteMany({});

    // Test uchun nomzodlar
    const testUsers = [
      {
        telegramId: 1001,
        firstName: "Malika",
        age: 22,
        gender: "ayol",
        region: "Toshkent sh.",
        occupation: "Dasturchi",
        photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400",
        isPhotoBlurred: true,
        isVIP: true,
        isVerified: true,
        valuesQuiz: { q1: 1, q2: 2, q3: 1, q4: 3, q5: 2 }
      },
      {
        telegramId: 1002,
        firstName: "Laylo",
        age: 24,
        gender: "ayol",
        region: "Farg'ona",
        occupation: "O'qituvchi",
        photoUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400",
        isPhotoBlurred: false,
        isVIP: false,
        isVerified: true,
        valuesQuiz: { q1: 1, q2: 1, q3: 2, q4: 3, q5: 1 }
      },
      {
        telegramId: 1234567,
        firstName: "Zulfiqor",
        age: 25,
        gender: "erkak",
        region: "Farg'ona",
        occupation: "Dasturchi",
        photoUrl: "",
        isPhotoBlurred: false,
        valuesQuiz: { q1: 1, q2: 2, q3: 1, q4: 3, q5: 2 }
      }
    ];

    await User.insertMany(testUsers);
    console.log("Test foydalanuvchilar bazaga muvaffaqiyatli qo'shildi!");
    process.exit();
  } catch (err) {
    console.error("Xatolik:", err);
    process.exit(1);
  }
};

seedUsers();