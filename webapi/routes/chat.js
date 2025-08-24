const express = require('express');
const router = express.Router();
const { chatWithBot, autoCreateOrderFromChat } = require('../mongo/controllers/chatController');
const Keyword = require('../mongo/models/keywordModel')


  // http://localhost:3000/api/chat
  router.post('/', chatWithBot);
  router.post('/welcome', chatWithBot);
//  http://localhost:3000/api/chat/seed-intents
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
// routes/orderRoutes.js hoặc file router của bạn
router.post("/auto-order", async (req, res) => {
  try {
    const {
      userId,
      productId,
      variantId,
      quantity,
      paymentMethod,
      isGuest,
      guestAddress,
    } = req.body;

    const result = await autoCreateOrderFromChat({
      userId,
      productId,
      variantId,
      quantity,
      paymentMethod,
      isGuest,
      guestAddress,
    });

    if (!result.success) throw new Error(result.message);

    res.status(200).json({ success: true, orderId: result.orderId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});


module.exports = router;
