const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const formatDateVN = require('../../until/formDate'); 

const VoucherSchema = new Schema({
  value: { type: Number, required: true },                  
  voucher_code: { type: String, required: true, unique: true },  
  createdAt: { type: Number, default: () => Date.now() },   
  min_total: { type: Number, default: 0 },              
  max_total: { type: Number, default: null },}               
 ,{timestamps: true });

VoucherSchema.methods.toJSON = function () {
  const obj = this.toObject();

  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);

  return obj;
};

module.exports = mongoose.models.Voucher || mongoose.model('Voucher', VoucherSchema);
