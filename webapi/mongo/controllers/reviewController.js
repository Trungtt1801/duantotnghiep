const Review = require("../models/reviewModel");
const OrderDetail = require("../models/orderDetailModel");
const Product = require("../models/productsModel");
const User = require("../models/userModels");

const reviewController = {
  async addReview(req, res) {
    try {
      const { order_detail_id, rating, content, images } = req.body;

      const orderDetail = await OrderDetail.findById(order_detail_id).populate("product_id order_id");
      if (!orderDetail) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng chi tiết" });
      }

      const { product_id, order_id, user_id } = orderDetail;

      if (orderDetail.order_id.status !== "delivered") {
        return res.status(400).json({ message: "Chỉ có thể đánh giá sau khi đơn hàng đã giao" });
      }

      const existedReview = await Review.findOne({ order_detail_id });
      if (existedReview) {
        return res.status(400).json({ message: "Đơn hàng này đã được đánh giá rồi" });
      }

      const newReview = await Review.create({
        order_detail_id,
        product_id,
        user_id,
        rating,
        content,
        images,
      });

      res.status(201).json({ message: "Đánh giá thành công", review: newReview });
    } catch (err) {
      res.status(500).json({ message: "Lỗi server khi thêm đánh giá", error: err.message });
    }
  },

  async getReviewByProduct(req, res) {
    try {
      const { product_id } = req.params;
      const reviews = await Review.find({ product_id })
        .populate("user_id", "name avatar")
        .sort({ createdAt: -1 });

      res.json(reviews);
    } catch (err) {
      res.status(500).json({ message: "Lỗi khi lấy đánh giá theo sản phẩm", error: err.message });
    }
  },

  async getReviewByOrder(req, res) {
    try {
      const { order_id } = req.params;

      const details = await OrderDetail.find({ order_id }).select("_id");
      const detailIds = details.map(d => d._id);

      const reviews = await Review.find({ order_detail_id: { $in: detailIds } });

      res.json(reviews);
    } catch (err) {
      res.status(500).json({ message: "Lỗi khi lấy đánh giá theo đơn hàng", error: err.message });
    }
  },

  async getAllReviews(req, res) {
    try {
      const { keyword = "", page = 1, limit = 10 } = req.query;
      const regex = new RegExp(keyword, "i");

      const filter = {
        $or: [{ content: { $regex: regex } }],
      };

      const reviews = await Review.find(filter)
        .populate("user_id", "name avatar")
        .populate("product_id", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit));

      const total = await Review.countDocuments(filter);

      res.json({
        reviews,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      res.status(500).json({ message: "Lỗi khi lấy danh sách đánh giá", error: err.message });
    }
  },
};

module.exports = reviewController;
