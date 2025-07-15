const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const formatDateVN = require("../untils/formDate");

const AddressSchema = new Schema(
  {
    name: { type: String, required: true }, // Tên người nhận
    phone: {
      type: String,
      required: true,
      match: /^[0-9]{10,15}$/,
    },
    address: { type: String }, 
    status: { type: Boolean, default: false }, 
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String }, 
    detail: { type: String },
  },
  {
    timestamps: true,
  }
);

AddressSchema.methods.toJSON = function () {
  const obj = this.toObject();

  if (obj.createdAt) obj.createdAt = formatDateVN(obj.createdAt);
  if (obj.updatedAt) obj.updatedAt = formatDateVN(obj.updatedAt);

  return obj;
};

module.exports =
  mongoose.models.Address || mongoose.model("Address", AddressSchema);
