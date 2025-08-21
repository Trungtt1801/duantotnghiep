const Shop = require("../models/shopModel");
const Product = require("../models/productsModel");

// 🟢 Tạo shop mới
// 🟢 Tạo shop mới
async function createShop(data) {
  try {
    const { user_id, name, address, phone, email, status, description, avatar } = data;

    const shop = new Shop({
      user_id,
      name,
      address,
      phone,
      email,
      status,
      description,
      avatar: avatar || "", // có thể nhận avatar nếu frontend gửi kèm
    });

    await shop.save();
    return shop;
  } catch (error) {
    console.error("Lỗi tạo shop:", error.message);
    throw new Error("Lỗi tạo shop");
  }
}


async function getAllShops() {
  try {
    const shops = await Shop.find().populate("user_id", "name email phone");
    return shops;
  } catch (error) {
    console.error("Lỗi lấy danh sách shop:", error.message);
    throw new Error("Lỗi lấy danh sách shop");
  }
}

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

async function updateShop(id, data) {
  try {
    const { name, address, phone, email, status, description, avatar } = data;

    const shop = await Shop.findByIdAndUpdate(
      id,
      { name, address, phone, email, status, description, avatar },
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

    shop.status = shop.status === "active" ? "inactive" : "active";
    await shop.save();

    return shop;
  } catch (error) {
    console.error("Lỗi toggle trạng thái shop:", error.message);
    throw new Error("Lỗi toggle trạng thái shop");
  }
}
// shop theo userid
// shop theo userid
async function getShopByUserId(userId) {
  try {
    const shop = await Shop.findOne({ user_id: userId })
      .populate("user_id", "name email phone avatar")
      .populate("followers", "name email avatar");

    if (!shop) {
      throw new Error("Người dùng này chưa có shop");
    }

    return {
      _id: shop._id,
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      email: shop.email,
      description: shop.description,
      avatar: shop.avatar,
      banner: shop.banner,
      status: shop.status,
      created_at: shop.created_at,
      updated_at: shop.updated_at,

      // 🟢 các trường mới
      sale_count: shop.sale_count || 0,
      rating: {
        average: shop.rating?.average || 0,
        count: shop.rating?.count || 0,
      },
      followers_count: shop.followers?.length || 0,
      followers: shop.followers,

      // chủ shop
      owner: shop.user_id,
    };
  } catch (error) {
    console.error("Lỗi lấy shop theo user_id:", error.message);
    throw new Error("Lỗi lấy shop theo user_id");
  }
}

async function getCategoriesByShop(shopId) {
  try {
    // lấy tất cả sản phẩm theo shopId
    const products = await Product.find({ shop_id: shopId })
      .populate("category_id.categoryId", "name"); // populate Category

    if (!products || products.length === 0) {
      return [];
    }

    // gom nhóm danh mục
    const categoriesMap = new Map();

    products.forEach((p) => {
      if (p.category_id && p.category_id.categoryId) {
        const id = String(p.category_id.categoryId._id);
        if (!categoriesMap.has(id)) {
          categoriesMap.set(id, {
            _id: id,
            name: p.category_id.categoryName,
          });
        }
      }
    });

    return Array.from(categoriesMap.values());
  } catch (err) {
    console.error("Lỗi lấy danh mục theo shop:", err.message);
    throw new Error("Lỗi lấy danh mục theo shop");
  }
}
// Lấy thông tin shop từ productId
async function getShopByProductId(productId) {
  try {
    // 1) Lấy shop_id từ sản phẩm
    const product = await Product.findById(productId)
      .select("shop_id")
      .lean();

    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }
    if (!product.shop_id) {
      throw new Error("Sản phẩm chưa gắn shop");
    }

    // 2) Lấy thông tin shop theo shop_id
    const shop = await Shop.findById(product.shop_id)
      .select("name address phone email status description avatar banner rating sale_count followers created_at updated_at user_id")
      .populate("user_id", "name email phone avatar")         // chủ shop
      .populate("followers", "name email avatar")             // người theo dõi
      .lean();

    if (!shop) {
      throw new Error("Không tìm thấy shop");
    }

    // 3) Chuẩn hoá dữ liệu trả về (giống getShopByUserId để tái sử dụng frontend)
    return {
      _id: shop._id,
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      email: shop.email,
      description: shop.description,
      avatar: shop.avatar || "",
      banner: shop.banner || "",
      status: shop.status,
      created_at: shop.created_at,
      updated_at: shop.updated_at,

      sale_count: shop.sale_count || 0,
      rating: {
        average: shop?.rating?.average || 0,
        count: shop?.rating?.count || 0,
      },
      followers_count: Array.isArray(shop.followers) ? shop.followers.length : 0,
      followers: shop.followers || [],

      owner: shop.user_id, // { _id, name, email, phone, avatar }
    };
  } catch (err) {
    console.error("Lỗi lấy shop theo productId:", err.message);
    throw new Error("Lỗi lấy shop theo productId");
  }
}


module.exports = {
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  activateShop,
  toggleShopStatus,
  getShopByUserId,
  getCategoriesByShop,
  getShopByProductId
};
