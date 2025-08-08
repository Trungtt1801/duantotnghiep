const addressModel = require("../models/addressModel");

// [GET] Lấy tất cả địa chỉ
async function getAllAddresses() {
  try {
    return await addressModel.find().populate("user_id", "name");
  } catch (error) {
    console.error("Lỗi lấy danh sách địa chỉ:", error.message);
    throw new Error("Lỗi lấy danh sách địa chỉ");
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
  const { user_id, is_default } = data;

  if (is_default === true) {
    await addressModel.updateMany({ user_id }, { $set: { is_default: false } });
  } else {
    const count = await addressModel.countDocuments({ user_id, is_default: true });
    if (count === 0) {
      throw new Error("Bạn phải có ít nhất 1 địa chỉ mặc định.");
    }
  }

  const newAddress = new addressModel(data);
  await newAddress.save();
  return newAddress;
}

// [PUT] Cập nhật địa chỉ
async function updateAddress(id, data) {
  const { user_id, is_default } = data;

  if (is_default === true) {
    await addressModel.updateMany(
      { user_id, _id: { $ne: id } },
      { $set: { is_default: false } }
    );
  } else {
    const count = await addressModel.countDocuments({
      user_id,
      is_default: true,
      _id: { $ne: id },
    });
    if (count === 0) {
      throw new Error("Bạn phải có ít nhất 1 địa chỉ mặc định.");
    }
  }

  const updated = await addressModel.findByIdAndUpdate(id, data, { new: true });
  if (!updated) throw new Error("Không tìm thấy địa chỉ cần cập nhật");

  return updated;
}

// Xoá địa chỉ
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
async function findAddressesByUserId(user_id) {
  if (!mongoose.Types.ObjectId.isValid(user_id)) {
    throw new Error("ID không hợp lệ");
  }

  const addresses = await addressModel.find({ user_id }).sort({ updatedAt: -1 });
  return addresses;
}

const getAddressesByUserId = async (user_id) => {
  try {
    const addresses = await addressModel.find({ user_id });
    return addresses;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách địa chỉ:", error);
    throw new Error("Lỗi server");
  }
};

module.exports = {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  findAddressesByUserId,
  getAddressesByUserId,
};
