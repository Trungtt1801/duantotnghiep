const express = require('express');
const router = express.Router();
const orderDetailController = require('../mongo/controllers/orderDetailController');

// [GET] Lấy chi tiết đơn hàng theo order_id
// GET https://fiyo.click/api/orderDetail/:orderId
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    const result = await orderDetailController.getOrderDetailByOrderId(orderId);

    if (!result.status) {
      return res.status(500).json({
        status: false,
        message: result.message || "Lỗi không xác định"
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

// [POST] Thêm chi tiết đơn hàng
// POST https://fiyo.click/api/orderDetail/
router.post('/', async (req, res) => {
  try {
    const result = await orderDetailController.addOrderDetail(req.body);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi thêm chi tiết đơn hàng' });
  }
});

// [DELETE] Xoá toàn bộ chi tiết theo order_id
// DELETE https://fiyo.click/api/orderDetail/:orderId
router.delete('/:orderId', async (req, res) => {
  try {
    const result = await orderDetailController.deleteDetailsByOrderId(req.params.orderId);
    return res.status(200).json({ status: true, message: 'Xoá chi tiết đơn hàng thành công', result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi xoá chi tiết đơn hàng' });
  }
});
// [GET] Lấy sản phẩm bán ít nhất trong khoảng thời gian nhất định
// GET https://fiyo.click/api/orderDetail/reports/least-sold?timePeriod
router.get('/reports/least-sold', async (req, res) => {
  try {
    const { timePeriod } = req.query;
    const result = await orderDetailController.getLeastSoldProducts(timePeriod);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi lấy sản phẩm bán ít nhất' });
  }
});

module.exports = router;
