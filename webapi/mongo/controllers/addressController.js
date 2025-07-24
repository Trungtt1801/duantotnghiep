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

// [GET] Lấy tất cả địa chỉ theo user_id
const getAddressesByUserId = async (req, res) => {
  try {
    const { user_id } = req.query;

    if (!mongoose.Types.ObjectId.isValid(user_id)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const addresses = await Address.find({ user_id: new mongoose.Types.ObjectId(user_id) });

    if (!addresses.length) {
      return res.status(404).json({ message: "Không tìm thấy địa chỉ" });
    }

    res.json(addresses);
  } catch (error) {
    console.error("Lỗi khi lấy địa chỉ:", error.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};
module.exports = {
  getAllAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  getAddressesByUserId,
};
