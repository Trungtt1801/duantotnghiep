// mongo/controllers/shopController.js
const Shop = require("../models/shopModel");
const Product = require("../models/productsModel");

// ===== Helpers =====
async function countProductsByShop(shopId, onlyActive = false) {
  const q = { shop_id: shopId };
  if (onlyActive) q.status = "active";
  return Product.countDocuments(q);
}

// ===== CRUD =====
async function createShop(data) {
  const { user_id, name, address, phone, email, status, description, avatar, banner } = data;

  const shop = new Shop({
    user_id,
    name,
    address,
    phone,
    email,
    status,
    description,
    avatar: avatar || "",
    banner: banner || "",
  });

  await shop.save();
  return shop;
}

async function getAllShops() {
  return Shop.find().populate("user_id", "name email phone");
}

async function getShopById(id) {
  const shop = await Shop.findById(id).populate("user_id", "name email phone").lean();
  if (!shop) throw new Error("Không tìm thấy shop");
  const total = await countProductsByShop(id, false);
  return { ...shop, total_products: total };
}

async function updateShop(id, data) {
  const allowed = ["name", "address", "phone", "email", "status", "description", "avatar", "banner"];
  const $set = {};
  for (const k of allowed) if (data[k] !== undefined) $set[k] = data[k];

  const shop = await Shop.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true });
  if (!shop) throw new Error("Không tìm thấy shop để cập nhật");
  return shop;
}

async function deleteShop(id) {
  const shop = await Shop.findByIdAndDelete(id);
  if (!shop) throw new Error("Không tìm thấy shop để xóa");
  return { message: "Xóa shop thành công" };
}

async function activateShop(id) {
  const shop = await Shop.findByIdAndUpdate(id, { status: "active" }, { new: true, runValidators: true });
  if (!shop) throw new Error("Không tìm thấy shop để mở khóa");
  return shop;
}

async function toggleShopStatus(id) {
  const shop = await Shop.findById(id);
  if (!shop) throw new Error("Không tìm thấy shop");
  shop.status = shop.status === "active" ? "inactive" : "active";
  await shop.save();
  return shop;
}

// ===== Queries =====
async function getShopByUserId(userId) {
  // Không throw khi không có -> router sẽ trả 404
  const shop = await Shop.findOne({ user_id: userId })
    .populate("user_id", "name email phone avatar")
    .populate("followers", "name email avatar");

  if (!shop) return null;

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
    rating: { average: shop.rating?.average || 0, count: shop.rating?.count || 0 },
    followers_count: Array.isArray(shop.followers) ? shop.followers.length : 0,
    followers: shop.followers || [],
    owner: shop.user_id,
  };
}

async function getCategoriesByShop(shopId) {
  const products = await Product.find({ shop_id: shopId }).populate("category_id.categoryId", "name");
  if (!products || !products.length) return [];
  const map = new Map();
  for (const p of products) {
    if (p.category_id?.categoryId) {
      const id = String(p.category_id.categoryId._id);
      if (!map.has(id)) {
        map.set(id, { _id: id, name: p.category_id.categoryName });
      }
    }
  }
  return Array.from(map.values());
}

async function getShopByProductId(productId) {
  const product = await Product.findById(productId).select("shop_id").lean();
  if (!product) throw new Error("Không tìm thấy sản phẩm");
  if (!product.shop_id) throw new Error("Sản phẩm chưa gắn shop");

  const shop = await Shop.findById(product.shop_id)
    .select("name address phone email status description avatar banner rating sale_count followers created_at updated_at user_id")
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
    rating: { average: shop?.rating?.average || 0, count: shop?.rating?.count || 0 },
    followers_count: Array.isArray(shop.followers) ? shop.followers.length : 0,
    followers: shop.followers || [],
    owner: shop.user_id,
    total_products: total,
  };
}

module.exports = {
  // CRUD
  createShop,
  getAllShops,
  getShopById,
  updateShop,
  deleteShop,
  activateShop,
  toggleShopStatus,
  // Queries
  getShopByUserId,
  getCategoriesByShop,
  getShopByProductId,
  // Helper
  countProductsByShop,
};
