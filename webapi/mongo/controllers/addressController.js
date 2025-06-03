const addressModel = require('../models/addressModel');

// [GET] Lấy tất cả địa chỉ
async function getAllAddresses() {
  return await addressModel.find().populate('user_id', 'name');
}

// [GET] Lấy địa chỉ theo ID
async function getAddressById(id) {
  const address = await addressModel.findById(id).populate('user_id', 'name');
  if (!address) throw new Error('Không tìm thấy địa chỉ');
  return address;
}

// [POST] Thêm địa chỉ
async function addAddress(data) {
  const { name, phone, address, status, user_id } = data;
  if (!name || !phone || !address || !user_id) {
    throw new Error('Thiếu thông tin bắt buộc');
  }
  const newAddress = new addressModel({ name, phone, address, status, user_id });
  return await newAddress.save();
}

// [PUT] Cập nhật địa chỉ
async function updateAddress(id, data) {
  const address = await addressModel.findById(id);
  if (!address) throw new Error('Không tìm thấy địa chỉ');
  Object.assign(address, data);
  return await address.save();
}

// [DELETE] Xoá địa chỉ
async function deleteAddress(id) {
  const address = await addressModel.findById(id);
  if (!address) throw new Error('Địa chỉ không tồn tại');
  return await addressModel.findByIdAndDelete(id);
}

module.exports = {
  getAllAddresses,
  getAddressById,
  addAddress,
  updateAddress,
  deleteAddress
};
