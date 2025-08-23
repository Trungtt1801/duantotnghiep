// orderShop.model.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OrderShopSchema = new Schema(
  {
    order_id: {
      type: Schema.Types.ObjectId,
      ref: "order",
      required: true,
    },
    shop_id: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
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
      default: "pending",
    },

    status_history: [
      {
        status: {
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
        updatedAt: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  { timestamps: true }
);

OrderShopSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

module.exports =
  mongoose.models.orderShop || mongoose.model("orderShop", OrderShopSchema);
