var express = require('express');
var router = express.Router();
const cartController = require('../mongo/controllers/cartController')

router.get('/', async(req, res) => {
    try {
        const result = await cartController.getAllCart();
        return res.status(200).json( result );
    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: 'Lỗi lấy dữ liệu giỏ hàng' });
        
    }
})



module.exports = router;
