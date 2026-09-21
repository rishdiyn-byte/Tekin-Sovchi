const User = require('../models/User');

// 1. Moslik foizini (Match %) hisoblaydigan yordamchi funksiya
const calculateMatchPercentage = (currentUser, candidate) => {
  let totalPoints = 0;
  let maxPoints = 0;

  // A) Qadriyatlar testi solishtiruvi (Quiz - 5 ta savol)
  if (currentUser.valuesQuiz && candidate.valuesQuiz) {
    for (let i = 1; i <= 5; i++) {
      const qKey = `q${i}`;
      maxPoints += 10;
      if (currentUser.valuesQuiz[qKey] === candidate.valuesQuiz[qKey]) {
        totalPoints += 10; // Javoblar bir xil bo'lsa 10 ball
      } else if (Math.abs(currentUser.valuesQuiz[qKey] - candidate.valuesQuiz[qKey]) === 1) {
        totalPoints += 5;  // Yaqin javob bo'lsa 5 ball
      }
    }
  }

  // B) Hudud mosligi
  maxPoints += 10;
  if (currentUser.region === candidate.region) {
    totalPoints += 10;
  }

  // C) Yosh filtri mosligi
  maxPoints += 10;
  const preferredMinAge = currentUser.filters?.minAge || 18;
  const preferredMaxAge = currentUser.filters?.maxAge || 50;
  if (candidate.age >= preferredMinAge && candidate.age <= preferredMaxAge) {
    totalPoints += 10;
  }

  if (maxPoints === 0) return 50; // Standart holatda 50%
  return Math.round((totalPoints / maxPoints) * 100);
};

// 2. Katalog uchun nomzodlarni saralab beruvchi API controller
exports.getCandidateCatalog = async (req, res) => {
  try {
    const { telegramId } = req.params;

    // Joriy foydalanuvchini topamiz
    const currentUser = await User.findOne({ telegramId });
    if (!currentUser) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    // Qarama-qarshi jinsdagi va bloklanmagan nomzodlarni qidiramiz
    const targetGender = currentUser.gender === 'erkak' ? 'ayol' : 'erkak';

    const candidates = await User.find({
      telegramId: { $ne: currentUser.telegramId }, // O'zini chiqarmaydi
      gender: targetGender,
      isIncognito: false, // Inkognito rejimdagilarni yashiradi
      _id: { $nin: currentUser.blockedUsers } // Bloklanganlarni chiqarmaydi
    });

    // Har bir nomzod uchun Match % hisoblaymiz
    const formattedCandidates = candidates.map(candidate => {
      const matchPercentage = calculateMatchPercentage(currentUser, candidate);
      
      return {
        _id: candidate._id,
        telegramId: candidate.telegramId,
        firstName: candidate.firstName,
        age: candidate.age,
        region: candidate.region,
        occupation: candidate.occupation,
        photoUrl: candidate.photoUrl,
        isPhotoBlurred: candidate.isPhotoBlurred,
        isVIP: candidate.isVIP,
        isVerified: candidate.isVerified,
        matchPercentage: matchPercentage
      };
    });

    // Eng yuqori moslik % va VIP profillarni birinchi o'ringa saralaymiz
    formattedCandidates.sort((a, b) => {
      if (b.isVIP !== a.isVIP) return b.isVIP - a.isVIP; // VIP profillar tepada
      return b.matchPercentage - a.matchPercentage;     // Yuqori Match % tepada
    });

    res.status(200).json({
      success: true,
      count: formattedCandidates.length,
      data: formattedCandidates
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};