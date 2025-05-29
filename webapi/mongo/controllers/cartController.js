const Cart = require('../models/cart.model');

const addToCart = async (req, res) => {
  try {
    const { user_id, product_id, quantity, total_price } = req.body;

    // Kiểm tra dữ liệu
    if (!user_id || !product_id || !quantity || !total_price) {
      return res.status(400).json({ message: 'Thiếu thông tin giỏ hàng' });
    }

    // Tạo mới bản ghi cart
    const newCartItem = new Cart({
      user_id,
      product_id,
      quantity,
      total_price
    });

    await newCartItem.save();

    res.status(201).json({
      message: 'Thêm vào giỏ hàng thành công',
      cart: newCartItem
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error: error.message });
  }
};

module.exports = {
  addToCart
};
