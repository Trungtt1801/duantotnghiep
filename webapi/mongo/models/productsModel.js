const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const productSchema = new Schema({
  name: { type: String, required: true },
  images: { type: [String], required: true },
  price: { type: Number, required: true },
  sale: { type: Number, required: true },
  material: { type: String, required: true },
  create_at: { type: Date, default: Date.now },

  category_id: {
    categoryName: { type: String, required: false },
    categoryId: { type: ObjectId, required: false , ref: 'categories' }
  }

});

module.exports = mongoose.models.products || mongoose.model('products', productSchema);
