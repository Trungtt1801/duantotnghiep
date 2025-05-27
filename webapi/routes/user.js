var express = require('express');
var router = express.Router();
const userController = require('../mongo/controllers/userController')

// Lấy toàn bộ người dùng
// GET http://localhost:3000/user/
router.get('/', async (req, res) => {
    try {
        const result = await userController.getAllUsers();
        return res.status(200).json({ status: true, result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi lấy dữ liệu người dùng' });
    }
});

// Đăng ký người dùng 
// POST http://localhost:3000/user/register
router.post('/register', async (req, res) => {
    try {
        const data = req.body;
        console.log('Dữ liệu đăng ký nhận được:', data);
        const result = await userController.register(data);
        return res.status(200).json({ status: true, result });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        return res.status(500).json({ status: false, message: 'Lỗi đăng ký người dùng', error: error.message });
    }
});

// Đăng nhập người dùng
// POST http://localhost:3000/user/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userController.login({ email, password });
        if (!user) {
            return res.status(401).json({ status: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng' });
        }
        return res.status(200).json({ status: true, message: 'Đăng nhập thành công', user });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi đăng nhập', error: error.message });
    }
});

module.exports = router;
