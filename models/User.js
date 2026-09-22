const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Erkak', 'Ayol'], required: true },
  region: { type: String, required: true },
  job: { type: String, default: 'Ko\'rsatilmagan' },
  bio: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  isVip: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);