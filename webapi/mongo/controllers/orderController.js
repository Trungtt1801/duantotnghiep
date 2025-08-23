const mongoose = require("mongoose"); 
const orderModel = require("../models/orderModel");
const createZaloPayOrder = require("../untils/zalopay");
const { createVnpayPayment } = require("../untils/vnpay");
const orderDetailModel = require("../models/orderDetailModel");
const productvariantModel = require("../models/productVariantModel");
const OrderShopModel = require("../models/orderShopModel"); 
const Product = require("../models/productsModel");         
const userModels = require("../models/userModels");
const { createVnpayPaymentForGuest } = require("../untils/vnpayForGuest");
require("../models/addressModel");

function toIPv4(ip) {
  if (!ip) return "127.0.0.1";
  const first = String(ip).split(",")[0].trim();
  return first.includes(":") ? "127.0.0.1" : first; // IPv6 -> IPv4
}
function normalizeLocale(loc) {
  const l = String(loc || "vn").toLowerCase();
  return l === "en" ? "en" : "vn";
}


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


async function groupItemsByShop(items) {
  // items: [{ product_id, variant_id, size_id, quantity, image, price? }]
  // -> tránh N+1: fetch tất cả product 1 lần
  const ids = [...new Set(items.map(i => i.product_id?.toString()))];

  const products = await Product.find({ _id: { $in: ids } })
    .select("shop_id name price")
    .lean();

  const prodMap = new Map(products.map(p => [p._id.toString(), p]));

  const byShop = {}; // { shopId: { items: [], subtotal: number } }

  for (const item of items) {
    const pid = item.product_id?.toString();
    const prod = prodMap.get(pid);

    if (!prod || !prod.shop_id) {
      throw new Error(`Sản phẩm ${pid} không có shop_id`);
    }

    const shopId = prod.shop_id.toString();
    if (!byShop[shopId]) byShop[shopId] = { items: [], subtotal: 0 };

    const linePrice = item.price ?? prod.price ?? 0;

    byShop[shopId].items.push({
      ...item,
      _product_name: prod.name,
      _line_price: linePrice,
    });

    byShop[shopId].subtotal += linePrice * (item.quantity || 0);
  }

  return byShop;
}



async function addOrder(data) {
  const {
    user_id,
    address_id,
    voucher_id,
    total_price,
    payment_method,
    products,
    ip,
    locale,
  } = data;

  if (!user_id || !total_price || !payment_method || !products || products.length === 0) {
    throw new Error("Thiếu thông tin bắt buộc hoặc thiếu sản phẩm");
  }

  try {
    let transaction_code = null;
    let transaction_status = "unpaid";
    let payment_url = null;

    // 1) Tạo đơn hàng cha
    const newOrder = new orderModel({
      user_id,
      address_id,
      voucher_id,
      total_price,
      payment_method,
      transaction_status,
      status_order: "pending",
      status_history: [{ status: "pending", updatedAt: new Date(), note: "Khởi tạo đơn" }],
    });

    const savedOrder = await newOrder.save();

    // 2) Nhóm sản phẩm theo shop
    const grouped = await groupItemsByShop(products);

    // 3) Tạo OrderShop cho từng shop
    const orderShopMap = {};
    for (const [shopId, pack] of Object.entries(grouped)) {
      const subtotal = pack.subtotal;
      const shippingFee = 0;
      const discount = 0;
      const total = subtotal + shippingFee - discount;

      const os = await OrderShopModel.create({
        order_id: savedOrder._id,
        shop_id: shopId,
        total_price: total,
        status_order: "pending",
        status_history: [{ status: "pending", updatedAt: new Date(), note: "Đơn con khởi tạo" }],
      });

      orderShopMap[shopId] = os;
    }

    // 4) Lưu OrderDetail
    const detailsPayload = [];
    for (const [shopId, pack] of Object.entries(grouped)) {
      const osId = orderShopMap[shopId]._id;
      for (const item of pack.items) {
        detailsPayload.push({
          order_id: savedOrder._id,
          order_shop_id: osId,
          shop_id: shopId,
          product_id: item.product_id,
          image: item.image,
          quantity: item.quantity,
          variant_id: item.variant_id,
          size_id: item.size_id,
        });
      }
    }
    if (detailsPayload.length) {
      await orderDetailModel.insertMany(detailsPayload);
    }

    // 5) Thanh toán
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
  const ipAddr = toIPv4(ip || "127.0.0.1");
  const vnpLocale = normalizeLocale(locale);       
 const vnpayRes = await createVnpayPayment(
  total_price,
  user_id,
  ipAddr,
  vnpLocale,                       
  process.env.VNP_RETURN_URL        
);

  transaction_code = vnpayRes.transaction_code;
  payment_url = vnpayRes.payment_url;
}

    if (transaction_code) {
      await orderModel.updateOne(
        { _id: savedOrder._id },
        { $set: { transaction_code } }
      );
    }

    console.log("➡️ Final payment URL:", payment_url);
    return {
      status: true,
      message: "Tạo đơn hàng và tách đơn theo shop thành công",
      order: { ...savedOrder.toObject(), transaction_code },
      payment_url,
    };
  } catch (err) {
    console.error("❌ addOrder error:", err.message);
    throw err;
  }
}

async function addOrderForGuest(data) {
  const {
    address_guess, // { name, phone, email, address, type, detail }
    voucher_id,
    total_price,
    payment_method,
    products, // [{ product_id, quantity, image, variant_id, size_id, price? }]
    ip,
    locale,
  } = data;

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

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let transaction_code = null;
    let transaction_status = "unpaid";
    let payment_url = null;

    // 1) Tạo đơn hàng cha
    const newOrder = new orderModel({
      address_guess,
      voucher_id,
      total_price,
      payment_method,
      transaction_status,
      status_order: "unpending",
      status_history: [{ status: "unpending", updatedAt: new Date(), note: "Khởi tạo đơn (guest)" }],
    });
    const savedOrder = await newOrder.save({ session });

    // 2) Nhóm sản phẩm theo shop
    const grouped = await groupItemsByShop(products);

    // 3) Tạo OrderShop cho từng shop (chỉ truyền field có trong schema)
    const orderShopMap = {};
    for (const [shopId, pack] of Object.entries(grouped)) {
      const subtotal = pack.subtotal;
      const shippingFee = 0;
      const discount = 0;
      const total = subtotal + shippingFee - discount;

      const os = await OrderShopModel.create([{
        order_id: savedOrder._id,
        shop_id: shopId,
        total_price: total, // ✅ chỉ field có trong schema
        status_order: "pending",
        status_history: [{ status: "pending", updatedAt: new Date(), note: "Đơn con khởi tạo (guest)" }],
      }], { session });

      orderShopMap[shopId] = os[0];
    }

    // 4) Lưu OrderDetail cho từng shop
    const detailsPayload = [];
    for (const [shopId, pack] of Object.entries(grouped)) {
      const osId = orderShopMap[shopId]._id;
      for (const item of pack.items) {
        detailsPayload.push({
          order_id: savedOrder._id,
          order_shop_id: osId,
          shop_id: shopId,
          product_id: item.product_id,
          image: item.image,
          quantity: item.quantity,
          variant_id: item.variant_id,
          size_id: item.size_id,
          // price: item._line_price,
          // product_name: item._product_name,
        });
      }
    }
    if (detailsPayload.length) {
      await orderDetailModel.insertMany(detailsPayload, { session });
    }

    // 5) Thanh toán
    if (payment_method.toLowerCase() === "zalopay") {
      const zaloRes = await createZaloPayOrder(
        total_price,
        null,
        savedOrder._id.toString()
      );
      transaction_code = zaloRes.app_trans_id;
      payment_url = zaloRes.order_url;
    }

   if (payment_method.toLowerCase() === "vnpay") {
  const clientIP = toIPv4(ip || "127.0.0.1");
  const vnpLocale = normalizeLocale(locale);        // 'vn' | 'en'
const vnpayRes = await createVnpayPaymentForGuest(
  total_price,
  clientIP,
  savedOrder._id.toString(),
  vnpLocale,
  process.env.VNP_RETURN_GUESS_URL   
);

  transaction_code = vnpayRes.transaction_code;
  payment_url = vnpayRes.payment_url;
}


    if (transaction_code) {
      await orderModel.updateOne(
        { _id: savedOrder._id },
        { $set: { transaction_code } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // (Giữ flow gửi email của bạn)
    try {
      const sendOrderConfirmationEmail = require("../untils/sendOrderConfirmationEmail");
      await sendOrderConfirmationEmail(
        address_guess.email,
        savedOrder._id.toString(),
        address_guess.name
      );
    } catch (e) { /* optional */ }

    return {
      status: true,
      message: "Tạo đơn hàng (guest) và tách đơn theo shop thành công",
      order: { ...savedOrder.toObject(), transaction_code },
      payment_url,
    };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ addOrderForGuest error:", err.message);
    throw err;
  }
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
      note: `Cập nhật trạng thái sang "${statusTranslations[status]}"`,
    });

    // Save lại order
    await order.save();

    // ✅ Nếu là COD, trạng thái mới là "delivered" và chưa paid → cập nhật
    if (
      order.payment_method === "cod" &&
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
      size_id: product.size_id, // nếu bạn có sử dụng size
      variant_id: product.variant_id, // nếu bạn có sử dụng variant
      quantity: product.quantity,
      size_id: product.size_id,
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
    if (!Array.isArray(order.status_history)) order.status_history = [];
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
  // sắp xếp đúng thứ tự + chính tả
  if (point >= 5000000) return "diamond";
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
  addOrderForGuest,
  vnpayCallbackForGuest,
  groupItemsByShop
};
