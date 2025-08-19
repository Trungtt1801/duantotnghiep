const express = require("express");
const router = express.Router();

const orderShopController = require("../mongo/controllers/orderShopController");

// [GET] Lấy tất cả OrderShop (admin)
router.get("/", async (req, res) => {
  try {
    const result = await orderShopController.getAllOrderShops();
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy danh sách OrderShop" });
  }
});

// [GET] Lọc OrderShop theo query
router.get("/filter", async (req, res) => {
  try {
    const result = await orderShopController.filterOrderShops(req.query);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lọc OrderShop" });
  }
});

// [GET] Lấy tất cả OrderShop của một shop (seller)
router.get("/shop/:shopId", async (req, res) => {
  try {
    const result = await orderShopController.getOrderShopsByShopId(
      req.params.shopId,
      req.query
    );
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy OrderShop theo shop" });
  }
});

// ✅ [GET] Lấy OrderShop theo order cha
// URL: /api/order-shops/order/:orderId?page=1&limit=20&status=...
router.get("/order/:orderId", async (req, res) => {
  try {
    const result = await orderShopController.getOrderShopsByOrderId(
      req.params.orderId,
      req.query
    );
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy OrderShop theo order" });
  }
});

// [GET] Lấy các OrderDetail thuộc một OrderShop
router.get("/:id/details", async (req, res) => {
  try {
    const result = await orderShopController.getDetailsByOrderShopId(
      req.params.id
    );
    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Không tìm thấy chi tiết đơn" });
    }
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy chi tiết OrderShop" });
  }
});

// [GET] Lấy 1 OrderShop theo ID
router.get("/:id", async (req, res) => {
  try {
    const result = await orderShopController.getOrderShopById(req.params.id);
    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Không tìm thấy OrderShop" });
    }
    return res.status(200).json({ status: true, orderShop: result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy OrderShop" });
  }
});

// [PATCH] Cập nhật trạng thái OrderShop
router.patch("/:id/status", async (req, res) => {
  try {
    const { status, note } = req.body;
    const result = await orderShopController.updateOrderShopStatus(
      req.params.id,
      status,
      note
    );
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [PATCH] Hủy một OrderShop
router.patch("/:id/cancel", async (req, res) => {
  try {
    const { note } = req.body;
    const result = await orderShopController.cancelOrderShop(
      req.params.id,
      note
    );
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [PATCH] Hoàn tiền một OrderShop
router.patch("/:id/refund", async (req, res) => {
  try {
    const { note } = req.body;
    const result = await orderShopController.refundOrderShop(
      req.params.id,
      note
    );
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [DELETE] Xoá một OrderShop
router.delete("/:id", async (req, res) => {
  try {
    const result = await orderShopController.deleteOrderShop(req.params.id);
    return res.status(200).json({
      status: true,
      message: "Xoá OrderShop thành công",
      result,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi xoá OrderShop" });
  }
});

module.exports = router;
