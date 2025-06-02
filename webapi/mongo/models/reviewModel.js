const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  productdetail_id: {
    type: Schema.Types.ObjectId,
    ref: 'ProductDetail',
    required: true
  },
  review_id: {
    type: Schema.Types.ObjectId,
    ref: 'review',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  content: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.models.review || mongoose.model('review', reviewSchema);
