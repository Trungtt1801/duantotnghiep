const cartModel = require('../models/cartModel');

async function getAllCart(){
  try {
    return await cartModel.find({})
  } catch (error) {
       console.error('Lỗi lấy dữ liệu giỏ hàng: ', error.message);
        throw new Error('Lỗi lấy dữ liệu giỏ hàng');
  }
}


module.exports = {getAllCart};
