const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = Schema.Types.ObjectId;

const productSchema = new Schema({
    name: { type: String, required: true },
    image: { type: [String], required: true },
    price: { type: Number, required: true },
    sale: { type: Number, required: true },
    quantity: { type: Number, required: true },
    material: { type: String, required: true },
    create_at: { type: Date, default: Date.now },
    category_id: {
        categoryName: { type: String, required: true },
        categoryId: { type: ObjectId, required: true, ref: 'categories' }
    }
});

module.exports = mongoose.models.product || mongoose.model('products', productSchema);
