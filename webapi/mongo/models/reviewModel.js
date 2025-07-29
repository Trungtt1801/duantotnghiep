const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
product_id: { type: mongoose.Schema.Types.ObjectId, ref: "products", required: true },
  rating: { type: Number, required: true },
  content: { type: String },
  images: [String],
}, {
  timestamps: true,
});

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);
