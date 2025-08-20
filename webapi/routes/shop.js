const express = require("express");
const router = express.Router();
const shopController = require("../mongo/controllers/shopController");

// Thêm shop
router.post("/", async (req, res) => {
  try {
    const shop = await shopController.createShop(req.body);
    res.status(200).json(shop);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Lấy tất cả shop
router.get("/", async (req, res) => {
  try {
    const shops = await shopController.getAllShops();
    res.status(200).json(shops);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lấy shop theo id
router.get("/:id", async (req, res) => {
  try {
    const shop = await shopController.getShopById(req.params.id);
    res.status(200).json(shop);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

// Cập nhật shop
router.put("/:id", async (req, res) => {
  try {
    const shop = await shopController.updateShop(req.params.id, req.body);
    res.status(200).json(shop);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Xóa shop
router.delete("/:id", async (req, res) => {
  try {
    const result = await shopController.deleteShop(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});
// Mở khóa shop (set status = active)
router.patch("/:id/activate", async (req, res) => {
  try {
    const shop = await shopController.activateShop(req.params.id);
    res.status(200).json({ message: "Shop activated successfully", shop });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.patch("/:id/toggle-status", async (req, res) => {
  try {
    const shop = await shopController.toggleShopStatus(req.params.id);
    res.status(200).json({
      message: `Shop đã được ${shop.status === "active" ? "mở khóa" : "khóa"}`,
      shop,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/user/:userId", async (req, res) => {
  try {
    const shop = await shopController.getShopByUserId(req.params.userId);
    res.status(200).json(shop);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});
module.exports = router;
