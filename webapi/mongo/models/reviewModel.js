const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  product_id: { type: Schema.Types.ObjectId, ref: "products", required: true },
  user_id: { type: Schema.Types.ObjectId, ref: "users", required: true },
  color: { type: String, required: true },
  size: { type: String, required: true },
  rating: { type: Number, required: true },
  content: { type: String },
  images: [String],
}, {
  timestamps: true,
  collection: "reviews"
});

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);
