const express = require("express");
const router = express.Router();
const reviewController = require("../mongo/controllers/reviewController");
const multer = require("multer"); 
const path = require("path");

// Cấu hình multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// Routes
router.post("/", upload.array("images", 5), async (req, res) => {
  try {
    await reviewController.addReview(req, res);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi thêm đánh giá", error: err.message });
  }
});

router.get("/product/:product_id", async (req, res) => {
  try {
    await reviewController.getReviewByProduct(req, res);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy đánh giá theo sản phẩm", error: err.message });
  }
});

router.get("/order/:order_id", async (req, res) => {
  try {
    await reviewController.getReviewByOrder(req, res);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy đánh giá theo đơn hàng", error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    await reviewController.getAllReviews(req, res);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi lấy tất cả đánh giá", error: err.message });
  }
});

module.exports = router;
