const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // liên kết với bảng User
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      match: /^[0-9]{9,15}$/, // validate số điện thoại (9-15 số)
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, // validate email
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"], // bạn có thể thêm trạng thái tùy ý
      default: "pending",
    },
    description: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "", // URL ảnh đại diện shop
    },
    banner: {
      type: String,
      default: "", // URL ảnh banner shop
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

module.exports = mongoose.model("Shop", shopSchema);
