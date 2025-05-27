const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const variantSchema = new Schema({
  product_id: { type: ObjectId, required: true }, // ✅ XÓA ref
  color: { type: String, required: true },
  sizes: [
    {
      size: { type: String, required: true },
      quantity: { type: Number, required: true },
      sku: { type: String, required: true }
    }
  ]
}, {
  timestamps: true
});


module.exports = mongoose.models.productvariant || mongoose.model('productvariant', variantSchema);
