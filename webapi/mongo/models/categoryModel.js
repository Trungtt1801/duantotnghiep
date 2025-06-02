var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var categorySchema = new Schema({
  id: { type: ObjectId },
  name: { type: String, required: true },
  slug: { type: String, required: true },
  parentId: { type: ObjectId, default: null } 
});
module.exports = mongoose.models.Category || mongoose.model('Category', categorySchema);
