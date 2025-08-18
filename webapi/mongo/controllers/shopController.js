const Shop = require("../models/shopModel");

// 🟢 Tạo shop mới
async function createShop(data) {
  try {
    const { user_id, name, address, phone, email, status, description } = data;

    const shop = new Shop({
      user_id,
      name,
      address,
      phone,
      email,
      status,
      description,
    });

    await shop.save();
    return shop;
  } catch (error) {
    console.error("Lỗi tạo shop:", error.message);
    throw new Error("Lỗi tạo shop");
  }
}

// 🟢 Lấy tất cả shop
async function getAllShops() {
  try {
    const shops = await Shop.find().populate("user_id", "name email phone");
    return shops;
  } catch (error) {
    console.error("Lỗi lấy danh sách shop:", error.message);
    throw new Error("Lỗi lấy danh sách shop");
  }
}

// 🟢 Lấy shop theo ID
async function getShopById(id) {
  try {
    const shop = await Shop.findById(id).populate("user_id", "name email phone");
    if (!shop) {
      throw new Error("Không tìm thấy shop");
    }
    return shop;
  } catch (error) {
    console.error("Lỗi lấy shop theo ID:", error.message);
    throw new Error("Lỗi lấy shop theo ID");
  }
}

// 🟢 Cập nhật shop
async function updateShop(id, data) {
  try {
    const { name, address, phone, email, status, description } = data;

    const shop = await Shop.findByIdAndUpdate(
      id,
      { name, address, phone, email, status, description },
      { new: true, runValidators: true }
    );

    if (!shop) {
      throw new Error("Không tìm thấy shop để cập nhật");
    }

    return shop;
  } catch (error) {
    console.error("Lỗi cập nhật shop:", error.message);
    throw new Error("Lỗi cập nhật shop");
  }
}

// 🟢 Xóa shop
async function deleteShop(id) {
  try {
    const shop = await Shop.findByIdAndDelete(id);
    if (!shop) {
      throw new Error("Không tìm thấy shop để xóa");
    }
    return { message: "Xóa shop thành công" };
  } catch (error) {
    console.error("Lỗi xóa shop:", error.message);
    throw new Error("Lỗi xóa shop");
  }
}
async function activateShop(id) {
  try {
    const shop = await Shop.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true, runValidators: true }
    );

    if (!shop) {
      throw new Error("Không tìm thấy shop để mở khóa");
    }

    return shop;
  } catch (error) {
    console.error("Lỗi kích hoạt shop:", error.message);
    throw new Error("Lỗi kích hoạt shop");
  }
}
async function toggleShopStatus(id) {
  try {
    const shop = await Shop.findById(id);
    if (!shop) {
      throw new Error("Không tìm thấy shop");
    }

    // Nếu đang active thì chuyển sang inactive, ngược lại mở khóa
    shop.status = shop.status === "active" ? "inactive" : "active";
    await shop.save();

    return shop;
  } catch (error) {
    console.error("Lỗi toggle trạng thái shop:", error.message);
    throw new Error("Lỗi toggle trạng thái shop");
  }
}
module.exports = {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  activateShop,
  toggleShopStatus
};
