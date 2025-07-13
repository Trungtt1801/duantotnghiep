const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const formatDateVN = require("../untils/formDate");

const userSchema = new Schema(
  {
    avatar: { type: String, default: "" },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false, select: false },
    phone: {
      type: String,
      required: false,
      match: /^[0-9]{10,15}$/,
    },
    gender: { type: String, enum: ["Nam", "Nữ", "Khác"], default: "Khác" },

    role: { type: Number, required: true, default: 1 },
    authType: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },

    code: { type: String, unique: true }, // Mã người dùng VD: US001, US002

    // Thống kê đơn hàng
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },

    // Phục vụ quên mật khẩu
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date },
    resetPasswordCount: { type: Number, default: 0 },
    resetPasswordDate: { type: Date },
  },
  { timestamps: true }
);

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);
  return obj;
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
