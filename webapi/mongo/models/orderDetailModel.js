const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const formatDateVN = require('../../until/formDate');

const OrderDetailSchema = new Schema({
  order_id: {
    type: Schema.Types.ObjectId,
    ref: 'order',
    required: true,
  },
  productdetail_id: {
    type: Schema.Types.ObjectId,
    ref: 'productDetails',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
}, { timestamps: true });

OrderDetailSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);
  return obj;
};

module.exports = mongoose.models.orderDetail || mongoose.model('orderDetail', OrderDetailSchema);
