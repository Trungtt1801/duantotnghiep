const express = require('express');
const router = express.Router();
const addressController = require('../mongo/controllers/addressController');

// [GET] Lấy tất cả địa chỉ
// URL: http://localhost:3000/address
router.get('/add', async (req, res) => {
    try {
    const { user_id } = req.query;

    if (user_id) {
      const addresses = await addressController.getAddressesByUserId(user_id);
      if (!addresses || addresses.length === 0) {
        return res.status(404).json({ status: false, message: "Không tìm thấy địa chỉ cho user này." });
      }
      const formatted = addresses.map((a) => a.toJSON()); // ✅ format ngày
      return res.status(200).json({ status: true, result: formatted });
    }

    const result = await addressController.getAllAddresses();
    const formatted = result.map((a) => a.toJSON());
    return res.status(200).json({ status: true, result: formatted });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách địa chỉ:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
});
// [GET] Lấy tất cả địa chỉ hoặc theo user_id
// URL: http://localhost:3000/address?user_id=64531a...
router.get('/', async (req, res) => {
  try {
    const { user_id } = req.query;

    if (user_id) {
      const addresses = await addressController.getAddressesByUserId(user_id);
      if (!addresses || addresses.length === 0) {
        return res.status(404).json({ status: false, message: "Không tìm thấy địa chỉ cho user này." });
      }
      const formatted = addresses.map((a) => a.toJSON()); // ✅ format ngày
      return res.status(200).json({ status: true, result: formatted });
    }

    const result = await addressController.getAllAddresses();
    const formatted = result.map((a) => a.toJSON());
    return res.status(200).json({ status: true, result: formatted });
  } catch (err) {
    console.error("Lỗi khi lấy danh sách địa chỉ:", err);
    return res.status(500).json({ status: false, message: err.message });
  }
});

// [GET] Lấy địa chỉ theo userId (đường dẫn khác)
// URL: http://localhost:3000/address/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const addresses = await addressController.getAddressesByUserId(req.params.userId);
    if (!addresses || addresses.length === 0) {
      return res.status(404).json({ status: false, message: "Không tìm thấy địa chỉ cho user này." });
    }
    const formatted = addresses.map((a) => a.toJSON());
    return res.status(200).json({ status: true, result: formatted });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [GET] Lấy địa chỉ theo ID
// URL: http://localhost:3000/address/:id
router.get('/:id', async (req, res) => {
  try {
    const address = await addressController.getAddressById(req.params.id);
    if (!address) {
      return res.status(404).json({ status: false, message: "Không tìm thấy địa chỉ." });
    }
    return res.status(200).json({ status: true, result: address.toJSON() });
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
