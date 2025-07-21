const express = require("express");
const router = express.Router();
const reviewcontroller = require("../mongo/controllers/reviewController");

router.post("/", async (req, res) => {
  try {
    await reviewcontroller.addReview(req, res);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server ở route /", error: err.message });
  }
});

router.get("/product/:product_id", async (req, res) => {
  try {
    await reviewcontroller.getReviewByProduct(req, res);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server ở route /product/:product_id", error: err.message });
  }
});

router.get("/order/:order_id", async (req, res) => {
  try {
    await reviewcontroller.getReviewByOrder(req, res);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server ở route /order/:order_id", error: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    await reviewcontroller.getAllReviews(req, res);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server ở route /", error: err.message });
  }
});

module.exports = router;
