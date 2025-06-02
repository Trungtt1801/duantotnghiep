const categoriesModel = require("../models/productsModel");
const productVariantModel = require("../models/productVariantModel");
exports.createOrder = async (req, res) => {
  try {
    const {
      user_id,
      address_id,
      voucher_id,
      total_price,
      payment_method,
    } = req.body;

    const newOrder = new Order({
      user_id,
      address_id,
      voucher_id,
      total_price,
      payment_method,
    });

    const savedOrder = await newOrder.save();
    res.status(201).json({ message: 'Tạo đơn hàng thành công', order_id: savedOrder._id });
  } catch (error) {
    res.status(500).json({ error: 'Tạo đơn hàng thất bại' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('user_id address_id voucher_id');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: 'Không lấy được danh sách đơn hàng' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user_id address_id voucher_id');
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi khi lấy đơn hàng' });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: 'Xoá đơn hàng thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Không thể xoá đơn hàng' });
  }
};
