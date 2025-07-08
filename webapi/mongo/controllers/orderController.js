const orderModel = require("../models/orderModel");
const createZaloPayOrder = require("../untils/zalopay");
const { createVnpayPayment } = require("../untils/vnpay");
const orderDetailModel = require("../models/orderDetailModel");

require("../models/addressModel");

//Lấy tất cả đơn hàng (dành cho admin)
async function getAllOrders() {
  try {
    return await orderModel.find().populate("user_id address_id voucher_id");
  } catch (error) {
    console.error("Lỗi lấy tất cả đơn hàng:", error.message);
    throw new Error("Lỗi khi lấy danh sách đơn hàng");
  }
}

//Lấy đơn hàng theo ID
async function getOrderById(id) {
  try {
    const order = await orderModel
      .findById(id)
      .populate("user_id address_id voucher_id");
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    return order;
  } catch (error) {
    console.error("Lỗi lấy đơn hàng theo ID:", error.message);
    throw new Error(error.message || "Lỗi khi lấy đơn hàng");
  }
}

async function addOrder(data) {
  const {
    user_id,
    address_id,
    voucher_id,
    total_price,
    payment_method,
    products, // [{ productdetail_id, quantity }]
  } = data;

  if (
    !user_id ||
    !total_price ||
    !payment_method ||
    !products ||
    products.length === 0
  ) {
    throw new Error("Thiếu thông tin bắt buộc hoặc thiếu sản phẩm");
  }

  let transaction_code = null;
  let transaction_status = "unpaid";
  let payment_url = null;

  // ZaloPay
  if (payment_method.toLowerCase() === "zalopay") {
    const zaloRes = await createZaloPayOrder(total_price, user_id);
    transaction_code = zaloRes.app_trans_id;
    payment_url = zaloRes.order_url;
  }

  // VNPAY
  if (payment_method.toLowerCase() === "vnpay") {
  const ip = data.ip || "127.0.0.1"; 
  const vnpayRes = await createVnpayPayment(total_price, user_id, ip);
  transaction_code = vnpayRes.transaction_code;
  payment_url = vnpayRes.payment_url;
}


  const newOrder = new orderModel({
    user_id,
    address_id,
    voucher_id,
    total_price,
    payment_method,
    transaction_code,
    transaction_status,
  });

  const savedOrder = await newOrder.save();

  const orderDetails = products.map((item) => ({
    order_id: savedOrder._id,
    productdetail_id: item.productdetail_id,
    quantity: item.quantity,
  }));

  await orderDetailModel.insertMany(orderDetails);

  return {
    status: true,
    message: "Tạo đơn hàng và chi tiết thành công",
    order: savedOrder,
    payment_url,
  };
}

async function deleteOrder(id) {
  try {
    const order = await orderModel.findById(id);
    if (!order) throw new Error("Đơn hàng không tồn tại");
    return await orderModel.findByIdAndDelete(id);
  } catch (error) {
    console.error("Lỗi xóa đơn hàng:", error.message);
    throw new Error(error.message || "Lỗi khi xóa đơn hàng");
  }
}

//Xác nhận đơn hàng
async function confirmOrder(id) {
  try {
    const order = await orderModel.findById(id);
    if (!order) throw new Error("Không tìm thấy đơn hàng");
    if (order.status_order !== "pending") {
      throw new Error("Chỉ đơn hàng ở trạng thái pending mới được xác nhận");
    }
    order.status_order = "confirmed";
    return await order.save();
  } catch (error) {
    console.error("Lỗi xác nhận đơn hàng:", error.message);
    throw new Error(error.message || "Lỗi khi xác nhận đơn hàng");
  }
}

//Cập nhật trạng thái đơn hàng
async function updateOrderStatus(id, status) {
  try {
    const allowed = ["confirmed", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) throw new Error("Trạng thái không hợp lệ");

    const order = await orderModel.findById(id);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    order.status_order = status;
    return await order.save();
  } catch (error) {
    console.error("Lỗi cập nhật trạng thái đơn hàng:", error.message);
    throw new Error(error.message || "Lỗi khi cập nhật trạng thái đơn hàng");
  }
}

//Cập nhật thông tin thanh toán
async function updatePayment(id, { transaction_status, transaction_code }) {
  try {
    const allowed = ["unpaid", "paid", "failed", "refunded"];
    if (!allowed.includes(transaction_status))
      throw new Error("Trạng thái thanh toán không hợp lệ");

    const order = await orderModel.findById(id);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    order.transaction_status = transaction_status;
    if (transaction_code !== undefined) {
      order.transaction_code = transaction_code;
    }

    return await order.save();
  } catch (error) {
    console.error("Lỗi cập nhật thanh toán đơn hàng:", error.message);
    throw new Error(error.message || "Lỗi khi cập nhật thanh toán đơn hàng");
  }
}

//Hủy đơn hàng (người dùng hoặc admin)
async function cancelOrder(id, isAdmin = false) {
  try {
    const order = await orderModel.findById(id);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    if (order.status_order !== "pending" && !isAdmin) {
      throw new Error("Không thể hủy đơn hàng này");
    }

    order.status_order = "cancelled";
    return await order.save();
  } catch (error) {
    console.error("Lỗi hủy đơn hàng:", error.message);
    throw new Error(error.message || "Lỗi khi hủy đơn hàng");
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
      .populate("user_id address_id voucher_id");
  } catch (error) {
    console.error("Lỗi lọc đơn hàng:", error.message);
    throw new Error("Lỗi khi lọc đơn hàng");
  }
}
async function createOrderWithZaloPay(data) {
  try {
    const { user_id, address_id, voucher_id, total_price } = data;

    if (!user_id || !total_price) throw new Error("Thiếu thông tin đơn hàng");

    const zaloResponse = await createZaloPayOrder(
      total_price,
      user_id.toString()
    );

    const newOrder = await orderModel.create({
      user_id,
      address_id,
      voucher_id,
      total_price,
      payment_method: "zalopay",
      transaction_code: zaloResponse.app_trans_id,
      transaction_status: "unpaid",
    });

    return {
      order: newOrder,
      payment_url: zaloResponse.order_url, // link để frontend redirect sang thanh toán
    };
  } catch (error) {
    console.error("Lỗi tạo đơn hàng ZaloPay:", error.message);
    throw new Error("Lỗi tạo đơn hàng thanh toán ZaloPay");
  }
}

async function zaloCallback(data) {
  try {
    const { app_trans_id, status } = data;

    const order = await orderModel.findOne({ transaction_code: app_trans_id });
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    if (status == 1) {
      order.transaction_status = "paid";
      order.status_order = "confirmed";
    } else {
      order.transaction_status = "failed";
    }

    await order.save();
    return { return_code: 1, return_message: "OK" };
  } catch (error) {
    console.error("Zalo Callback Error:", error.message);
    return { return_code: -1, return_message: "Lỗi callback" };
  }
}
async function vnpayCallback(query) {
  const vnp_Params = { ...query };
  const secureHash = vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  const qs = require("qs");
  const crypto = require("crypto");
  const signData = qs.stringify(vnp_Params, { encode: false });
  const signed = crypto
    .createHmac("sha512", process.env.VNP_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  if (secureHash !== signed) throw new Error("Sai checksum");

  const order = await orderModel.findOne({
    transaction_code: vnp_Params["vnp_TxnRef"],
  });
  if (!order) throw new Error("Không tìm thấy đơn hàng");

  order.transaction_status =
    vnp_Params["vnp_ResponseCode"] === "00" ? "paid" : "failed";
  if (vnp_Params["vnp_ResponseCode"] === "00") order.status_order = "confirmed";

  await order.save();
  return { status: true };
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
  createOrderWithZaloPay,
  zaloCallback,
  vnpayCallback,
};
