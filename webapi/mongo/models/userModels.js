const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: {
    type: String,
    required: false,
    match: /^[0-9]{10,15}$/,
  },
  role: { type: Number, required: true, default: 1 },
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
