const express = require('express');
const router = express.Router();
const addressController = require('../mongo/controllers/addressController');

// [GET] Lấy địa chỉ (tất cả hoặc theo user_id)
// URL: http://localhost:3000/addresses
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (user_id) {
      const addresses = await addressController.getAddressesByUserId(user_id);
      return res.status(200).json({ status: true, result: addresses });
    }

    const result = await addressController.getAllAddresses();
    return res.status(200).json({ status: true, result });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách địa chỉ:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// [GET] Lấy địa chỉ theo ID
// URL: http://localhost:3000/addresses/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await addressController.getAddressById(req.params.id);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(404).json({ status: false, message: err.message });
  }
});

// [POST] Tạo địa chỉ
// URL: http://localhost:3000/addresses
router.post('/', async (req, res) => {
  try {
    const result = await addressController.createAddress(req.body);
    return res.status(201).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [PUT] Cập nhật địa chỉ
// URL: http://localhost:3000/addresses/:id
router.put('/:id', async (req, res) => {
  try {
    const result = await addressController.updateAddress(req.params.id, req.body);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [DELETE] Xoá địa chỉ
// URL: http://localhost:3000/addresses/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await addressController.deleteAddress(req.params.id);
    return res.status(200).json({ status: true, message: 'Xoá địa chỉ thành công', result });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
