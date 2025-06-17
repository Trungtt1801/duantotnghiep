const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const formatDateVN = require('../../untils/formDate'); 

const reviewSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'orders',
    required: true
  },
  productdetail_id: {
    type: Schema.Types.ObjectId,
    ref: 'productDetails',
    required: true
  },
  review_id: {
    type: Schema.Types.ObjectId,
    ref: 'reviews',
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
reviewSchema.methods.toJSON = function () {
  const obj = this.toObject();

  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);

  return obj;
};
module.exports = mongoose.models.review || mongoose.model('review', reviewSchema);
