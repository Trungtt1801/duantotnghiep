const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const formatDateVN = require('../untils/formDate');

const OrderDetailSchema = new Schema(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: "order",
      required: true,
    },
    order_shop_id: {
      type: Schema.Types.ObjectId,
      ref: "orderShop", 
      required: true,
    },
    shop_id: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    product_id: {
      type: Schema.Types.ObjectId,
      ref: "products",
      required: true,
    },
    variant_id: {
      type: Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },
    size_id: {
      type: Schema.Types.ObjectId,
      required: true,
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
  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);
  return obj;
};

module.exports = mongoose.models.orderDetail || mongoose.model('orderDetail', OrderDetailSchema);
