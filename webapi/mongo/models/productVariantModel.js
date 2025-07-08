const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const variantSchema = new Schema({
  product_id: { type: ObjectId, required: true, ref: 'products' },
  variants: [
    {
      _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, 
      color: { type: String, required: true },
      sizes: [
        {
          _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, 
          size: { type: String, required: true },
          quantity: { type: Number, required: true },
          sku: { type: String, required: true }
        }
      ]
    }
  ]
}, {
  timestamps: true,
  collection: 'productvariant'
});


module.exports = mongoose.models.ProductVariant || mongoose.model('ProductVariant', variantSchema);
