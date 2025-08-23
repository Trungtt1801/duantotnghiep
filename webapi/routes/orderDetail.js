const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const orderDetailController = require('../mongo/controllers/orderDetailController');

// ⚠️ Đặt các route cụ thể TRƯỚC route param (/:orderId) để tránh bị nuốt

// [GET] Lấy sản phẩm bán ít nhất trong khoảng thời gian
// GET http://localhost:3000/api/orderDetail/reports/least-sold?timePeriod=7d|30d|90d|180d|365d|all
router.get('/reports/least-sold', async (req, res) => {
  try {
    const { timePeriod } = req.query;
    const result = await orderDetailController.getLeastSoldProducts(timePeriod);
    return res.status(200).json({ status: true, result: result.result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi lấy sản phẩm bán ít nhất' });
  }
});

// [POST] Thêm chi tiết đơn hàng (dev tool)
router.post('/', async (req, res) => {
  try {
    const required = [
      "order_id",
      "order_shop_id",
      "shop_id",
      "product_id",
      "variant_id",
      "size_id",
      "quantity",
    ];
    for (const k of required) {
      if (req.body[k] === undefined || req.body[k] === null || req.body[k] === "") {
        return res.status(400).json({ status: false, message: `Thiếu field: ${k}` });
      }
    }

    const result = await orderDetailController.addOrderDetail(req.body);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi thêm chi tiết đơn hàng' });
  }
});

// [DELETE] Xoá toàn bộ chi tiết theo order_id
router.delete('/:orderId', async (req, res) => {
  try {
    const result = await orderDetailController.deleteDetailsByOrderId(req.params.orderId);
    return res.status(200).json({ status: true, message: 'Xoá chi tiết đơn hàng thành công', result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi xoá chi tiết đơn hàng' });
  }
});

// [GET] Lấy chi tiết đơn hàng theo order_id (đặt SAU các route cụ thể)
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await orderDetailController.getOrderDetailByOrderId(orderId);

    if (!result.status) {
      return res.status(404).json({
        status: false,
        message: result.message || "Không tìm thấy chi tiết đơn hàng"
      });
    }

    return res.status(200).json(result);

  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết đơn hàng:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi server"
    });
  }
});

router.get("/order-shops/:orderShopId/details", async (req, res) => {
  try {
    const { orderShopId } = req.params;

    // check ObjectId hợp lệ
    if (!mongoose.Types.ObjectId.isValid(orderShopId)) {
      return res.status(400).json({
        status: false,
        message: "orderShopId không hợp lệ",
      });
    }

    const result = await orderDetailController.getOrderDetailsByOrderShopId(orderShopId);

    if (!result.status) {
      return res.status(404).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ GET /order-shops/:orderShopId/details error:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi server",
    });
  }
});

module.exports = router;
