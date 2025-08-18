const orderModel = require("../models/orderModel");
const createZaloPayOrder = require("../untils/zalopay");
const { createVnpayPayment } = require("../untils/vnpay");
const orderDetailModel = require("../models/orderDetailModel");
const productvariantModel = require("../models/productVariantModel");
const userModels = require("../models/userModels");
const { createVnpayPaymentForGuest } = require("../untils/vnpayForGuest");
require("dotenv").config();

require("../models/addressModel");


const statusTranslations = {
  unpending: "Chưa xác nhận",
  pending: "Đang chờ xử lý",
  confirmed: "Đã xác nhận",
  preparing: "Đang chuẩn bị hàng",
  awaiting_shipment: "Chờ giao hàng",
  shipping: "Đang vận chuyển",
  delivered: "Đã giao hàng",
  failed: "Thất bại",
  cancelled: "Đã hủy",
  refund: "Hoàn tiền",
};
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

  // 1. Tạo đơn hàng trước để lấy _id
  const newOrder = new orderModel({
    user_id,
    address_id,
    voucher_id,
    total_price,
    payment_method,
    transaction_status,
    status_order: "pending",
  });

  const savedOrder = await newOrder.save(); // Có savedOrder._id

  // 2. Gọi tới ZaloPay hoặc VNPAY sau khi có order_id
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
      savedOrder._id.toString() // ✅ truyền thêm orderId
    );
    transaction_code = vnpayRes.transaction_code;
    payment_url = vnpayRes.payment_url;
  }

  // 3. Cập nhật mã giao dịch vào đơn hàng
  await orderModel.findByIdAndUpdate(savedOrder._id, {
    transaction_code,
  });

  // 4. Thêm chi tiết đơn hàng
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
      size_id: item.size_id,
    };
  });

  await orderDetailModel.insertMany(orderDetails);

  // 🔄 5. Reload lại order để trả về đầy đủ address_id và các field mới nhất
  const updatedOrder = await orderModel.findById(savedOrder._id).lean();
  // ✅ In log URL thanh toán VNPAY / ZaloPay tại đây
  console.log("➡️ Final payment URL:", payment_url);

  return {
    status: true,
    message: "Tạo đơn hàng và chi tiết thành công",
    order: { ...savedOrder.toObject(), transaction_code },
    payment_url,
  };
}

async function addOrderForGuest(data) {
  const {
    address_guess, // { name, phone, email, address, type, detail }
    voucher_id,
    total_price,
    payment_method,
    products, // [{ product_id, quantity, image, variant_id }]
    ip,
  } = data;

  async function addOrderForGuest(data) {
    const {
      address_guess, // { name, phone, email, address, type, detail }
      voucher_id,
      total_price,
      payment_method,
      products, // [{ product_id, quantity, image, variant_id }]
      ip,
    } = data;

    // Kiểm tra thông tin bắt buộc
    if (
      !address_guess ||
      !address_guess.name ||
      !address_guess.phone ||
      !address_guess.email ||
      !address_guess.address ||
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
      address_guess,
      voucher_id,
      total_price,
      payment_method,
      transaction_status,
      status_order: "unpending",
    });
    const savedOrder = await newOrder.save();

    // 2. Gọi thanh toán nếu cần
    if (payment_method.toLowerCase() === "zalopay") {
      const zaloRes = await createZaloPayOrder(
        total_price,
        null, // không có user_id
        savedOrder._id.toString()
      );
      transaction_code = zaloRes.app_trans_id;
      payment_url = zaloRes.order_url;
    }

   if (payment_method.toLowerCase() === "vnpay") {
  const clientIP = ip || "127.0.0.1";
  const vnpayRes = await createVnpayPaymentForGuest(
    total_price,
    clientIP,
    savedOrder._id.toString() // dùng order._id làm mã giao dịch
  );
  transaction_code = vnpayRes.transaction_code;
  payment_url = vnpayRes.payment_url;
}


    // 3. Cập nhật mã giao dịch
    await orderModel.findByIdAndUpdate(savedOrder._id, {
      transaction_code,
    });

    // 4. Lưu chi tiết đơn hàng
    const orderDetails = products.map((item) => ({
      order_id: savedOrder._id,
      product_id: item.product_id,
      image: item.image,
      quantity: item.quantity,
      variant_id: item.variant_id,
        size_id: item.size_id,
    }));

    await orderDetailModel.insertMany(orderDetails);
    const sendOrderConfirmationEmail = require("../untils/sendOrderConfirmationEmail");

await sendOrderConfirmationEmail(
  address_guess.email,
  savedOrder._id.toString(),
  address_guess.name
);

    // 5. Lấy lại đơn hàng mới nhất
    const updatedOrder = await orderModel.findById(savedOrder._id).lean();

    return {
      status: true,
      message: "Tạo đơn hàng cho khách vãng lai thành công",
      order: { ...updatedOrder, transaction_code },
      payment_url,
    };
  }

  let transaction_code = null;
  let transaction_status = "unpaid";
  let payment_url = null;

  // 1. Tạo đơn hàng
  const newOrder = new orderModel({
    address_guess,
    voucher_id,
    total_price,
    payment_method,
    transaction_status,
    status_order: "unpending",
  });
  const savedOrder = await newOrder.save();

  // 2. Gọi thanh toán nếu cần
  if (payment_method.toLowerCase() === "zalopay") {
    const zaloRes = await createZaloPayOrder(
      total_price,
      null, // không có user_id
      savedOrder._id.toString()
    );
    transaction_code = zaloRes.app_trans_id;
    payment_url = zaloRes.order_url;
  }

  if (payment_method.toLowerCase() === "vnpay") {
    const clientIP = ip || "127.0.0.1";
    const vnpayRes = await createVnpayPayment(total_price, null, clientIP);
    transaction_code = vnpayRes.transaction_code;
    payment_url = vnpayRes.payment_url;
  }

  // 3. Cập nhật mã giao dịch
  await orderModel.findByIdAndUpdate(savedOrder._id, {
    transaction_code,
  });

  // 4. Lưu chi tiết đơn hàng
  const orderDetails = products.map((item) => ({
    order_id: savedOrder._id,
    product_id: item.product_id,
    image: item.image,
    quantity: item.quantity,
    variant_id: item.variant_id,
    size_id: item.size_id,
  }));

  await orderDetailModel.insertMany(orderDetails);
  const sendOrderConfirmationEmail = require("../untils/sendOrderConfirmationEmail");

  await sendOrderConfirmationEmail(
    address_guess.email,
    savedOrder._id.toString(),
    address_guess.name
  );

  // 5. Lấy lại đơn hàng mới nhất
  const updatedOrder = await orderModel.findById(savedOrder._id).lean();

  return {
    status: true,
    message: "Tạo đơn hàng cho khách vãng lai thành công",
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

    const hasPreparing = order.status_history.some(
      (item) => item.status === "preparing"
    );
    if (hasPreparing) {
      throw new Error("Đơn hàng đã được xác nhận trước đó");
    }

    const orderDetails = await orderDetailModel.find({ order_id: id });

    for (const detail of orderDetails) {
      const variantDoc = await productvariantModel.findOne({
        "variants._id": detail.variant_id,
      });
      if (!variantDoc) {
        throw new Error("Không tìm thấy variant sản phẩm");
      }

      let found = false;
      for (let variant of variantDoc.variants) {
        const sizeItem = variant.sizes.find(
          (s) => s._id.toString() === detail.size_id.toString()
        );

        if (sizeItem) {
          if (sizeItem.quantity < detail.quantity) {
            throw new Error(
              `Sản phẩm màu ${variant.color}, size ${sizeItem.size} không đủ hàng`
            );
          }

          sizeItem.quantity -= detail.quantity;
          found = true;
          break;
        }
      }

      if (!found) {
        throw new Error("Không tìm thấy size tương ứng để cập nhật số lượng");
      }

      await variantDoc.save();
      console.log("💾 Đã cập nhật tồn kho thành công");
    }

    order.status_order = "preparing";
    order.status_history.push({
      status: "preparing",
      updatedAt: new Date(),
      note: "Admin xác nhận đơn hàng, chuyển sang trạng thái chuẩn bị hàng",
    });

    const saved = await order.save();
    console.log("✅ Đã xác nhận đơn hàng thành công:", saved._id);
    return saved;
  } catch (error) {
    console.error("❌ Lỗi xác nhận đơn hàng:", error.message);
    throw new Error(error.message || "Lỗi khi xác nhận đơn hàng");
  }
}

//Cập nhật trạng thái đơn hàng
async function updateOrderStatus(id, status) {
  try {
    const allowed = [
      "preparing",
      "awaiting_shipment",
      "shipping",
      "delivered",
      "failed",
      "cancelled",
      "refund",
    ];

    // Kiểm tra trạng thái hợp lệ
    if (!allowed.includes(status)) throw new Error("Trạng thái không hợp lệ");

    // Tìm đơn hàng
    const order = await orderModel.findById(id);
    console.log("✅ Model:", order.constructor.modelName);
    if (!order) throw new Error("Không tìm thấy đơn hàng");

    // Cập nhật trạng thái
    order.status_order = status;

    console.log(`📝 Đơn hàng ${order._id} cập nhật trạng thái -> ${status}`);

    // Thêm lịch sử trạng thái mới vào mảng
    order.status_history.push({
      status,
      updatedAt: new Date(),
  note: `Cập nhật trạng thái sang "${statusTranslations[status]}"`,    });

    // Save lại order
    await order.save();

    // ✅ Nếu là COD, trạng thái mới là "delivered" và chưa paid → cập nhật
    if (
      order.payment_method === "COD" &&
      status === "delivered" &&
      order.transaction_status !== "paid"
    ) {
      order.transaction_status = "paid";
      console.log("✅ Đã cập nhật translate_status = paid");

      const user = await userModels.findById(order.user_id);
      if (!user) {
        console.warn("⚠️ Không tìm thấy user để cộng điểm");
      } else {
        const rewardPoints = Math.floor(order.total_price / 1000);
        user.point = (user.point || 0) + rewardPoints;

        // Cập nhật user và order cùng lúc
        await user.save({ validateBeforeSave: false });
        await order.save(); // đảm bảo lưu chính xác

        console.log(
          `🎁 Cộng ${rewardPoints} điểm cho user ${user._id} (hiện tại: ${user.point })`
        );
        return order;
      }
    }

    // Trường hợp không vào luồng COD/delivered, vẫn lưu order
    await order.save();
    return order;
  } catch (error) {
    console.error("❌ Lỗi cập nhật trạng thái đơn hàng:", error.message);
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

async function cancelOrder(orderId, isAdmin, reason = "") {
  const order = await orderModel.findById(orderId);
  if (!order) throw new Error("Không tìm thấy đơn hàng");

  // Người dùng chỉ được hủy khi pending
  if (!isAdmin && order.status_order !== "pending") {
    throw new Error("Không thể hủy đơn ở trạng thái này");
  }

  // Cập nhật trạng thái & lý do (nếu có)
  order.status_order = "cancelled";
  if (reason.trim() !== "") {
    order.cancel_reason = reason.trim();
  }

  // Lưu lịch sử
  order.status_history.push({
    status: "cancelled",
    updatedAt: new Date(),
    note: `${isAdmin ? "Admin" : "Người dùng"} hủy đơn${reason ? ` - Lý do: ${reason}` : ""}`
  });

  await order.save();
  return order;
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
    const { user_id, address_id, voucher_id, total_price, products } = data;

    if (!user_id || !total_price || !products || products.length === 0)
      throw new Error("Thiếu thông tin đơn hàng hoặc sản phẩm");

    // 1. Tạo trước đơn hàng để lấy orderId
    const newOrder = await orderModel.create({
      user_id,
      address_id,
      voucher_id,
      total_price,
      payment_method: "zalopay",
      transaction_status: "unpaid",
      status_order: "pending",
    });

    // 2. Gọi createZaloPayOrder với order._id
    const zaloResponse = await createZaloPayOrder(
      total_price,
      user_id.toString(),
      newOrder._id.toString() // 👈 Truyền orderId vào đây
    );
    await orderModel.findByIdAndUpdate(newOrder._id, {
      transaction_code: zaloResponse.app_trans_id, // <- Cập nhật mã giao dịch
    });

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
      order.status_order = "pending";

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
  const crypto = require("crypto");
  const vnp_Params = { ...query };
  const secureHash = vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  // 1. Sắp xếp lại tham số theo thứ tự alphabet
  const sortedParams = Object.keys(vnp_Params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = vnp_Params[key];
      return acc;
    }, {});

  // 2. Encode đúng format VNPAY (dùng encodeURIComponent và thay %20 thành +)
  const signData = Object.entries(sortedParams)
    .map(
      ([key, val]) => `${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`
    )
    .join("&");

  // 3. Tạo HMAC SHA512
  const signed = crypto
    .createHmac("sha512", process.env.VNP_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  // 4. So sánh chữ ký
  if (secureHash !== signed) {
    console.error("❌ Checksum mismatch");
    console.error("Expected:", signed);
    console.error("Received:", secureHash);
    throw new Error("Sai checksum");
  }

  // 5. Xử lý đơn hàng
  const txnRef = vnp_Params["vnp_TxnRef"];
  const order = await orderModel.findOne({ transaction_code: txnRef });

  if (!order) {
    console.log("❌ Không tìm thấy đơn hàng với mã:", txnRef);
    throw new Error("Không tìm thấy đơn hàng");
  }

  console.log("🧾 Đơn hàng tìm được:", order);

  order.transaction_status =
    vnp_Params["vnp_ResponseCode"] === "00" ? "paid" : "failed";

  if (vnp_Params["vnp_ResponseCode"] === "00") {
    order.status_order = "pending";

    const userId =
      typeof order.user_id === "object" && order.user_id !== null
        ? order.user_id._id
        : order.user_id;

    if (userId) {
      await updateUserPoint(userId.toString(), order.total_price);
    }
  }

  await order.save();
  return { status: true };
}

async function vnpayCallbackForGuest(query) {
   const crypto = require("crypto"); 
  const vnp_Params = { ...query };
  const secureHash = vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  // 1. Sắp xếp lại tham số theo thứ tự alphabet
  const sortedParams = Object.keys(vnp_Params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = vnp_Params[key];
      return acc;
    }, {});

  // 2. Encode đúng format VNPAY
  const signData = Object.entries(sortedParams)
    .map(([key, val]) => `${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`)
    .join("&");

  // 3. Tạo HMAC SHA512
  const signed = crypto
    .createHmac("sha512", process.env.VNP_HASH_SECRET)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  // 4. So sánh chữ ký
  if (secureHash !== signed) {
    console.error("❌ Checksum mismatch (guest)");
    throw new Error("Sai checksum");
  }

  // 5. Tìm và xử lý đơn hàng
  const txnRef = vnp_Params["vnp_TxnRef"];
  const order = await orderModel.findOne({ transaction_code: txnRef });

  if (!order) {
    console.log("❌ Không tìm thấy đơn hàng (guest):", txnRef);
    throw new Error("Không tìm thấy đơn hàng");
  }

  console.log("🧾 Đơn hàng khách vãng lai:", order);

  order.transaction_status =
    vnp_Params["vnp_ResponseCode"] === "00" ? "paid" : "failed";

  if (vnp_Params["vnp_ResponseCode"] === "00") {
    order.status_order = "pending";

    order.status_history.push({
      status: "pending",
      updatedAt: new Date(),
      note: "Thanh toán thành công (vãng lai)",
    });
  }

  await order.save();
  return { status: true };
}



function getRankByPoint(point) {
  if (point >= 1000000) return "platinum";
  if (point >= 5000000) return "platinum";
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
  addOrderForGuest,
  vnpayCallbackForGuest
};
