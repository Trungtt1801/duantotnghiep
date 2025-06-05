const express = require('express');
const router = express.Router();
const orderDetailController = require('../mongo/controllers/orderDetailController');

// [GET] Lấy chi tiết đơn hàng theo order_id
// GET http://localhost:3000/orderDetail/:orderId
router.get('/:orderId', async (req, res) => {
  try {
    const result = await orderDetailController.getDetailsByOrderId(req.params.orderId);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi lấy chi tiết đơn hàng' });
  }
});

// [POST] Thêm chi tiết đơn hàng
// POST http://localhost:3000/orderDetail/
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
// DELETE http://localhost:3000/orderDetail/:orderId
router.delete('/:orderId', async (req, res) => {
  try {
    const result = await orderDetailController.deleteDetailsByOrderId(req.params.orderId);
    return res.status(200).json({ status: true, message: 'Xoá chi tiết đơn hàng thành công', result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi xoá chi tiết đơn hàng' });
  }
});

module.exports = router;
