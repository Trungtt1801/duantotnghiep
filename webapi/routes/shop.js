// routes/shop.js
const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const mongoose = require("mongoose");

const shopController = require("../mongo/controllers/shopController");

// ====== STATIC UPLOAD DIR ======
const UPLOAD_DIR = path.join(__dirname, "..", "public", "images");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// tránh trùng tên file
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// phải đồng bộ với app.use("/api/images", express.static(...))
function mapImagePath(file) {
  return file ? `http://localhost:3000/api/images/${file.filename}` : "";
}

// ================== ROUTES (CHÚ Ý THỨ TỰ) ==================

// Theo productId
router.get("/by-product/:productId", async (req, res) => {
  try {
    const data = await shopController.getShopByProductId(req.params.productId);
    return res.status(200).json({ status: true, shop: data });
  } catch (e) {
    console.error("[GET] /shop/by-product/:productId", e);
    return res.status(400).json({ status: false, message: e.message || "Lỗi" });
  }
});

// Lấy shop theo userId (dùng cho settings sau đăng nhập)
router.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  // 1) Validate trước để tránh crash
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    console.error("[GET] /shop/user/:userId -> invalid id:", userId);
    return res.status(400).json({ message: "user_id không hợp lệ" });
  }

  try {
    const shop = await shopController.getShopByUserId(userId); // trả null nếu chưa có
    if (!shop) {
      return res.status(404).json({ message: "Người dùng này chưa có shop" });
    }
    return res.status(200).json({ message: "OK", shop });
  } catch (error) {
    console.error("[GET] /shop/user/:userId unexpected", error);
    return res.status(500).json({ message: error?.message || "Server error" });
  }
});

// Lấy categories theo shop
router.get("/:shopId/categories", async (req, res) => {
  try {
    const categories = await shopController.getCategoriesByShop(req.params.shopId);
    return res.status(200).json({ message: "Lấy danh mục theo shop thành công", categories });
  } catch (error) {
    console.error("[GET] /shop/:shopId/categories", error);
    return res.status(400).json({ message: error.message || "Lỗi lấy danh mục theo shop" });
  }
});

// Tạo shop (multipart: avatar/banner)
router.post(
  "/",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (req.files?.avatar?.[0]) req.body.avatar = mapImagePath(req.files.avatar[0]);
      if (req.files?.banner?.[0]) req.body.banner = mapImagePath(req.files.banner[0]);

      const shop = await shopController.createShop(req.body);
      return res.status(200).json(shop);
    } catch (error) {
      console.error("[POST] /shop", error);
      return res.status(400).json({ message: error.message || "Lỗi tạo shop" });
    }
  }
);

// Lấy tất cả shop
router.get("/", async (req, res) => {
  try {
    const shops = await shopController.getAllShops();
    return res.status(200).json(shops);
  } catch (error) {
    console.error("[GET] /shop", error);
    return res.status(500).json({ message: error.message || "Lỗi lấy danh sách shop" });
  }
});

// Lấy shop theo id (ĐỂ SAU CÙNG)
router.get("/:id", async (req, res) => {
  try {
    const shop = await shopController.getShopById(req.params.id);
    return res.status(200).json(shop);
  } catch (error) {
    console.error("[GET] /shop/:id", error);
    return res.status(404).json({ message: error.message || "Không tìm thấy shop" });
  }
});

// Cập nhật shop (multipart, update partial)
router.put(
  "/:id",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "banner", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      if (req.files?.avatar?.[0]) req.body.avatar = mapImagePath(req.files.avatar[0]);
      if (req.files?.banner?.[0]) req.body.banner = mapImagePath(req.files.banner[0]);

      const shop = await shopController.updateShop(req.params.id, req.body);
      return res.status(200).json(shop);
    } catch (error) {
      console.error("[PUT] /shop/:id", error);
      return res.status(400).json({ message: error.message || "Lỗi cập nhật shop" });
    }
  }
);

// Xóa shop
router.delete("/:id", async (req, res) => {
  try {
    const result = await shopController.deleteShop(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    console.error("[DELETE] /shop/:id", error);
    return res.status(404).json({ message: error.message || "Không tìm thấy shop để xóa" });
  }
});

// Kích hoạt
router.patch("/:id/activate", async (req, res) => {
  try {
    const shop = await shopController.activateShop(req.params.id);
    return res.status(200).json({ message: "Shop activated successfully", shop });
  } catch (error) {
    console.error("[PATCH] /shop/:id/activate", error);
    return res.status(400).json({ message: error.message || "Lỗi kích hoạt shop" });
  }
});

// Toggle trạng thái
router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const shop = await shopController.toggleShopStatus(req.params.id);
    return res.status(200).json({
      message: `Shop đã được ${shop.status === "active" ? "mở khóa" : "khóa"}`,
      shop,
    });
  } catch (error) {
    console.error("[PATCH] /shop/:id/toggle-status", error);
    return res.status(400).json({ message: error.message || "Lỗi toggle trạng thái shop" });
  }
});

module.exports = router;
