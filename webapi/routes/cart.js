var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

<<<<<<< HEAD
=======
router.post('/addcart', function(req, res, next){
    const { user_id, product_id, quantity, total_price } = req.body;
    
    // Kiểm tra dữ liệu
    if (!user_id || !product_id || !quantity || !total_price) {
        return res.status(400).json({ message: 'Thiếu thông tin giỏ hàng' });
    }
    
    // Tạo mới bản ghi giỏ hàng
    const newCartItem = {
        user_id,
        product_id,
        quantity,
        total_price
    };
    
  
    console.log('Thêm vào giỏ hàng:', newCartItem);
    
    res.status(201).json({
        message: 'Thêm vào giỏ hàng thành công',
        cart: newCartItem
    });
}
)
>>>>>>> Trung
module.exports = router;
