const Review = require("../models/reviewModel");
const User = require("../models/userModels");
const Product = require("../models/productsModel");

// Gửi đánh giá mới
const addReview = async (data) => {
  const newReview = new Review(data);
  return await newReview.save();
};

// Lấy đánh giá theo product_id (và filter thêm color, size nếu có)
const getReviewByProduct = async (product_id, color, size) => {
  const filter = { product_id };
  if (color) filter.color = color;
  if (size) filter.size = size;

  return await Review.find(filter)
    .populate("user_id", "name avatar")
    .populate("product_id", "name images")
    .sort({ createdAt: -1 });
};

// Tìm kiếm & lọc đánh giá (theo keyword tên sản phẩm, role người dùng, phân trang)
const getAllReviews = async ({ keyword = "", page = 1, limit = 10 }) => {
  const skip = (page - 1) * limit;

  // Tìm danh sách sản phẩm có tên giống keyword
  const productFilter = keyword
    ? { name: { $regex: keyword, $options: "i" } }
    : {};
  const products = await Product.find(productFilter).select("_id");
  const productIds = products.map((p) => p._id);

  // Kết hợp các filter (chỉ cần product_id nếu có)
  const filter = {};
  if (keyword) {
    filter.product_id = { $in: productIds };
  }

  const total = await Review.countDocuments(filter);

  const result = await Review.find(filter)
    .populate("user_id", "name avatar") // KHÔNG cần role nữa
    .populate("product_id", "name images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return { total, result };
};


module.exports = {
  addReview,
  getReviewByProduct,
  getAllReviews,
};
