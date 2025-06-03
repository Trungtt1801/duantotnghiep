const orderModel = require('../models/orderModel');

async function getAllOrders() {
  try {
    return await orderModel.find().populate('user_id address_id voucher_id');
  } catch (error) {
    console.error('Lỗi lấy danh sách đơn hàng:', error.message);
    throw new Error('Lỗi lấy danh sách đơn hàng');
  }
}

async function getOrderById(id) {
  try {
    const order = await orderModel.findById(id).populate('user_id address_id voucher_id');
    if (!order) throw new Error('Không tìm thấy đơn hàng');
    return order;
  } catch (error) {
    console.error('Lỗi lấy đơn hàng theo ID:', error.message);
    throw new Error('Lỗi lấy đơn hàng');
  }
}

async function createOrder(data) {
  try {
    const {
      user_id,
      address_id,
      voucher_id,
      total_price,
      payment_method,
    } = data;

    if (!user_id || !total_price || !payment_method) {
      throw new Error('Thiếu thông tin bắt buộc');
    }

    const newOrder = new orderModel({
      user_id,
      address_id,
      voucher_id,
      total_price,
      payment_method,
    });

    return await newOrder.save();
  } catch (error) {
    console.error('Lỗi tạo đơn hàng:', error.message);
    throw new Error('Lỗi tạo đơn hàng');
  }
}

async function deleteOrder(id) {
  try {
    const order = await orderModel.findById(id);
    if (!order) throw new Error('Đơn hàng không tồn tại');

    return await orderModel.findByIdAndDelete(id);
  } catch (error) {
    console.error('Lỗi xoá đơn hàng:', error.message);
    throw new Error('Lỗi xoá đơn hàng');
  }
}

async function updateOrderStatus(id, newStatus) {
  try {
    const order = await orderModel.findById(id);
    if (!order) throw new Error('Không tìm thấy đơn hàng');

    order.status_order = newStatus;
    return await order.save();
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái đơn hàng:', error.message);
    throw new Error('Lỗi cập nhật trạng thái đơn hàng');
  }
}

module.exports = {getAllOrders,getOrderById,createOrder,createOrder,updateOrderStatus,
};
