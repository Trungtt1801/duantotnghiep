const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const formatDateVN = require('../../until/formDate'); 
const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: {
    type: String,
    required: false,
    match: /^[0-9]{10,15}$/,
  },
  role: { type: Number, required: true, default: 1 },

  // 2 trường cho chức năng reset password 
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpires: { type: Date }
}, { timestamps: true });


userSchema.methods.toJSON = function () {
  const obj = this.toObject();

  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);

  return obj;
};

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
