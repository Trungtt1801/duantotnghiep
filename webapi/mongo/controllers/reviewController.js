const mongoose = require("mongoose");
const Review = require("../models/reviewModel");
    const baseUrl = "http://localhost:3000/api/images/";
const Product = require("../models/productsModel");
const User = require("../models/userModels");
const OrderDetail = require("../models/orderDetailModel");
  const addReview = async (req, res) => {
    try {
      const { product_id, user_id, content, rating } = req.body;
      const images = req.files?.map((file) => `${baseUrl}/${file.filename}`) || [];

      if (!product_id || !user_id || !content || !rating) {
        return res.status(400).json({ message: "Thiếu thông tin bắt buộc" });
      }

      // ✅ Kiểm tra xem user đã từng đánh giá sản phẩm này chưa
      const existingReview = await Review.findOne({ product_id, user_id });

      if (existingReview) {
        return res.status(400).json({
          message: "Bạn đã đánh giá sản phẩm này rồi.",
          review: existingReview,
        });
      }

      // ✅ Nếu chưa có thì tiếp tục thêm mới
      const newReview = new Review({
        product_id,
        user_id,
        content,
        rating,
        images,
      });

      await newReview.save();

      res.status(201).json({
        message: "Thêm đánh giá thành công",
        review: newReview,
      });
    } catch (error) {
      console.log("Lỗi:", error);
      res.status(500).json({ message: "Lỗi server khi thêm đánh giá", error: error.message });
    }
  };

// Kiểm tra đã đánh giá hay chưa
const checkIfReviewed = async (req, res) => {
  const { product_id, user_id } = req.params;
  const existed = await Review.findOne({ product_id, user_id });
  if (existed) {
    return res.status(200).json({ reviewed: true });
  }
  res.status(200).json({ reviewed: false });
};

// Lấy tất cả đánh giá
const getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, rating, product_id, user_id, keyword } = req.query;
    const filter = {};
    if (rating) filter.rating = Number(rating);
    if (product_id) filter.product_id = product_id;
    if (user_id) filter.user_id = user_id;
    if (keyword) filter.content = { $regex: keyword, $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Review.countDocuments(filter);

    const reviews = await Review.find(filter)
      .populate("user_id", "name avatar")
      .populate("product_id", "name image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const updated = reviews.map((r) => ({
      ...r.toObject(),
      images: (r.images || []).map((img) =>
        img.startsWith("http") ? img : `${baseUrl}/${img}`
      ),
    }));

    res.status(200).json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      reviews: updated,
    });
  } catch (err) {
    res.status(500).json({
      message: "Lỗi server khi lấy danh sách đánh giá",
      error: err.message,
    });
  }
};

// Lấy đánh giá theo sản phẩm
const getReviewByProduct = async (req, res) => {
  try {
    const { product_id } = req.params;

    const reviews = await Review.find({ product_id })
      .populate("user_id", "name avatar")
      .populate("product_id", "name image");

    const updated = reviews.map((r) => ({
      ...r.toObject(),
      images: (r.images || []).map((img) =>
        img.startsWith("http") ? img : `${baseUrl}/${img}`
      ),
    }));

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy đánh giá theo sản phẩm", error: err.message });
  }
};

// Lấy đánh giá theo đơn hàng
const getReviewByOrder = async (req, res) => {
  try {
    const { order_id } = req.params;

    const details = await OrderDetail.find({ order_id }).select("_id");
    const detailIds = details.map((d) => d._id);

    const reviews = await Review.find({ orderDetail_id: { $in: detailIds } })
      .populate("user_id", "name avatar")
      .populate("product_id", "name image");

    const updated = reviews.map((r) => ({
      ...r.toObject(),
      images: (r.images || []).map((img) =>
        img.startsWith("http") ? img : `${baseUrl}/${img}`
      ),
    }));

    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi lấy đánh giá theo đơn hàng", error: err.message });
  }
};

// Xoá đánh giá
const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      return res.status(404).json({ message: "Không tìm thấy đánh giá" });
    }

    res.status(200).json({ message: "Xoá đánh giá thành công" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi khi xoá đánh giá", error: err.message });
  }
};

module.exports = {
  addReview,
  getAllReviews,
  getReviewByProduct,
  getReviewByOrder,
  deleteReview,
  checkIfReviewed,
};
