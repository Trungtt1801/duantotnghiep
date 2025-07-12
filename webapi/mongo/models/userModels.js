const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const formatDateVN = require("../untils/formDate");

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: false, select: false },
    phone: {
      type: String,
      required: false,
      match: /^[0-9]{10,15}$/,
    },
    role: { type: Number, required: true, default: 1 },
    authType: {
      type: String,
      enum: ["local", "google", "facebook"],
      default: "local",
    },

    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      default: 'other',
    },

    // Trường phục vụ reset mật khẩu
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date },

    // ✅ Trường mới
    resetPasswordCount: { type: Number, default: 0 },
    resetPasswordDate: { type: Date },

    // ✅ Thêm 2 trường phục vụ tích điểm
    point: { type: Number, default: 0 },
    rank: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze',
    },
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
