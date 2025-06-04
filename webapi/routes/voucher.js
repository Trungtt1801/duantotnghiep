const express = require('express');
const router = express.Router();
const voucherController = require('../mongo/controllers/voucherController');

// [GET] Lấy tất cả voucher
// URL: http://localhost:3000/voucher
router.get('/', async (req, res) => {
  try {
    const vouchers = await voucherController.getAllVouchers();
    res.status(200).json({ status: true, vouchers });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

// [GET] Lấy voucher theo ID
// URL: http://localhost:3000/voucher/:id
router.get('/:id', async (req, res) => {
  try {
    const voucher = await voucherController.getVoucherById(req.params.id);
    res.status(200).json({ status: true, voucher });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

// [POST] Tạo voucher mới
// URL: http://localhost:3000/voucher
router.post('/', async (req, res) => {
  try {
    const voucher = await voucherController.addVoucher(req.body);
    res.status(200).json({ status: true, voucher });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

// [PUT] Cập nhật voucher
// URL: http://localhost:3000/voucher/:id
router.put('/:id', async (req, res) => {
  try {
    const voucher = await voucherController.updateVoucher(req.params.id, req.body);
    res.status(200).json({ status: true, voucher });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

// [DELETE] Xóa voucher
// URL: http://localhost:3000/voucher/:id
router.delete('/:id', async (req, res) => {
  try {
    await voucherController.deleteVoucher(req.params.id);
    res.status(200).json({ status: true, message: 'Xóa voucher thành công' });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});
// [PATCH] Dùng voucher (giảm quantity, cập nhật trạng thái tự động)
// URL: PATCH http://localhost:3000/voucher/use/:id
router.patch('/use/:id', async (req, res) => {
  try {
    const voucher = await voucherController.useVoucher(req.params.id);
    res.status(200).json({ status: true, voucher, message: 'Sử dụng voucher thành công' });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});

// [PATCH] Cập nhật trạng thái voucher (bật/tắt)
// URL: PATCH http://localhost:3000/voucher/status/:id
router.patch('/status/:id', async (req, res) => {
  try {
    const { is_active } = req.body;
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ status: false, message: 'Cần truyền is_active kiểu boolean' });
    }
    const voucher = await voucherController.updateStatusVoucher(req.params.id, is_active);
    res.status(200).json({ status: true, voucher, message: `Voucher đã được ${is_active ? 'bật' : 'tắt'}` });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});
module.exports = router;
