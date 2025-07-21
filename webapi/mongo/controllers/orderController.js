const orderModel = require("../models/orderModel");
const createZaloPayOrder = require("../untils/zalopay");
const { createVnpayPayment } = require("../untils/vnpay");
const orderDetailModel = require("../models/orderDetailModel");
const userModels = require("../models/userModels");

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
    products, // [{ product_id, quantity, image }]
    ip,
  } = data;

  if (
    !user_id ||
    !address_id ||
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

  // 1. Tạo đơn hàng
  const newOrder = new orderModel({
    user_id,
    address_id,
    voucher_id,
    total_price,
    payment_method,
    transaction_status,
  });

  const savedOrder = await newOrder.save();

  // 2. Gọi ZaloPay hoặc VNPAY nếu cần
  if (payment_method.toLowerCase() === "zalopay") {
    const zaloRes = await createZaloPayOrder(
      total_price,
      user_id,
      savedOrder._id.toString()
    );
    transaction_code = zaloRes.app_trans_id;
    payment_url = zaloRes.order_url;
  }

  if (payment_method.toLowerCase() === "vnpay") {
    const ipAddr = ip || "127.0.0.1";
    const vnpayRes = await createVnpayPayment(
      total_price,
      user_id,
      ipAddr,
      savedOrder._id.toString()
    );
    transaction_code = vnpayRes.transaction_code;
    payment_url = vnpayRes.payment_url;
  }

  // 3. Cập nhật mã giao dịch
  await orderModel.findByIdAndUpdate(savedOrder._id, {
    transaction_code,
  });

  // 4. Thêm chi tiết đơn hàng
<<<<<<< HEAD
  console.log("Data body:", data);
  console.log("Products:", data.products);

  const orderDetails = data.products.map((item) => {
    console.log("Chi tiết item:", item);
    return {
      order_id: savedOrder._id,
      product_id: item.product_id,
      image: item.image,
      quantity: item.quantity,
      variant_id: item.variant_id,
    };
  });
=======
  const orderDetails = data.products.map((item) => ({
    order_id: savedOrder._id,
    product_id: item.product_id,
    image: item.image,
    quantity: item.quantity,
    variant_id: item.variant_id,
    size_id: item.size_id,
  }));
>>>>>>> Trung

  await orderDetailModel.insertMany(orderDetails);

  // 🔄 5. Reload lại order để trả về đầy đủ address_id và các field mới nhất
  const updatedOrder = await orderModel.findById(savedOrder._id).lean();

  return {
    status: true,
    message: "Tạo đơn hàng và chi tiết thành công",
    order: { ...updatedOrder, transaction_code },
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
<<<<<<< HEAD
    const { user_id, address_id, voucher_id, total_price, products} = data;
=======
    const { user_id, address_id, voucher_id, total_price, products, size_id } =
      data;
>>>>>>> Trung

    if (!user_id || !total_price || !products || products.length === 0)
      throw new Error("Thiếu thông tin đơn hàng hoặc sản phẩm");

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

    // 👇 Tạo các bản ghi orderDetail
    const orderDetails = products.map((product) => ({
      order_id: newOrder._id,
      product_id: product.product_id,
      variant_id: product.variant_id, // nếu bạn có sử dụng variant
      quantity: product.quantity,
      price: product.price,
    }));

    await orderDetailModel.insertMany(orderDetails);

    return {
      status: true,
      message: "Tạo đơn hàng thành công",
      app_trans_id: zaloResponse.app_trans_id,
      payment_url: zaloResponse.order_url,
      order: newOrder,
    };
  } catch (error) {
    console.error("Lỗi tạo đơn hàng ZaloPay:", error.message);
    throw new Error("Lỗi tạo đơn hàng thanh toán ZaloPay");
  }
}

async function zaloCallback(data) {
  try {
    console.log("📥 Callback nhận được:", data);

    const { app_trans_id, status } = data;

    const order = await orderModel.findOne({ transaction_code: app_trans_id });
    if (!order)
      throw new Error(
        "Không tìm thấy đơn hàng với app_trans_id: " + app_trans_id
      );

    console.log("🔍 Tìm thấy đơn hàng:", order);

    if (status == 1) {
      order.transaction_status = "paid";
      order.status_order = "confirmed";

      const userId =
        typeof order.user_id === "object" && order.user_id !== null
          ? order.user_id._id
          : order.user_id;

      console.log(" Gọi updateUserPoint với userId:", userId);
      await updateUserPoint(userId.toString(), order.total_price);
    } else {
      order.transaction_status = "failed";
    }

    await order.save();
    console.log("Đã lưu đơn hàng sau khi cập nhật trạng thái");

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

  const txnRef = vnp_Params["vnp_TxnRef"];
  const order = await orderModel.findOne({ transaction_code: txnRef });

  if (!order) {
    console.log("❌ Không tìm thấy đơn hàng với mã giao dịch:", txnRef);
    throw new Error("Không tìm thấy đơn hàng");
  }

  console.log("🧾 Đơn hàng tìm được:", order);

  order.transaction_status =
    vnp_Params["vnp_ResponseCode"] === "00" ? "paid" : "failed";

  if (vnp_Params["vnp_ResponseCode"] === "00") {
    order.status_order = "confirmed";

    console.log("🟡 Gọi cộng điểm cho user:", order.user_id);
    console.log("🟡 Tổng tiền cần cộng điểm:", order.total_price);

    await updateUserPoint(order.user_id?.toString(), order.total_price);
  }

  await order.save();
  return { status: true };
}

function getRankByPoint(point) {
  if (point >= 1000000) return "platinum";
  if (point >= 500000) return "gold";
  if (point >= 200000) return "silver";
  return "bronze";
}

async function updateUserPoint(userId, amount) {
  console.log("🟢 Updating point for:", userId, "with amount:", amount);

  const user = await userModels.findById(userId.toString());
  if (!user) {
    console.log("🔴 Không tìm thấy user để cộng điểm");
    return;
  }

  const newPoint = (user.point || 0) + amount;
  const newRank = getRankByPoint(newPoint);

  user.point = newPoint;
  user.rank = newRank;
  await user.save();

  console.log("✅ Updated point:", user.point, "Rank:", user.rank);
}
async function getOrdersByUserId(userId) {
  try {
    const orders = await orderModel
      .find({ user_id: userId })
      .sort({ createdAt: -1 })
      .populate("address_id voucher_id");
    return orders;
  } catch (error) {
    console.error("Lỗi lấy đơn hàng theo user:", error.message);
    throw new Error("Không thể lấy danh sách đơn hàng của người dùng");
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
  createOrderWithZaloPay,
  zaloCallback,
  vnpayCallback,
  updateUserPoint,
  getOrdersByUserId,
};
