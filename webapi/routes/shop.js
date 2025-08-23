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
  return file ? `http://localhost:3000//images/${file.filename}` : "";
}


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
        req.body.banner = mapImagePath(req.files.banner[0]); // controller hiện chưa nhận banner => optional
      }

      const shop = await shopController.createShop(req.body);
      return res.status(200).json(shop);
    } catch (error) {
      console.error("POST /shops lỗi:", error);
      return res.status(400).json({ message: error.message || "Lỗi tạo shop" });
    }
  }
);
router.get("/by-product/:productId", async (req, res) => {
  try {
    const data = await shopController.getShopByProductId(req.params.productId);
    return res.status(200).json({ status: true, shop: data });
  } catch (e) {
    return res.status(400).json({ status: false, message: e.message || "Lỗi" });
  }
});

// Lấy tất cả shop
router.get("/", async (req, res) => {
  try {
    const shops = await shopController.getAllShops();
    return res.status(200).json(shops);
  } catch (error) {
    return res
      .status(500)
      .json({ message: error.message || "Lỗi lấy danh sách shop" });
  }
});

// Lấy shop theo id
router.get("/:id", async (req, res) => {
  try {
    const shop = await shopController.getShopById(req.params.id);
    return res.status(200).json(shop);
  } catch (error) {
    return res
      .status(404)
      .json({ message: error.message || "Không tìm thấy shop" });
  }
});

// Cập nhật shop (hỗ trợ upload avatar/banner hoặc giữ ảnh cũ nếu không gửi)
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
      return res
        .status(400)
        .json({ message: error.message || "Lỗi cập nhật shop" });
    }
  }
);

// Xóa shop
router.delete("/:id", async (req, res) => {
  try {
    const result = await shopController.deleteShop(req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return res
      .status(404)
      .json({ message: error.message || "Không tìm thấy shop để xóa" });
  }
});

// Mở khóa shop (set status = active)
router.patch("/:id/activate", async (req, res) => {
  try {
    const shop = await shopController.activateShop(req.params.id);
    return res
      .status(200)
      .json({ message: "Shop activated successfully", shop });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Lỗi kích hoạt shop" });
  }
});

// Toggle trạng thái active/inactive
router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const shop = await shopController.toggleShopStatus(req.params.id);
    return res.status(200).json({
      message: `Shop đã được ${shop.status === "active" ? "mở khóa" : "khóa"}`,
      shop,
    });
  } catch (error) {
    return res
      .status(400)
      .json({ message: error.message || "Lỗi toggle trạng thái shop" });
  }
});

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

// Lấy danh mục theo shopId
router.get("/:shopId/categories", async (req, res) => {
  try {
    const categories = await getCategoriesByShop(req.params.shopId);
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

// shop theo user id


module.exports = router;