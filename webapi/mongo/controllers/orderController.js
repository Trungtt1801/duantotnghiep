const orderModel = require('../models/orderModel');
require('../models/addressModel');

//Lấy tất cả đơn hàng (dành cho admin)
async function getAllOrders() {
    try {
        return await orderModel
            .find()
            .populate('user_id address_id voucher_id')
            .sort({ createdAt: -1 }); //note: ưu tiên đơn mới nhất
    } catch (error) {
        console.error('Lỗi lấy tất cả đơn hàng:', error.message);
        throw new Error('Lỗi khi lấy danh sách đơn hàng');
    }
}

//Lấy đơn hàng theo ID
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

//Thêm đơn hàng mới
async function addOrder(data) {
    try {
        const {
            user_id,address_id,voucher_id,total_price,payment_method,transaction_code,transaction_status} = data;
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
            transaction_status: transaction_status || 'unpaid' //note: Mặc định chưa thanh toán
        });

        return await newOrder.save();
    } catch (error) {
        console.error('Lỗi thêm đơn hàng:', error.message);
        throw new Error(error.message || 'Lỗi khi thêm đơn hàng');
    }
}

//Xóa đơn hàng theo ID
async function deleteOrder(id) {
    try {
        const order = await orderModel.findById(id);
        if (!order) throw new Error('Đơn hàng không tồn tại');
        return await orderModel.findByIdAndDelete(id);
    } catch (error) {
        console.error('Lỗi xóa đơn hàng:', error.message);
        throw new Error(error.message || 'Lỗi khi xóa đơn hàng');
    }
}

//Xác nhận đơn hàng
async function confirmOrder(id) {
    try {
        const order = await orderModel.findById(id);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        if (order.status_order !== 'pending') {
            throw new Error('Chỉ đơn hàng ở trạng thái pending mới được xác nhận');
        }

        order.status_order = 'confirmed';

        //note: nếu là chuyển khoản trạng thái đã thanh toán 
        if (order.payment_method === 'momo') {
            order.transaction_status = 'paid';
        }

        return await order.save();
    } catch (error) {
        console.error('Lỗi xác nhận đơn hàng:', error.message);
        throw new Error(error.message || 'Lỗi khi xác nhận đơn hàng');
    }
}

//Cập nhật trạng thái đơn hàng
async function updateOrderStatus(id, status) {
    try {
        const allowed = ['confirmed', 'shipped', 'delivered', 'failed', 'returned', 'cancelled'];
        if (!allowed.includes(status)) throw new Error('Trạng thái không hợp lệ');

        const order = await orderModel.findById(id);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        const { payment_method, transaction_status, status_order: currentStatus } = order;

        switch (status) {
            case 'delivered':
                //note: chỉ cho chuyển sang delivered nếu momo đã thanh toán
                if (payment_method === 'momo' && transaction_status !== 'paid') {
                    throw new Error('Đơn hàng chuyển khoản phải được thanh toán trước khi giao thành công');
                }
                order.status_order = 'delivered';
                break;

            case 'failed':
                if (currentStatus !== 'shipped') {
                    throw new Error('Chỉ đơn hàng đang giao mới có thể đánh dấu thất bại');
                }
                order.status_order = 'failed';
                break;

            case 'returned':
                if (!['failed', 'delivered'].includes(currentStatus)) {
                    throw new Error('Chỉ đơn hàng giao thất bại hoặc đã giao mới có thể trả về');
                }
                order.status_order = 'returned';
                break;

            default:
                order.status_order = status;
        }

        return await order.save();
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái đơn hàng:', error.message);
        throw new Error(error.message || 'Lỗi khi cập nhật trạng thái đơn hàng');
    }
}

//Cập nhật thông tin thanh toán
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

//Hủy đơn hàng (người dùng hoặc admin)
async function cancelOrder(id, isAdmin = false) {
    try {
        const order = await orderModel.findById(id);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        //note: Người dùng chỉ hủy được khi đang pending
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

//Lọc đơn hàng theo user, trạng thái, ngày
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
    filterOrders,
};
