const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const childCategorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true }
});

const categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  children: [childCategorySchema]
});

module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
