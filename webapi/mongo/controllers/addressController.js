const addressModel = require("../models/addressModel");
const mongoose = require("mongoose");
// Lấy danh sách địa chỉ theo user_id
async function getAddressesByUserId(userId) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("ID không hợp lệ");
  }

  return await addressModel.find({ user_id: userId }).sort({ updatedAt: -1 });
}
// Thêm địa chỉ mới
async function createAddress(data) {
  if (data.isDefault) {
    // Nếu là mặc định, reset tất cả địa chỉ khác của user về false
    await addressModel.updateMany(
      { user_id: data.user_id },
      { $set: { status: false } }
    );
  }
  return await addressModel.create(data);
}

// Cập nhật địa chỉ
async function updateAddress(id, data) {
  if (data.status) {
    // Nếu cập nhật thành địa chỉ mặc định, reset các địa chỉ khác
    await addressModel.updateMany(
      { user_id: data.user_id },
      { $set: { status: false } }
    );
  }

  return await addressModel.findByIdAndUpdate(id, data, { new: true });
}

// Xoá địa chỉ
async function deleteAddress(id) {
  return await addressModel.findByIdAndDelete(id);
}

// Lấy chi tiết địa chỉ theo id
async function getAddressById(id) {
  return await addressModel.findById(id);
}

module.exports = {
  getAddressesByUserId,
  createAddress,
  updateAddress,
  deleteAddress,
  getAddressById,
};
