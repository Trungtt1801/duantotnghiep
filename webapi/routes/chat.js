const express = require('express');
const router = express.Router();
const { chatWithBot } = require('../mongo/controllers/chatController');
const Keyword = require('../mongo/models/keywordModel')


  // http://localhost:3000/chat
  router.post('/', chatWithBot);
  router.post('/welcome', chatWithBot);
//  http://localhost:3000/chat/seed-intents
router.post("/seed-intents", async (req, res) => {
  try {
    const data = req.body.data; // [{ word, intent }, ...]

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ message: "Dữ liệu không hợp lệ" });
    }

    let inserted = [];

    for (const item of data) {
      const word = item.word.trim().toLowerCase();
      const exists = await Keyword.findOne({ word });

      if (!exists) {
        const newKeyword = await Keyword.create({
          word,
          intent: item.intent || "unknown",
        });
        inserted.push(newKeyword);
      }
    }

    return res.status(200).json({
      message: `✅ Đã thêm ${inserted.length} keyword mới.`,
      inserted,
    });
  } catch (err) {
    console.error("❌ Lỗi seed intent:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
});

module.exports = router;
