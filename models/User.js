const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  firstName: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['erkak', 'ayol'], required: true },
  region: { type: String, required: true },
  occupation: { type: String, default: '' },
  height: { type: Number },
  photoUrl: { type: String, default: '' },
  isPhotoBlurred: { type: Boolean, default: true },
  
  // Qadriyatlar testi (Moslik % hisoblash uchun)
  valuesQuiz: {
    q1: Number,
    q2: Number,
    q3: Number,
    q4: Number,
    q5: Number
  },

  // Qidiruv filtrlari
  filters: {
    minAge: { type: Number, default: 18 },
    maxAge: { type: Number, default: 50 },
    preferredRegion: { type: String, default: 'Barchasi' }
  },

  // Status va obunalar
  isVIP: { type: Boolean, default: false },
  isIncognito: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  completionPercentage: { type: Number, default: 0 },

  // Saqlanganlar va bloklanganlar
  savedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);