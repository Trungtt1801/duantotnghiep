const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrderSchema = new Schema(
  {
    total_price: { type: Number, required: true },

    status_order: {
      type: String,
      enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
      default: "pending",
    },

    address_id: { type: Schema.Types.ObjectId, ref: "Address", required: false },
    address_id_guess: { type: String, required: false },

    voucher_id: { type: Schema.Types.ObjectId, ref: "Voucher" },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },

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

    // ✅ Lịch sử trạng thái
    status_history: [
      {
        status: { type: String, required: true },
        updatedAt: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  {
    timestamps: true, // ✅ tự động có createdAt & updatedAt
  }
);

// ✅ Đừng format ngày ở đây, giữ nguyên để React xử lý được
OrderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

module.exports = mongoose.models.order || mongoose.model("order", OrderSchema);
