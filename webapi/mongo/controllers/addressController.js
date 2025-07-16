const addressModel = require("../models/addressModel");
// [GET] Lấy tất cả địa chỉ
async function getAllAddresses() {
  try {
    return await addressModel.find().populate("user_id", "name");
  } catch (error) {
    console.error("Lỗi lấy danh sách địa chỉ:", error.message);
    throw new Error("Lỗi lấy danh sách địa chỉ");
  }
}

// [GET] Lấy địa chỉ theo ID
async function getAddressById(id) {
  try {
    const address = await addressModel.findById(id).populate("user_id", "name");
    if (!address) throw new Error("Không tìm thấy địa chỉ");
    return address;
  } catch (error) {
    console.error("Lỗi lấy chi tiết địa chỉ:", error.message);
    throw new Error(error.message || "Lỗi lấy chi tiết địa chỉ");
  }
}

// [POST] Thêm địa chỉ
async function createAddress(data) {
  const { user_id, status } = data;

  if (status === true) {
    await addressModel.updateMany({ user_id }, { $set: { status: false } });
  }

  const newAddress = new addressModel(data);
  await newAddress.save();
  return newAddress;
}

// [PUT] Cập nhật địa chỉ
async function updateAddress(id, data) {
  const { user_id, status } = data;

  if (status === true) {
    await addressModel.updateMany(
      { user_id, _id: { $ne: id } },
      { $set: { status: false } }
    );
  }

  const updated = await addressModel.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw new Error("Không tìm thấy địa chỉ cần cập nhật");

  return updated;
}

// [DELETE] Xoá địa chỉ
async function deleteAddress(id) {
  try {
    const address = await addressModel.findById(id);
    if (!address) throw new Error("Địa chỉ không tồn tại");
    return await addressModel.findByIdAndDelete(id);
  } catch (error) {
    console.error("Lỗi xoá địa chỉ:", error.message);
    throw new Error("Lỗi xoá địa chỉ");
  }
}

// [GET] Lấy tất cả địa chỉ theo user_id
async function getAddressesByUserId(userId) {
  try {
    if (!userId) throw new Error("Thiếu user_id");

    const addresses = await addressModel
      .find({ user_id: userId })
      .populate("user_id", "name");

    return addresses;
  } catch (error) {
    console.error("Lỗi lấy địa chỉ theo user_id:", error.message);
    throw new Error(error.message || "Lỗi lấy địa chỉ theo user");
  }
}

module.exports = {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  getAddressesByUserId,
};
