const mongoose = require("mongoose");
const Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;
    
const messageSchema = new Schema({
  role: { type: String, enum: ["user", "bot"], required: true },
  content: { type: String, required: true },
});

const chatHistorySchema = new Schema({
  userId: { type: ObjectId, required: true, unique: true },
  messages: [messageSchema],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HistoryChat", chatHistorySchema);
