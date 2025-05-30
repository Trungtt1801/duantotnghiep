var express = require('express');
var router = express.Router();
const categoryController = require('../mongo/controllers/categoryController');
//http://localhost:3000/category/
router.get('/', async (req, res) => {
    try {
        const result = await categoryController.getAllCate();
        return res.status(200).json( result );
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi lấy dữ liệu danh mục' });
    }
});
//http://localhost:3000/category/
// Lấy chi tiết danh mục theo ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await categoryController.getCateById(id);
        if (!result) {
            return res.status(404).json({ status: false, message: 'Danh mục không tồn tại' });
        }
        return res.status(200).json({ status: true, result});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi lấy chi tiết danh mục' });
    }
});
//http://localhost:3000/category/addcate
// Thêm danh mục
router.post('/addcate', async (req, res) => {
    try {
        const data = req.body;
        const result = await categoryController.addCate(data);
        return res.status(200).json({ status: true, message: 'Thêm danh mục thành công',result});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi thêm danh mục' });
    }
});

// Cập nhật danh mục theo ID
router.put('/updatecate/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const result = await categoryController.updateCate(id, data);
        if (!result) {
            return res.status(404).json({ status: false, message: 'Danh mục không tồn tại' });
        }
        return res.status(200).json({ status: true, message: 'Cập nhật danh mục thành công',result});
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi cập nhật danh mục' });
    }
});

// Xóa danh mục theo ID
router.delete('/deletecate/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await categoryController.deleteCate(id);
        if (!result) {
            return res.status(404).json({ status: false, message: 'Danh mục không tồn tại' });
        }
        return res.status(200).json({ status: true, message: 'Xóa danh mục thành công', result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi xóa danh mục' });
    }
});

module.exports = router;
