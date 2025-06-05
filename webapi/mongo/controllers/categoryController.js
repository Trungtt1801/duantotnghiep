const orderModel = require('../models/orderModel');
require('../models/addressModel');

async function getAllOrders() {
    try {
        return await orderModel.find().populate('user_id address_id voucher_id');
    } catch (error) {
        console.error('Lỗi lấy tất cả đơn hàng:', error.message);
        throw new Error('Lỗi khi lấy danh sách đơn hàng');
    }
}

async function getOrderById(id) {
    try {
        const order = await orderModel.findById(id).populate('user_id address_id voucher_id');
        if (!order) throw new Error('Không tìm thấy đơn hàng');
        return order;
    } catch (error) {
        console.error('Lỗi lấy đơn hàng theo ID:', error.message);
        throw new Error(error.message || 'Lỗi khi lấy đơn hàng');
    }
}

async function addOrder(data) {
    try {
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
    } catch (error) {
        console.error('Lỗi thêm đơn hàng:', error.message);
            throw new Error(error.message || 'Lỗi khi thêm đơn hàng');
    }
}

async function deleteOrder(id, isAdmin = false) {
  const order = await orderModel.findById(id);
  if (!order) throw new Error('Đơn hàng không tồn tại');

  if (order.status_order !== 'cancelled') {
    throw new Error('Chỉ có thể xóa đơn hàng đã bị hủy');
  }

  if (!isAdmin) {
    throw new Error('Bạn không có quyền xóa đơn hàng này');
  }

  return await orderModel.findByIdAndDelete(id);
}

async function confirmOrder(id) {
    try {
        const order = await orderModel.findById(id);
        if (!order) throw new Error('Không tìm thấy đơn hàng');
        if (order.status_order !== 'pending') {
            throw new Error('Chỉ đơn hàng ở trạng thái pending mới được xác nhận');
        }
        order.status_order = 'confirmed';
        return await order.save();
    } catch (error) {
        console.error('Lỗi xác nhận đơn hàng:', error.message);
        throw new Error(error.message || 'Lỗi khi xác nhận đơn hàng');
    }
}

async function updateOrderStatus(id, status) {
    try {
        const allowed = ['confirmed', 'shipped', 'delivered', 'cancelled'];
        if (!allowed.includes(status)) throw new Error('Trạng thái không hợp lệ');

        const order = await orderModel.findById(id);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        order.status_order = status;
        return await order.save();
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái đơn hàng:', error.message);
        throw new Error(error.message || 'Lỗi khi cập nhật trạng thái đơn hàng');
    }
}

async function updatePayment(id, { transaction_status, transaction_code }) {
    try {
        const allowed = ['unpaid', 'paid', 'failed', 'refunded'];
        if (!allowed.includes(transaction_status)) throw new Error('Trạng thái thanh toán không hợp lệ');

        const order = await orderModel.findById(id);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        order.transaction_status = transaction_status;
        if (transaction_code !== undefined) {
            order.transaction_code = transaction_code;
        }

        return await order.save();
    } catch (error) {
        console.error('Lỗi cập nhật thanh toán đơn hàng:', error.message);
        throw new Error(error.message || 'Lỗi khi cập nhật thanh toán đơn hàng');
    }
}

async function cancelOrder(id, isAdmin = false) {
    try {
        const order = await orderModel.findById(id);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        if (order.status_order !== 'pending' && !isAdmin) {
            throw new Error('Không thể hủy đơn hàng này');
        }

        order.status_order = 'cancelled';
        return await order.save();
    } catch (error) {
        console.error('Lỗi hủy đơn hàng:', error.message);
        throw new Error(error.message || 'Lỗi khi hủy đơn hàng');
    }
}

async function filterOrders(query) {
    try {
        const { user_id, status_order, fromDate, toDate } = query;
        const filter = {};

        if (user_id) filter.user_id = user_id;
        if (status_order) filter.status_order = status_order;
        if (fromDate || toDate) {
            filter.createdAt = {};
            if (fromDate) filter.createdAt.$gte = new Date(fromDate);
            if (toDate) filter.createdAt.$lte = new Date(toDate);
        }

        return await orderModel
            .find(filter)
            .sort({ createdAt: -1 })
            .populate('user_id address_id voucher_id');
    } catch (error) {
        console.error('Lỗi lọc đơn hàng:', error.message);
        throw new Error('Lỗi khi lọc đơn hàng');
    }
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
