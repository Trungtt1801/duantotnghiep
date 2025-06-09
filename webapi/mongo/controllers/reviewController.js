const Review = require('../models/reviewModel');
const Order = require('../models/orderModel');
const OrderDetail = require('../models/orderDetailModel');

async function addReview(data) {
    try {
        const { order_id, productdetail_id, user_id, rating, content } = data;

        const order = await Order.findOne({ _id: order_id, user_id });
        if (!order) throw new Error('Không tìm thấy đơn hàng thuộc người dùng');

        if (order.status_order !== 'delivered') {
            throw new Error('Chỉ đơn hàng đã giao mới có thể đánh giá');
        }

        const orderDetail = await OrderDetail.findOne({ order_id, productdetail_id });
        if (!orderDetail) throw new Error('Sản phẩm không thuộc đơn hàng này');

        const existed = await Review.findOne({ order_id, productdetail_id, user_id });
        if (existed) throw new Error('Bạn đã đánh giá sản phẩm này');

        const review = new Review({
            order_id,
            productdetail_id,
            user_id,
            rating,
            content
        });

        return await review.save();
    } catch (error) {
        console.error('Lỗi thêm đánh giá:', error.message);
        throw new Error(error.message || 'Lỗi khi thêm đánh giá');
    }
}

async function getReviewByProductDetail(productdetail_id) {
    try {
        return await Review.find({ productdetail_id });
    } catch (error) {
        console.error('Lỗi lấy đánh giá theo productdetail_id:', error.message);
        throw new Error('Lỗi khi lấy danh sách đánh giá');
    }
}

module.exports = {
    addReview,
    getReviewByProductDetail
};
