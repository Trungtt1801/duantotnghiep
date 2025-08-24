const mongoose = require("mongoose");
const OrderShop = require("../models/orderShopModel");
const Order = require("../models/orderModel");
const OrderDetail = require("../models/orderDetailModel");
const productvariantModel = require("../models/productVariantModel");

const statusTranslations = {
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

const ALLOWED_STATUS = Object.keys(statusTranslations);

function parsePaging(query) {
  const page = Math.max(parseInt(query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(query.limit || "", 10), 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Đồng bộ trạng thái đơn cha dựa trên trạng thái các OrderShop con
async function syncParentOrderStatus(orderId) {
  const shops = await OrderShop.find({ order_id: orderId }).lean();
  if (!shops.length) return;

  const statuses = shops.map((s) => s.status_order);

  const allDelivered = statuses.every((s) => s === "delivered");
  const allCancelledLike = statuses.every((s) =>
    ["cancelled", "failed", "refund"].includes(s)
  );

  let next = null;
  if (allDelivered) next = "delivered";
  else if (allCancelledLike) next = "cancelled";
  else if (statuses.includes("shipping")) next = "shipping";
  else if (statuses.includes("awaiting_shipment")) next = "awaiting_shipment";
  else if (statuses.includes("preparing")) next = "preparing";
  else if (statuses.includes("confirmed")) next = "confirmed";
  else next = "pending";

  const order = await Order.findById(orderId);
  if (!order) return;

  if (order.status_order !== next) {
    order.status_order = next;
    if (!Array.isArray(order.status_history)) order.status_history = [];
    order.status_history.push({
      status: next,
      updatedAt: new Date(),
      note: `Đồng bộ từ OrderShop → "${statusTranslations[next]}"`,
    });
    await order.save();
  }
}

// [GET] Lấy tất cả OrderShop 
async function getAllOrderShops() {
  return await OrderShop.find()
    .sort({ createdAt: -1 })
    .populate("order_id shop_id");
}

// [GET] Lọc OrderShop theo query
async function filterOrderShops(query) {
  const { shop_id, status, fromDate, toDate } = query;
  const { skip, limit, page } = parsePaging(query);

  const filter = {};
  if (shop_id) filter.shop_id = shop_id;
  if (status) filter.status_order = status;
  if (fromDate || toDate) {
    filter.createdAt = {};
    if (fromDate) filter.createdAt.$gte = new Date(fromDate);
    if (toDate) filter.createdAt.$lte = new Date(toDate);
  }

  const [items, total] = await Promise.all([
    OrderShop.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("order_id shop_id"),
    OrderShop.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  };
}

// [GET] Lấy OrderShop theo shop (seller)
async function getOrderShopsByShopId(shopId, query = {}) {
  const { skip, limit, page } = parsePaging(query);
  const filter = { shop_id: shopId };
  if (query.status) filter.status_order = query.status;

  const [items, total] = await Promise.all([
    OrderShop.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("order_id shop_id"),
    OrderShop.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  };
}

// ✅ [GET] Lấy OrderShop theo order cha (hay dùng ở trang chi tiết đơn)
async function getOrderShopsByOrderId(orderId, query = {}) {
  const { skip, limit, page } = parsePaging(query);
  const filter = { order_id: orderId };
  if (query.status) filter.status_order = query.status;

  const [items, total] = await Promise.all([
    OrderShop.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("order_id shop_id"),
    OrderShop.countDocuments(filter),
  ]);

  return {
    items,
    page,
    limit,
    total,
    total_pages: Math.ceil(total / limit),
  };
}

// [GET] Lấy 1 OrderShop theo ID
async function getOrderShopById(id) {
  return await OrderShop.findById(id).populate("order_id shop_id");
}

// [GET] Lấy các OrderDetail thuộc một OrderShop
async function getDetailsByOrderShopId(orderShopId) {
  const BASE_URL = "http://localhost:3000/api/images/";

  const details = await OrderDetail.find({ order_shop_id: orderShopId })
    .populate({
      path: "product_id",
      select: "name images price",
    })
    .lean();

  return details.map((d) => ({
    _id: d._id,
    order_id: d.order_id,
    order_shop_id: d.order_shop_id,
    shop_id: d.shop_id,
    quantity: d.quantity,
    variant_id: d.variant_id,
    size_id: d.size_id,
    product: d.product_id
      ? {
          _id: d.product_id._id,
          name: d.product_id.name,
          price: d.product_id.price,
          images: Array.isArray(d.product_id.images)
            ? d.product_id.images.map((img) =>
                /^http/.test(img) ? img : `${BASE_URL}${img}`
              )
            : [],
        }
      : null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));
}

// [PATCH] Cập nhật trạng thái OrderShop
async function updateOrderShopStatus(id, status, note = "") {
  if (!ALLOWED_STATUS.includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }

  const os = await OrderShop.findById(id);
  if (!os) throw new Error("Không tìm thấy OrderShop");

  os.status_order = status;
  if (!Array.isArray(os.status_history)) os.status_history = [];
  os.status_history.push({
    status,
    updatedAt: new Date(),
    note: note || `Cập nhật trạng thái sang "${statusTranslations[status]}"`,
  });

  await os.save();

  // Đồng bộ trạng thái đơn cha
  await syncParentOrderStatus(os.order_id);

  return os;
}

// [PATCH] Hủy một OrderShop
async function cancelOrderShop(id, note = "") {
  return await updateOrderShopStatus(id, "cancelled", note || "Seller hủy đơn");
}

// [PATCH] Hoàn tiền một OrderShop
async function refundOrderShop(id, note = "") {
  return await updateOrderShopStatus(id, "refund", note || "Hoàn tiền đơn");
}

// [DELETE] Xoá một OrderShop + chi tiết của nó 
async function deleteOrderShop(id) {
  const os = await OrderShop.findById(id);
  if (!os) throw new Error("Không tìm thấy OrderShop");

  await OrderDetail.deleteMany({ order_shop_id: id });
  await OrderShop.findByIdAndDelete(id);

  await syncParentOrderStatus(os.order_id);
  return true;
}

// [PATCH] Xác nhận 1 OrderShop: pending -> preparing
async function confirmOrderShop(orderShopId) {
  // 1) Lấy OrderShop
  const os = await OrderShop.findById(orderShopId);
  if (!os) throw new Error("Không tìm thấy OrderShop");
  if (os.status_order !== "pending") {
    throw new Error("Chỉ OrderShop ở trạng thái pending mới được xác nhận");
  }

  // 2) Trừ tồn (idempotent bằng cờ stock_deducted)
  if (!os.stock_deducted) {
    const items = await OrderDetail.find({ order_shop_id: os._id })
      .select("variant_id size_id quantity")
      .lean();

    if (!items.length) throw new Error("OrderShop không có item để xác nhận");

    for (const it of items) {
      const vId = new mongoose.Types.ObjectId(it.variant_id);
      const sId = new mongoose.Types.ObjectId(it.size_id);

      const upd = await productvariantModel.updateOne(
        {
          "variants._id": vId,
          "variants.sizes._id": sId,
          "variants.sizes.quantity": { $gte: it.quantity },
        },
        {
          $inc: {
            "variants.$[v].sizes.$[s].quantity": -it.quantity,
            // "variants.$[v].sizes.$[s].sold": it.quantity, // mở nếu có field sold
          },
        },
        { arrayFilters: [{ "v._id": vId }, { "s._id": sId }] }
      );

      if (upd.matchedCount === 0 || upd.modifiedCount === 0) {
        throw new Error("Sản phẩm không đủ tồn hoặc không khớp variant/size");
      }
    }

    os.stock_deducted = true;
  }

  // 3) Cập nhật trạng thái + lịch sử
  os.status_order = "preparing";
  os.confirmed_at = new Date();
  if (!Array.isArray(os.status_history)) os.status_history = [];
  os.status_history.push({
    status: "preparing",
    updatedAt: new Date(),
    note: "Xác nhận đơn con: chuyển sang 'Đang chuẩn bị hàng'",
  });

  await os.save({ validateBeforeSave: false });

  // 4) (tuỳ chọn) cập nhật trạng thái item
  // await OrderDetail.updateMany({ order_shop_id: os._id }, { $set: { status: "preparing" } });

  // 5) Đồng bộ trạng thái đơn cha
  await syncParentOrderStatus(os.order_id);

  // 6) Trả về bản đã populate cho FE
  return await OrderShop.findById(orderShopId)
    .populate("order_id", "_id code status_order")
    .populate("shop_id", "_id name avatar");
}


async function confirmAllOrderShopsOfOrder(orderId) {
  const items = await OrderShop.find({ order_id: orderId, status_order: "pending" }).select("_id");
  const results = [];
  for (const os of items) {
    results.push(await confirmOrderShop(os._id));
  }
  return results;
}


module.exports = {
  getAllOrderShops,
  filterOrderShops,
  getOrderShopsByShopId,
  getOrderShopsByOrderId,
  getOrderShopById,
  getDetailsByOrderShopId,
  updateOrderShopStatus,
  cancelOrderShop,
  refundOrderShop,
  deleteOrderShop,
  confirmOrderShop,               
  confirmAllOrderShopsOfOrder,      
};
