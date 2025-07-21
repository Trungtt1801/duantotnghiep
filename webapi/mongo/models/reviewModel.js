const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  order_detail_id: { type: Schema.Types.ObjectId, ref: "orderDetail", required: true, unique: true }, // duy nhất để mỗi sản phẩm chỉ được đánh giá 1 lần/đơn
  product_id: { type: Schema.Types.ObjectId, ref: "products", required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
  rating: { type: Number, required: true },
  content: { type: String },
  images: [String],
}, {
  timestamps: true,
});

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);
