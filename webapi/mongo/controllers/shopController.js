const Shop = require("../models/shopModel");
const Product = require("../models/productsModel");
const User = require("../models/userModels");

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
    const shop = await Shop.findById(id).populate("user_id", "name email phone").lean();
    if (!shop) throw new Error("Không tìm thấy shop");

    const total = await countProductsByShop(id, /* onlyActive? */ false);

    return { ...shop, total_products: total };
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
    const product = await Product.findById(productId).select("shop_id").lean();
    if (!product) throw new Error("Không tìm thấy sản phẩm");
    if (!product.shop_id) throw new Error("Sản phẩm chưa gắn shop");

    const shop = await Shop.findById(product.shop_id)
      .select("name address phone email status description avatar banner rating sale_count followers created_at updated_at user_id")
      .populate("user_id", "name email phone avatar")
      .populate("followers", "name email avatar")
      .lean();
    if (!shop) throw new Error("Không tìm thấy shop");

    const total = await countProductsByShop(shop._id, /* onlyActive? */ false);

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
      owner: shop.user_id,

      // 🟢 thêm số sản phẩm
      total_products: total,
    };
  } catch (err) {
    console.error("Lỗi lấy shop theo productId:", err.message);
    throw new Error("Lỗi lấy shop theo productId");
  }
}


async function countProductsByShop(shopId, onlyActive = false) {
  const q = { shop_id: shopId };
  if (onlyActive) q.status = "active"; // nếu có field status
  const total = await Product.countDocuments(q);
  return total;
}

async function followShop(shopId, userId) {
  const shop = await Shop.findById(shopId);
  if (!shop) throw new Error("Không tìm thấy shop");
  await shop.follow(userId);
  await shop.populate("followers", "name email avatar");
  return { message: "Đã follow shop", followers_count: shop.followers_count, shop };
}

async function unfollowShop(shopId, userId) {
  const shop = await Shop.findById(shopId);
  if (!shop) throw new Error("Không tìm thấy shop");
  await shop.unfollow(userId);
  await shop.populate("followers", "name email avatar");
  return { message: "Đã bỏ follow shop", followers_count: shop.followers_count, shop };
}

async function toggleFollow(shopId, userId) {
  const shop = await Shop.findById(shopId);
  if (!shop) throw new Error("Không tìm thấy shop");
  await shop.toggleFollow(userId);
  await shop.populate("followers", "name email avatar");
  const following = shop.isFollowing(userId);
  return {
    message: following ? "Đã follow shop" : "Đã bỏ follow shop",
    followers_count: shop.followers_count,
    following,
    shop,
  };
}

async function isFollowing(shopId, userId) {
  const shop = await Shop.findById(shopId).select("followers");
  if (!shop) throw new Error("Không tìm thấy shop");
  return { following: shop.followers?.some((f) => String(f) === String(userId)) || false };
}
async function listFollowers(shopId, page = 1, limit = 20) {
  const p = Math.max(1, page);
  const l = Math.max(1, limit);
  const skip = (p - 1) * l;

  // lấy mảng _id followers để đếm tổng
  const base = await Shop.findById(shopId).select("followers").lean();
  if (!base) throw new Error("Không tìm thấy shop");

  const total_followers = Array.isArray(base.followers) ? base.followers.length : 0;

  // nếu không có follower thì trả rỗng luôn
  if (total_followers === 0) {
    return { total_followers: 0, page: p, limit: l, items: [] };
  }

  // cắt mảng theo phân trang để lấy đúng _id cần populate
  const followerIdsPage = base.followers.slice(skip, skip + l);
  const users = await User.find({ _id: { $in: followerIdsPage } })
    .select("name email avatar")
    .lean();

  // giữ nguyên thứ tự theo followerIdsPage
  const orderMap = new Map(followerIdsPage.map((id, i) => [String(id), i]));
  users.sort((a, b) => (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0));

  return {
    total_followers,
    page: p,
    limit: l,
    items: users,
  };
}
async function getAllFollowers(shopId) {
  // lấy danh sách _id followers thô để đếm chính xác
  const base = await Shop.findById(shopId).select("followers").lean();
  if (!base) throw new Error("Không tìm thấy shop");

  if (!Array.isArray(base.followers) || base.followers.length === 0) {
    return { total: 0, items: [] };
  }

  // Lấy đầy đủ thông tin user theo danh sách _id
  const users = await User.find({ _id: { $in: base.followers } })
    .select("name email avatar")
    .lean();

  // (tuỳ chọn) giữ đúng thứ tự theo mảng followers trong shop
  const orderMap = new Map(base.followers.map((id, i) => [String(id), i]));
  users.sort((a, b) => (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0));

  return { total: base.followers.length, items: users };
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
  getShopByProductId,
  countProductsByShop,
  listFollowers,
  toggleFollow,
  unfollowShop,
  followShop,
    isFollowing,  
     getAllFollowers,  
};
