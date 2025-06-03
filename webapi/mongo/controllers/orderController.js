const orderModel = require('../models/orderModel');
require('../models/addressModel');
async function getAllOrders() {
  return await orderModel.find().populate('user_id address_id voucher_id');
}

async function getOrderById(id) {
  const order = await orderModel.findById(id).populate('user_id address_id voucher_id');
  if (!order) throw new Error('Không tìm thấy đơn hàng');
  return order;
}

async function addOrder(data) {
  const {
    user_id,
    address_id,
    voucher_id,
    total_price,
    payment_method,
    transaction_code,
    transaction_status
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
    transaction_code,
    transaction_status
  });

  return await newOrder.save();
}

async function deleteOrder(id) {
  const order = await orderModel.findById(id);
  if (!order) throw new Error('Đơn hàng không tồn tại');
  return await orderModel.findByIdAndDelete(id);
}

async function confirmOrder(id) {
  const order = await orderModel.findById(id);
  if (!order) throw new Error('Không tìm thấy đơn hàng');
  if (order.status_order !== 'pending') throw new Error('Chỉ đơn pending mới xác nhận được');
  order.status_order = 'confirmed';
  return await order.save();
}

async function updateOrderStatus(id, status) {
  const allowed = ['confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) throw new Error('Trạng thái không hợp lệ');
  const order = await orderModel.findById(id);
  if (!order) throw new Error('Không tìm thấy đơn hàng');
  order.status_order = status;
  return await order.save();
}

async function updatePayment(id, { transaction_status, transaction_code }) {
  const allowed = ['unpaid', 'paid', 'failed', 'refunded'];
  if (!allowed.includes(transaction_status)) throw new Error('Trạng thái thanh toán không hợp lệ');
  const order = await orderModel.findById(id);
  if (!order) throw new Error('Không tìm thấy đơn hàng');
  order.transaction_status = transaction_status;
  if (transaction_code !== undefined) order.transaction_code = transaction_code;
  return await order.save();
}


async function cancelOrder(id, isAdmin = false) {
  const order = await orderModel.findById(id);
  if (!order) throw new Error('Không tìm thấy đơn hàng');
  if (order.status_order !== 'pending' && !isAdmin) throw new Error('Không thể hủy đơn này');
  order.status_order = 'cancelled';
  return await order.save();
}

async function filterOrders(query) {
  const { user_id, status_order, fromDate, toDate } = query;
  const filter = {};
  if (user_id) filter.user_id = user_id;
  if (status_order) filter.status_order = status_order;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }
  return await orderModel.find(filter)
    .sort({ createdAt: -1 })
    .populate('user_id address_id voucher_id');
}

module.exports = {
  getAllOrders,
  getOrderById,
  addOrder,
  deleteOrder,
  confirmOrder,
  updateOrderStatus,
  updatePayment,
  cancelOrder,
  filterOrders
};
