const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const formatDateVN = require('../untils/formDate'); 

const VoucherSchema = new Schema({
  value: { type: Number, required: true },
  voucher_code: { type: String, required: true, unique: true },
  quantity: { type: Number, default: 1 },
  is_active: { type: Boolean, default: true },
  min_total: { type: Number, default: 0 },
  max_total: { type: Number, default: null },
  expired_at: { type: Date, default: null },
}, {
  timestamps: true 
});
VoucherSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.delivery_date) obj.delivery_date = formatDateVN(obj.delivery_date);
  return obj;
};

module.exports = mongoose.models.Voucher || mongoose.model('Voucher', VoucherSchema);
