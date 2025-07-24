const express = require('express');
const router = express.Router();
const addressController = require('../mongo/controllers/addressController');

// [GET] Lấy tất cả địa chỉ
// URL: http://localhost:3000/address
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (user_id) {
      const addresses = await addressController.getAddressesByUserId(user_id);
      const formatted = addresses.map((a) => a.toJSON()); // ✅ format ngày
      return res.status(200).json({ status: true, result: formatted });
    }

    const result = await addressController.getAllAddresses();
    const formatted = result.map((a) => a.toJSON()); // ✅ format ngày
    return res.status(200).json({ status: true, result: formatted });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách địa chỉ:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// http://localhost:3000/address/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const result = await addressController.getAddressesByUserId(req.params.userId);
   return res.status(200).json(result);
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [GET] Lấy địa chỉ theo ID
// URL: http://localhost:3000/address/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await addressController.getAddressById(req.params.id);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(404).json({ status: false, message: err.message });
  }
});

// [POST] Tạo địa chỉ
// URL: http://localhost:3000/address/create
router.post("/create", async (req, res) => {
  try {
    const result = await addressController.createAddress(req.body);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// [PUT] Cập nhật địa chỉ
// URL: http://localhost:3000/address/:id
router.put("/:id", async (req, res) => {
  try {
    const result = await addressController.updateAddress(req.params.id, req.body);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

// [DELETE] Xoá địa chỉ
// URL: http://localhost:3000/address/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await addressController.deleteAddress(req.params.id);
    return res.status(200).json({ status: true, message: 'Xoá địa chỉ thành công', result });
  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
});

module.exports = router;
