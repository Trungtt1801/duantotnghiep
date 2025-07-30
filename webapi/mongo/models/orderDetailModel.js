const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const formatDateVN = require('../untils/formDate');

const OrderDetailSchema = new Schema(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: 'order',
      required: true,
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: 'products',
      required: true,
    },
    variant_id: {
      type: Schema.Types.ObjectId,
      ref: 'productvariants', // hoặc tên model đúng là gì, bạn kiểm tra nhé
      required: true,
    },
       size_id: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

OrderDetailSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.delivery_date) obj.delivery_date = formatDateVN(obj.delivery_date);
  return obj;
};

module.exports = mongoose.models.orderDetail || mongoose.model('orderDetail', OrderDetailSchema);
