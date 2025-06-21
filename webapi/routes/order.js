const express = require('express');
const router = express.Router();
const orderController = require('../mongo/controllers/orderController');

// [GET] Lấy tất cả đơn hàng
// URL: http://localhost:3000/orders
router.get('/', async (req, res) => {
  try {
    const result = await orderController.getAllOrders();
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi lấy danh sách đơn hàng' });
  }
});

// [POST] Tạo đơn hàng
// URL: http://localhost:3000/orders
router.post('/', async (req, res) => {
  try {
    const result = await orderController.addOrder(req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi tạo đơn hàng' });
  }
});

// [PUT] Xác nhận đơn hàng
// URL: http://localhost:3000/orders/:id/confirm
router.put('/:id/confirm', async (req, res) => {
  try {
    const result = await orderController.confirmOrder(req.params.id);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [PUT] Cập nhật trạng thái đơn hàng
// URL: http://localhost:3000/orders/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await orderController.updateOrderStatus(req.params.id, status);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [PUT] Cập nhật thanh toán
// URL: http://localhost:3000/orders/:id/payment
router.put('/:id/payment', async (req, res) => {
  try {
    const result = await orderController.updatePayment(req.params.id, req.body);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [PUT] Hủy đơn hàng
// URL: http://localhost:3000/orders/:id/cancel?admin=true
router.put('/:id/cancel', async (req, res) => {
  try {
    const isAdmin = req.query.admin === 'true';
    const result = await orderController.cancelOrder(req.params.id, isAdmin);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [GET] Lọc đơn hàng
// URL: http://localhost:3000/orders/filter?status=delivered&customerId=abc123
router.get('/filter', async (req, res) => {
  try {
    const result = await orderController.filterOrders(req.query);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    return res.status(500).json({ status: false, message: 'Lỗi lọc đơn hàng' });
  }
});

// [GET] Lấy đơn hàng theo ID
// URL: http://localhost:3000/orders/:id
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

// [DELETE] Xóa đơn hàng
// URL: http://localhost:3000/orders/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await orderController.deleteOrder(req.params.id);
    return res.status(200).json({ status: true, message: 'Xoá đơn hàng thành công', result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: 'Lỗi xoá đơn hàng' });
  }
});
router.post('/zalopay-callback', async (req, res) => {
    try {
        const result = await orderController.zaloCallback(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/zalopay', async (req, res) => {
    try {
        const result = await orderController.createOrderWithZaloPay(req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
