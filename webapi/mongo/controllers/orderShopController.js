const mongoose = require("mongoose");
const OrderModel = require("../models/orderModel");
const OrderShopModel = require("../models/orderShopModel"); 
const OrderDetailModel = require("../models/orderDetailModel");
const userModels = require("../models/userModels");

const STATUS = [
  "pending",
  "confirmed",
  "preparing",
  "awaiting_shipment",
  "shipping",
  "delivered",
  "failed",
  "cancelled",
  "refund",
];

// Lấy tất cả OrderShop theo order cha
async function getOrderShopsByOrderId(orderId) {
  return await OrderShopModel.find({ order_id: orderId }).sort({ createdAt: -1 });
}

// Lấy OrderShop theo shop (dành cho seller dashboard)
async function getOrderShopsByShop(shop_id, { status, fromDate, toDate } = {}) {
  const filter = { shop_id };
  if (status) filter.status_order = status;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }
  return await OrderShopModel.find(filter).sort({ createdAt: -1 });
}

// Cập nhật trạng thái đơn con theo shop
async function updateOrderShopStatus(orderShopId, newStatus, note = "") {
  if (!STATUS.includes(newStatus)) throw new Error("Trạng thái không hợp lệ");
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const orderShop = await OrderShopModel.findById(orderShopId).session(session);
    if (!orderShop) throw new Error("Không tìm thấy OrderShop");

    orderShop.status_order = newStatus;
    orderShop.status_history.push({ status: newStatus, updatedAt: new Date(), note });
    await orderShop.save({ session });

    // Nếu tất cả OrderShop đã delivered → cập nhật Order cha là delivered
    const others = await OrderShopModel.find({ order_id: orderShop.order_id }).session(session);
    const allDelivered = others.length > 0 && others.every(os => os.status_order === "delivered");
    if (allDelivered) {
      const order = await OrderModel.findById(orderShop.order_id).session(session);
      if (order) {
        order.status_order = "delivered";
        order.status_history.push({ status: "delivered", updatedAt: new Date(), note: "Tất cả shop đã giao" });
        // Nếu COD và chưa paid → set paid
        if (order.payment_method === "cod" && order.transaction_status !== "paid") {
          order.transaction_status = "paid";
          // Cộng điểm (nếu muốn giữ như controller cũ)
          if (order.user_id) {
            const reward = Math.floor((order.total_price || 0) / 1000);
            const user = await userModels.findById(order.user_id).session(session);
            if (user) {
              user.point = (user.point || 0) + reward;
              await user.save({ session, validateBeforeSave: false });
            }
          }
        }
        await order.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();
    return orderShop;
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
}

// Cập nhật thông tin vận chuyển cho đơn con (seller nhập mã vận đơn, phí ship…)
async function updateOrderShopShipping(orderShopId, { carrier, service_code, tracking_code, fee, eta }) {
  const orderShop = await OrderShopModel.findById(orderShopId);
  if (!orderShop) throw new Error("Không tìm thấy OrderShop");
  orderShop.shipping = orderShop.shipping || {};
  if (carrier !== undefined) orderShop.shipping.carrier = carrier;
  if (service_code !== undefined) orderShop.shipping.service_code = service_code;
  if (tracking_code !== undefined) orderShop.shipping.tracking_code = tracking_code;
  if (fee !== undefined) orderShop.shipping.fee = fee;
  if (eta !== undefined) orderShop.shipping.eta = eta;
  await orderShop.save();
  return orderShop;
}

// Hủy đơn con theo shop (không ảnh hưởng trực tiếp các shop khác)
async function cancelOrderShop(orderShopId, note = "") {
  const orderShop = await OrderShopModel.findById(orderShopId);
  if (!orderShop) throw new Error("Không tìm thấy OrderShop");
  orderShop.status_order = "cancelled";
  orderShop.status_history.push({ status: "cancelled", updatedAt: new Date(), note });
  await orderShop.save();
  return orderShop;
}

module.exports = {
  getOrderShopsByOrderId,
  getOrderShopsByShop,
  updateOrderShopStatus,
  updateOrderShopShipping,
  cancelOrderShop,
};
