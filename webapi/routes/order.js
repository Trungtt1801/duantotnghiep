const express = require('express');
const router = express.Router();
const orderController = require('../mongo/controllers/orderController');

// [GET] Lấy tất cả đơn hàng
// GET http://localhost:3000/order/
router.get('/', async (req, res) => {
  try {
    const result = await orderController.getAllOrders();
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi lấy danh sách đơn hàng' });
  }
});

// [GET] Lấy đơn hàng theo ID
// GET http://localhost:3000/order/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await orderController.getOrderById(req.params.id);
    if (!result) {
      return res.status(404).json({ status: false, message: 'Không tìm thấy đơn hàng' });
    }
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi lấy đơn hàng' });
  }
});

// [POST] Tạo đơn hàng
// POST http://localhost:3000/order/
router.post('/', async (req, res) => {
  try {
    const result = await orderController.createOrder(req.body);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi tạo đơn hàng' });
  }
});

// [PUT] Cập nhật trạng thái đơn hàng
// PUT http://localhost:3000/order/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status_order } = req.body;
    const result = await orderController.updateOrderStatus(id, status_order);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi cập nhật trạng thái đơn hàng' });
  }
});

// [DELETE] Xoá đơn hàng
// DELETE http://localhost:3000/order/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await orderController.deleteOrder(req.params.id);
    return res.status(200).json({ status: true, message: 'Xoá đơn hàng thành công', result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi xoá đơn hàng' });
  }
});

module.exports = router;
