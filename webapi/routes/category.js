var express = require('express');
var router = express.Router();
const categoryController = require('../mongo/controllers/categoryController');

//http://localhost:3000/category/
router.get('/', async (req, res) => {
    try {
        const result = await categoryController.getAllCate();
        return res.status(200).json({ status: true, result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi lấy dữ liệu danh mục' });
    }
});

module.exports = router;
