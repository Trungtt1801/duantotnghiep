const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const formatDateVN = require("../untils/formDate");

const AddressSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: false },
isDefault: { type: Boolean, default: false },
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }

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
