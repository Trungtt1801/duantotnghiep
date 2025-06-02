const express = require('express');
const router = express.Router();
const reviewController = require('../mongo/controllers/reviewController');

// [POST] Gửi đánh giá
// POST /review/
router.post('/', async (req, res) => {
  try {
    const result = await reviewController.addReview(req.body);
    return res.status(201).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [GET] Lấy đánh giá theo sản phẩm
// GET /review/product/:productdetail_id
router.get('/product/:productdetail_id', async (req, res) => {
  try {
    const result = await reviewController.getReviewByProductDetail(req.params.productdetail_id);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

module.exports = router;
