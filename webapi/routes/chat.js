const express = require('express');
const router = express.Router();
const { chatWithBot } = require('../mongo/controllers/chatController');

router.post('/', chatWithBot);

module.exports = router;
