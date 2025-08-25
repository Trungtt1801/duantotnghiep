const Shop = require("../models/shopModel");
const Product = require("../models/productsModel");
const User = require("../models/userModels");

/* =========================
 *  CREATE SHOP
 * ========================= */
async function createShop(data) {
  try {
    // ❗ Thêm banner vào destructure để không bị ReferenceError
    const {
      user_id,
      name,
      address,
      phone,
      email,
      status,
      description,
      avatar,
      banner, // <- thêm
    } = data;

    const shop = new Shop({
      user_id,
      name,
      address,
      phone,
      email,
      status,
      description,
      avatar: avatar || "",
      banner: banner || "", // có thể nhận banner nếu frontend gửi kèm
    });

    await shop.save();
    return shop;
  } catch (error) {
    console.error("Lỗi tạo shop:", error.message);
    throw new Error("Lỗi tạo shop");
  }
}

/* =========================
 *  READ ALL SHOPS
 * ========================= */
async function getAllShops() {
  try {
    const shops = await Shop.find().populate("user_id", "name email phone");
    return shops;
  } catch (error) {
    console.error("Lỗi lấy danh sách shop:", error.message);
    throw new Error("Lỗi lấy danh sách shop");
  }
}

/* =========================
 *  READ SHOP BY ID
 * ========================= */
async function getShopById(id) {
  try {
    const shop = await Shop.findById(id)
      .populate("user_id", "name email phone")
      .lean();
    if (!shop) throw new Error("Không tìm thấy shop");

    const total = await countProductsByShop(id, false);

    return { ...shop, total_products: total };
  } catch (error) {
    console.error("Lỗi lấy shop theo ID:", error.message);
    throw new Error("Lỗi lấy shop theo ID");
  }
}

/* =========================
 *  UPDATE SHOP
 *  - Giữ nguyên banner khi không upload
 * ========================= */
async function updateShop(id, data) {
  try {
    const {
      name,
      address,
      phone,
      email,
      status,
      description,
      avatar,
      banner, // FE sẽ có nếu upload banner
    } = data;

    // Chỉ set các field có mặt trong payload
    const updateData = {
      name,
      address,
      phone,
      email,
      status,
      description,
    };

    if (typeof avatar !== "undefined") updateData.avatar = avatar || "";
    // ❗ Giữ nguyên banner nếu FE không gửi
    if (typeof banner !== "undefined" && banner) {
      updateData.banner = banner;
    }

    const shop = await Shop.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!shop) throw new Error("Không tìm thấy shop để cập nhật");
    return shop;
  } catch (error) {
    console.error("Lỗi cập nhật shop:", error.message);
    throw new Error("Lỗi cập nhật shop");
  }
}

/* =========================
 *  DELETE SHOP
 * ========================= */
async function deleteShop(id) {
  try {
    const shop = await Shop.findByIdAndDelete(id);
    if (!shop) throw new Error("Không tìm thấy shop để xóa");
    return { message: "Xóa shop thành công" };
  } catch (error) {
    console.error("Lỗi xóa shop:", error.message);
    throw new Error("Lỗi xóa shop");
  }
}

/* =========================
 *  ACTIVATE SHOP
 * ========================= */
async function activateShop(id) {
  try {
    const shop = await Shop.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true, runValidators: true }
    );
    if (!shop) throw new Error("Không tìm thấy shop để mở khóa");
    return shop;
  } catch (error) {
    console.error("Lỗi kích hoạt shop:", error.message);
    throw new Error("Lỗi kích hoạt shop");
  }
}

/* =========================
 *  TOGGLE SHOP STATUS
 * ========================= */
async function toggleShopStatus(id) {
  try {
    const shop = await Shop.findById(id);
    if (!shop) throw new Error("Không tìm thấy shop");
    shop.status = shop.status === "active" ? "inactive" : "active";
    await shop.save();
    return shop;
  } catch (error) {
    console.error("Lỗi toggle trạng thái shop:", error.message);
    throw new Error("Lỗi toggle trạng thái shop");
  }
}

/* =========================
 *  READ SHOP BY USER ID
 * ========================= */
async function getShopByUserId(userId) {
  try {
    const shop = await Shop.findOne({ user_id: userId })
      .populate("user_id", "name email phone avatar")
      .populate("followers", "name email avatar");

    if (!shop) throw new Error("Người dùng này chưa có shop");

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

      sale_count: shop.sale_count || 0,
      rating: {
        average: shop.rating?.average || 0,
        count: shop.rating?.count || 0,
      },
      followers_count: shop.followers?.length || 0,
      followers: shop.followers,

      owner: shop.user_id,
    };
  } catch (error) {
    console.error("Lỗi lấy shop theo user_id:", error.message);
    throw new Error("Lỗi lấy shop theo user_id");
  }
}

/* =========================
 *  READ CATEGORIES BY SHOP
 * ========================= */
async function getCategoriesByShop(shopId) {
  try {
    const products = await Product.find({ shop_id: shopId }).populate(
      "category_id.categoryId",
      "name"
    );
    if (!products || products.length === 0) return [];

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

/* =========================
 *  READ SHOP BY PRODUCT ID
 * ========================= */
async function getShopByProductId(productId) {
  try {
    const product = await Product.findById(productId).select("shop_id").lean();
    if (!product) throw new Error("Không tìm thấy sản phẩm");
    if (!product.shop_id) throw new Error("Sản phẩm chưa gắn shop");

    const shop = await Shop.findById(product.shop_id)
      .select(
        "name address phone email status description avatar banner rating sale_count followers created_at updated_at user_id"
      )
      .populate("user_id", "name email phone avatar")
      .populate("followers", "name email avatar")
      .lean();
    if (!shop) throw new Error("Không tìm thấy shop");

    const total = await countProductsByShop(shop._id, false);

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
      total_products: total,
    };
  } catch (err) {
    console.error("Lỗi lấy shop theo productId:", err.message);
    throw new Error("Lỗi lấy shop theo productId");
  }
}

/* =========================
 *  UTILS
 * ========================= */
async function countProductsByShop(shopId, onlyActive = false) {
  const q = { shop_id: shopId };
  if (onlyActive) q.status = "active";
  const total = await Product.countDocuments(q);
  return total;
}

/* =========================
 *  FOLLOW APIs
 * ========================= */
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

  const base = await Shop.findById(shopId).select("followers").lean();
  if (!base) throw new Error("Không tìm thấy shop");

  const total_followers = Array.isArray(base.followers) ? base.followers.length : 0;
  if (total_followers === 0) {
    return { total_followers: 0, page: p, limit: l, items: [] };
  }

  const followerIdsPage = base.followers.slice(skip, skip + l);
  const users = await User.find({ _id: { $in: followerIdsPage } })
    .select("name email avatar")
    .lean();

  const orderMap = new Map(followerIdsPage.map((id, i) => [String(id), i]));
  users.sort(
    (a, b) => (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0)
  );

  return { total_followers, page: p, limit: l, items: users };
}

async function getAllFollowers(shopId) {
  const base = await Shop.findById(shopId).select("followers").lean();
  if (!base) throw new Error("Không tìm thấy shop");

  if (!Array.isArray(base.followers) || base.followers.length === 0) {
    return { total: 0, items: [] };
  }

  const users = await User.find({ _id: { $in: base.followers } })
    .select("name email avatar")
    .lean();

  const orderMap = new Map(base.followers.map((id, i) => [String(id), i]));
  users.sort(
    (a, b) => (orderMap.get(String(a._id)) ?? 0) - (orderMap.get(String(b._id)) ?? 0)
  );

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
