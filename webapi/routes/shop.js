// routes/shops.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const shopController = require("../mongo/controllers/shopController");

const UPLOAD_DIR = path.join(__dirname, "..", "public", "images");
// đảm bảo thư mục tồn tại
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

function mapImagePath(file) {
  return file ? `https://fiyo.click/api/images/${file.filename}` : "";
}

/** ==========================
 *  NOTE về thứ tự route:
 *  - Các route cụ thể / tĩnh ("/by-product/..", "/user/..", "/:id/follow/..", "/:id/followers", "/:shopId/categories")
 *    phải đặt TRƯỚC "/:id" để không bị nuốt bởi param ':id'.
 *  ========================== */

// === Lấy shop theo productId (đặt trước /:id)
router.get("/by-product/:productId", async (req, res) => {
  try {
    const data = await shopController.getShopByProductId(req.params.productId);
    return res.status(200).json({ status: true, shop: data });
  } catch (e) {
    return res.status(400).json({ status: false, message: e.message || "Lỗi" });
  }
});

// === Lấy shop theo userId (đặt trước /:id)
router.get("/user/:userId", async (req, res) => {
  try {
    const shop = await shopController.getShopByUserId(req.params.userId);
    return res.status(200).json({
      message: "Lấy shop theo user_id thành công",
      shop,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Lỗi lấy shop theo user_id",
    });
  }
});

// === FOLLOW APIs (đặt trước /:id)
// Follow shop
router.post("/:id/follow", async (req, res) => {
  try {
    const { user_id } = req.body; // hoặc lấy từ req.user nếu có auth
    if (!user_id) return res.status(400).json({ message: "Thiếu user_id" });
    const data = await shopController.followShop(req.params.id, user_id);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Lỗi follow shop" });
  }
});

// Unfollow shop
router.delete("/:id/follow", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: "Thiếu user_id" });
    const data = await shopController.unfollowShop(req.params.id, user_id);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Lỗi unfollow shop" });
  }
});

// Toggle follow
router.patch("/:id/follow/toggle", async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: "Thiếu user_id" });
    const data = await shopController.toggleFollow(req.params.id, user_id);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(400).json({ message: error.message || "Lỗi toggle follow" });
  }
});

// Check user có đang follow shop không
router.get("/:id/following/:userId", async (req, res) => {
  try {
    const data = await shopController.isFollowing(req.params.id, req.params.userId);
    return res.status(200).json(data); // { following: boolean }
  } catch (error) {
    return res.status(400).json({ message: error.message || "Lỗi check follow" });
  }
});

// List followers (phân trang ?page=&limit=)
router.get("/:id/followers", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    const data = await shopController.listFollowers(req.params.id, page, limit);
    return res.status(200).json(data); // { followers_count, followers }
  } catch (error) {
    return res.status(400).json({ message: error.message || "Lỗi lấy danh sách follower" });
  }
});

// (tuỳ chọn) List shops mà 1 user đã follow (đường dẫn riêng biệt, không đụng /:id)
router.get("/following/user/:userId", async (req, res) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "20", 10);
    if (!shopController.listFollowingShops) {
      return res.status(501).json({ message: "API chưa được triển khai trong controller" });
    }
    const data = await shopController.listFollowingShops(req.params.userId, page, limit);
    return res.status(200).json(data); // { total, items: [...] }
  } catch (e) {
    return res.status(400).json({ message: e.message || "Lỗi lấy shop đã follow" });
  }
});

// === Lấy danh mục theo shopId (đặt trước /:id)
router.get("/:shopId/categories", async (req, res) => {
  try {
    const categories = await shopController.getCategoriesByShop(req.params.shopId);
    return res.status(200).json({
      message: "Lấy danh mục theo shop thành công",
      categories,
    });
  } catch (error) {
    return res.status(400).json({
      message: error.message || "Lỗi lấy danh mục theo shop",
    });
  }
});

// === Tạo shop
router.post(
  "/",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      // nếu có file thì đẩy path vào body để controller dùng luôn
      if (req.files?.avatar?.[0]) {
        req.body.avatar = mapImagePath(req.files.avatar[0]);
      }
      if (req.files?.banner?.[0]) {
        req.body.banner = mapImagePath(req.files.banner[0]); // optional
      }

      const shop = await shopController.createShop(req.body);
      return res.status(200).json(shop);
    } catch (error) {
      console.error("POST /shops lỗi:", error);
      return res.status(400).json({ message: error.message || "Lỗi tạo shop" });
    }
  }
);

// === Lấy tất cả shop
router.get("/", async (req, res) => {
  try {
    const shops = await shopController.getAllShops();
    return res.status(200).json(shops);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Lỗi lấy danh sách shop" });
  }
});

// === Lấy shop theo id (đặt SAU tất cả route cụ thể bên trên)
router.get("/:id", async (req, res) => {
  try {
    const shop = await shopController.getShopById(req.params.id);
    return res.status(200).json(shop);
  } catch (error) {
    return res.status(404).json({ message: error.message || "Không tìm thấy shop" });
  }
});

// === Cập nhật shop
router.put(
  "/:id",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (req.files?.avatar?.[0]) {
        req.body.avatar = mapImagePath(req.files.avatar[0]);
      }
      if (req.files?.banner?.[0]) {
        req.body.banner = mapImagePath(req.files.banner[0]);
      }

      const shop = await shopController.updateShop(req.params.id, req.body);
      return res.status(200).json(shop);
    } catch (error) {
      console.error("PUT /shops/:id lỗi:", error);
      return res.status(400).json({ message: error.message || "Lỗi cập nhật shop" });
    }
  }
);

// === Xóa shop
router.delete("/:id", async (req, res) => {
  try {
    const result = await shopController.deleteShop(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(404).json({ message: error.message || "Không tìm thấy shop để xóa" });
  }
});

// === Mở khóa shop (set status = active)
router.patch("/:id/activate", async (req, res) => {
  try {
    const shop = await shopController.activateShop(req.params.id);
    return res.status(200).json({ message: "Shop activated successfully", shop });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Lỗi kích hoạt shop" });
  }
});

// === Toggle trạng thái active/inactive
router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const shop = await shopController.toggleShopStatus(req.params.id);
    return res.status(200).json({
      message: `Shop đã được ${shop.status === "active" ? "mở khóa" : "khóa"}`,
      shop,
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Lỗi toggle trạng thái shop" });
  }
});

module.exports = router;
