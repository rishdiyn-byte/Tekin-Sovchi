const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: true },
  region: { type: String, required: true },
  job: { type: String, default: '' },
  photoUrl: { type: String, default: '' },
  bio: { type: String, default: '' },
  isVip: { type: Boolean, default: false },
  isApproved: { type: Boolean, default: false }, // Moderatsiya holati
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);