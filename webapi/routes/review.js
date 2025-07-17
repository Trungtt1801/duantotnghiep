const express = require('express');
const router = express.Router();
const reviewController = require('../mongo/controllers/reviewController');

// [POST] Gửi đánh giá
// POST /review/
router.post('/', async (req, res) => {
  try {
    const result = await reviewController.addReview(req.body);
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [GET] Lấy đánh giá theo product_id (có thể thêm color, size nếu cần)
// GET /review/product/:product_id?color=Red&size=L
router.get('/product/:product_id', async (req, res) => {
  try {
    const { color, size } = req.query;
    const result = await reviewController.getReviewByProduct(req.params.product_id, color, size);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [GET] Tìm kiếm/lọc đánh giá (theo keyword sản phẩm, page, limit)
// GET /review/search?keyword=&page=&limit=
router.get('/search', async (req, res) => {
  try {
    const result = await reviewController.getAllReviews(req.query);
    return res.status(200).json({ status: true, ...result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});


module.exports = router;
