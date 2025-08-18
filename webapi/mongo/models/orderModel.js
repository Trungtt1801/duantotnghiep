const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const OrderSchema = new Schema(
  {
    total_price: { type: Number, required: true },

    status_order: {
      type: String,
      enum: [
        "unpending",
        "pending",
        "confirmed",
        "preparing",
        "awaiting_shipment",
        "shipping",
        "delivered",
        "failed",
        "cancelled",
        "refund",
      ],
      required: true,
    },
    // ✅ Địa chỉ nếu là người dùng đăng nhập
    address_id: {
      type: Schema.Types.ObjectId,
      ref: "Address",
      required: false,
    },

    // ✅ Địa chỉ của khách vãng lai (guest)
    address_guess: {
      name: { type: String },
      phone: { type: String },
      email: { type: String },
      address: { type: String },
      type: { type: String }, // ví dụ: Nhà riêng, Cơ quan
      detail: { type: String }, // chi tiết giao hàng nếu có
    },

    // Mã giảm giá nếu có
    voucher_id: {
      type: Schema.Types.ObjectId,
      ref: "Voucher",
      required: false,
    },

    user_id: { type: Schema.Types.ObjectId, ref: "User", required: false },

    evaluate: { type: String },

    payment_method: {
      type: String,
      enum: ["cod", "vnpay", "zalopay", "COD"],
      required: true,
    },

    transaction_code: { type: String, default: null },

    transaction_status: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
    },

    // ✅ Token dùng để xác nhận đơn hàng (chỉ dùng cho khách vãng lai)
    order_token: { type: String },

    // ✅ Trạng thái xác nhận đơn hàng
    confirmed: {
      type: Boolean,
      default: false,
    },

    // ✅ Lịch sử trạng thái đơn hàng
    status_history: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "preparing",
            "awaiting_shipment",
            "shipping",
            "delivered",
            "failed",
            "cancelled",
            "refund",
          ],
          required: true,
        },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  {
    timestamps: true, // Tự động thêm createdAt và updatedAt
  }
);

// Chuyển về JSON
OrderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

module.exports = mongoose.models.order || mongoose.model("order", OrderSchema);
