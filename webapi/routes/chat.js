const express = require('express');
const router = express.Router();
const { chatWithBot } = require('../mongo/controllers/chatController');

// http://localhost:3000/chat
router.post('/', chatWithBot);

module.exports = router;
