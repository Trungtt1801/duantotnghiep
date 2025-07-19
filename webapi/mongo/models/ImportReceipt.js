const mongoose = require("mongoose");

const ImportReceiptSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  staff: { type: String, required: true }, // tên hoặc ID nhân viên
  products: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
});

module.exports = mongoose.model("ImportReceipt", ImportReceiptSchema);
