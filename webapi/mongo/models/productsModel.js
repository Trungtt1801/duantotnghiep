const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const productSchema = new Schema({
  name: { type: String, required: true },
  images: { type: [String], required: true },
  price: { type: Number, required: true },
  sale: { type: Number, required: true },
  material: { type: String, required: false },
  shop_id: { type: ObjectId, ref:"Shop", required :true },
  create_at: { type: Date, default: Date.now },
  description: { type: String, required: true },
  sale_count: { type: Number },
  category_id: {
    categoryName: { type: String, required: true },
    categoryId: { type: ObjectId, required: true, ref: "Category" },
  },

  isHidden: { type: Boolean, default: false },
});

module.exports =
  mongoose.models.products || mongoose.model("products", productSchema);
