const Review = require('../models/reviewModel');
const Order = require('../models/orderModel');
const OrderDetail = require('../models/orderDetailModel');

async function addReview(data) {
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

  const review = new Review({ order_id, productdetail_id, user_id, rating, content });
  return await review.save();
}

async function getReviewByProductDetail(productdetail_id) {
  return await Review.find({ productdetail_id }).populate('user_id', 'name');
}

module.exports = {addReview,getReviewByProductDetail
};
