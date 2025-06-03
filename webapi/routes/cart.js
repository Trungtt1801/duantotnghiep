var express = require("express");
var router = express.Router();
const cartController = require("../mongo/controllers/cartController");

router.get("/", async (req, res) => {
  try {
    const result = await cartController.getAllCart();
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu giỏ hàng" });
  }
});
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
module.exports = router;
