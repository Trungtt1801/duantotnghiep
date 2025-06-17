const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const formatDateVN = require('../untils/formDate');

const cartItemSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  product_id: { type: Schema.Types.ObjectId, ref: 'products', required: true },
  quantity: { type: Number, required: true },
}, { timestamps: true });

cartItemSchema.methods.toJSON = function () {
  const obj = this.toObject();

  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);

  return obj;
};

module.exports = mongoose.models.Cart || mongoose.model('Cart', cartItemSchema);
