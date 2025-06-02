const cartModel = require('../models/cartModel');

async function getAllCart(){
  try {
    return await cartModel.find({})
  } catch (error) {
       console.error('Lỗi lấy dữ liệu giỏ hàng: ', error.message);
        throw new Error('Lỗi lấy dữ liệu giỏ hàng');
  }
}
async function addCart(data) {
  try {
    const { user_id, product_id, quantity } = data;

    if (!user_id || !product_id) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    const newCart = new cartModel({
      user_id,
      product_id,
      quantity: quantity || 1,
    });

    return await newCart.save();
  } catch (error) {
    console.error('Lỗi thêm giỏ hàng:', error.message);
    throw new Error('Lỗi thêm giỏ hàng');
  }
}
async function updateCart(data) {
  try {
    const { user_id, product_id } = data;
    const quantity = Number(data.quantity); // Ép kiểu

    if (!user_id || !product_id || isNaN(quantity)) {
      throw new Error('Dữ liệu không hợp lệ');
    }

    const cartItem = await cartModel.findOne({ user_id, product_id });

    if (!cartItem) {
      throw new Error('Không tìm thấy sản phẩm trong giỏ hàng');
    }

    cartItem.quantity = quantity;
    return await cartItem.save();
  } catch (error) {
    console.error('Lỗi cập nhật giỏ hàng:', error.message);
    throw new Error('Lỗi cập nhật giỏ hàng');
  }
}

 async function deleteCart(id) {
  try {
    const cartItem = await cartModel.findByIdAndDelete(id);
    return cartItem;
  } catch (error) {
    console.log(error);
  }
 }


module.exports = {getAllCart, addCart, updateCart, deleteCart};
