const OrderDetailModel = require('../models/orderDetailModel');

async function addOrderDetail(data) {
  try {
    const { order_id, product_id, quantity } = data;

    if (!order_id || !product_id || !quantity) {
      throw new Error('Thiếu thông tin chi tiết đơn hàng');
    }

    const newDetail = new OrderDetailModel({ order_id, product_id, quantity });
    return await newDetail.save();
  } catch (error) {
    console.error('Lỗi thêm chi tiết đơn hàng:', error.message);
    throw new Error('Lỗi thêm chi tiết đơn hàng');
  }
}

async function getDetailsByOrderId(orderId) {
  try {
    const orderDetails = await OrderDetailModel.find({ order_id: orderId })
      .populate('product_id');

    const BASE_URL = "http://localhost:3000/images/";

    const updatedDetails = orderDetails.map(detail => {
      const product = detail.product_id;

      // Xử lý hình ảnh thành URL đầy đủ
      if (product && Array.isArray(product.images)) {
        product.images = product.images.map(img => {
          // Nếu ảnh đã là URL rồi thì giữ nguyên
          if (img.startsWith("http")) return img;
          return BASE_URL + img;
        });
      }

      return detail;
    });

    return updatedDetails;
  } catch (error) {
    console.error('Lỗi lấy chi tiết đơn hàng theo ID:', error.message);
    throw new Error('Lỗi lấy chi tiết đơn hàng');
  }
}


async function deleteDetailsByOrderId(orderId) {
  try {
    return await OrderDetailModel.deleteMany({ order_id: orderId });
  } catch (error) {
    console.error('Lỗi xoá chi tiết đơn hàng:', error.message);
    throw new Error('Lỗi xoá chi tiết đơn hàng');
  }
}

module.exports = {addOrderDetail,getDetailsByOrderId,deleteDetailsByOrderId};
