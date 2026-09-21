const express = require('express');
const router = express.Router();
const { getCandidateCatalog } = require('../controllers/userController');

// Katalog API yo'lagi (GET request)
router.get('/catalog/:telegramId', getCandidateCatalog);

module.exports = router;