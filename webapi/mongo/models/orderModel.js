const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const formatDateVN = require("../untils/formDate");

const OrderSchema = new Schema(
  {
    total_price: { type: Number, required: true },
    status_order: {
      type: String,
      enum: ["pending", "confirmed", "shipped", " delivered", "cancelled"],
      default: "pending",
    },
    address_id: { type: Schema.Types.ObjectId, ref: "Address" }, // REAL
    voucher_id: { type: Schema.Types.ObjectId, ref: "Voucher" },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    evaluate: String,
    payment_method: {
      type: String,
      enum: ["COD", "vnpay", "zalopay"],
      required: true,
    },
    transaction_code: String,
    transaction_status: {
      type: String,
      enum: ["unpaid", "paid", "failed", "refunded"],
      default: "unpaid",
    },
  },
  { timestamps: true }
);

OrderSchema.methods.toJSON = function () {
  const obj = this.toObject();
  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);
  if (obj.delivery_date) obj.delivery_date = formatDateVN(obj.delivery_date);
  return obj;
};

module.exports = mongoose.models.order || mongoose.model("order", OrderSchema);
