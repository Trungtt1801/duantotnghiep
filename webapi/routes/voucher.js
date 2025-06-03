const express = require('express');
const router = express.Router();
const voucherController = require('../mongo/controllers/voucherController');

// [GET] Lấy tất cả voucher
// URL: http://localhost:3000/vouchers
router.get('/', async (req, res) => {
  try {
    const vouchers = await voucherController.getAllVouchers();
    res.status(200).json({ status: true, vouchers });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// [GET] Lấy voucher theo ID
// URL: http://localhost:3000/vouchers/:id
router.get('/:id', async (req, res) => {
  try {
    const voucher = await voucherController.getVoucherById(req.params.id);
    res.status(200).json({ status: true, voucher });
  } catch (error) {
    res.status(404).json({ status: false, message: error.message });
  }
});

// [POST] Tạo voucher mới
// URL: http://localhost:3000/vouchers
router.post('/', async (req, res) => {
  try {
    const voucher = await voucherController.addVoucher(req.body);
    res.status(201).json({ status: true, voucher });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

// [PUT] Cập nhật voucher
// URL: http://localhost:3000/vouchers/:id
router.put('/:id', async (req, res) => {
  try {
    const voucher = await voucherController.updateVoucher(req.params.id, req.body);
    res.status(200).json({ status: true, voucher });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

// [DELETE] Xóa voucher
// URL: http://localhost:3000/vouchers/:id
router.delete('/:id', async (req, res) => {
  try {
    await voucherController.deleteVoucher(req.params.id);
    res.status(200).json({ status: true, message: 'Xóa voucher thành công' });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

module.exports = router;
