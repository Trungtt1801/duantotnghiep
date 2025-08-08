var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var categorySchema = new Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true },
  parentId: { type: ObjectId, default: null },
  images: { type: [String], required: true },
  type: {
    type: String,
    enum: ['cloth', 'accessory'],
    default: 'cloth',
  },
});
module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
