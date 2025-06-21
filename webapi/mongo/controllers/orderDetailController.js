const OrderDetailModel = require('../models/orderDetailModel');

async function addOrderDetail(data) {
  try {
    const { order_id, productdetail_id, quantity } = data;

    if (!order_id || !productdetail_id || !quantity) {
      throw new Error('Thiếu thông tin chi tiết đơn hàng');
    }

    const newDetail = new OrderDetailModel({ order_id, productdetail_id, quantity });
    return await newDetail.save();
  } catch (error) {
    console.error('Lỗi thêm chi tiết đơn hàng:', error.message);
    throw new Error('Lỗi thêm chi tiết đơn hàng');
  }
}

async function getDetailsByOrderId(orderId) {
  try {
    return await OrderDetailModel.find({ order_id: orderId }).populate('productdetail_id');
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
