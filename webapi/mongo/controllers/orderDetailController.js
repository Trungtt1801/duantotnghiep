const OrderDetailModel = require("../models/orderDetailModel");
const Product = require("../models/productsModel");
const ProductVariant = require("../models/productVariantModel");
const OrderModel = require("../models/orderModel");
const User = require("../models/userModels");
const AddressModel = require("../models/addressModel");

async function addOrderDetail(data) {
  try {
    const required = [
      "order_id",
      "order_shop_id",
      "shop_id",
      "product_id",
      "variant_id",
      "size_id",
      "quantity",
    ];

    for (const f of required) {
      if (
        data[f] === undefined ||
        data[f] === null ||
        (typeof data[f] === "string" && data[f].trim() === "")
      ) {
        throw new Error(`Thiếu field bắt buộc: ${f}`);
      }
    }

    const newDetail = new OrderDetailModel({
      order_id: data.order_id,
      order_shop_id: data.order_shop_id,
      shop_id: data.shop_id,
      product_id: data.product_id,
      variant_id: data.variant_id,
      size_id: data.size_id,
      quantity: data.quantity,
    });
    return await newDetail.save();
  } catch (error) {
    console.error("Lỗi thêm chi tiết đơn hàng:", error.message);
    throw new Error("Lỗi thêm chi tiết đơn hàng");
  }
}

async function getOrderDetailByOrderId(orderId) {
  try {
    // 1. Lấy chi tiết đơn hàng
    const orderDetails = await OrderDetailModel.find({ order_id: orderId });
    if (orderDetails.length === 0) {
      return {
        status: false,
        message: "Không tìm thấy chi tiết đơn hàng",
      };
    }

    // 2. Lấy đơn hàng chính
    const order = await OrderModel.findById(orderId).lean();
    if (!order) {
      return {
        status: false,
        message: "Không tìm thấy đơn hàng",
      };
    }

    // 3. Xử lý thông tin user hoặc address_guess
    let userInfo = null;

    if (order.user_id) {
      const user = await User.findById(order.user_id).lean();
      const address = await AddressModel.findById(order.address_id).lean();

      userInfo = user
        ? {
            _id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: address
              ? {
                  _id: address._id,
                  name: address.name,
                  phone: address.phone,
                  address: address.address,
                  detail: address.detail,
                  type: address.type,
                }
              : null,
          }
        : null;
    } else if (order.address_guess) {
      const guessed = order.address_guess;
      userInfo = {
        name: guessed.name,
        email: guessed.email,
        phone: guessed.phone,
        address: {
          name: guessed.name,
          phone: guessed.phone,
          address: guessed.address,
          detail: guessed.detail,
          type: guessed.type,
        },
      };
    }

    // 4. Xử lý chi tiết sản phẩm
    const BASE_URL = "https://fiyo.click/api/images/";
    const result = [];

    for (const item of orderDetails) {
      const [product, variantDoc] = await Promise.all([
        Product.findById(item.product_id).lean(),
        ProductVariant.findOne({ product_id: item.product_id }).lean(),
      ]);

      if (!product) continue;

      let variantData = null;
      let sizeData = null;

      const matchedVariant = variantDoc?.variants?.find(
        (v) => v?._id?.toString() === item?.variant_id?.toString()
      );

      if (matchedVariant) {
        variantData = {
          _id: matchedVariant._id,
          color: matchedVariant.color,
        };

        const matchedSize = matchedVariant.sizes?.find(
          (s) => s?._id?.toString() === item?.size_id?.toString()
        );

        if (matchedSize) {
          sizeData = {
            _id: matchedSize._id,
            sku: matchedSize.sku,
            quantity: matchedSize.quantity,
            size: matchedSize.size,
          };
        }
      }

      const images = Array.isArray(product.images)
        ? product.images.map((img) => (/^http/.test(img) ? img : `${BASE_URL}${img}`))
        : [];

      result.push({
        order_id: item.order_id,
        createdAt: item.createdAt,
        quantity: item.quantity,
        product: {
          product_id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          images,
          variant: variantData,
          size: sizeData,
        },
      });
    }

    // 5. Trả kết quả, thêm status_history
    return {
      status: true,
      result,
      user: userInfo,
      order: {
        payment_method: order.payment_method,
        status_order: order.status_order,
        transaction_status: order.transaction_status || null,
        total_price: order.total_price || 0,
        createdAt: order.createdAt,
        status_history: order.status_history || [],
      },
    };
  } catch (error) {
    console.error("❌ Lỗi khi lấy chi tiết đơn hàng:", error);
    return {
      status: false,
      message: "Lỗi server khi lấy chi tiết đơn hàng",
    };
  }
}

async function deleteDetailsByOrderId(orderId) {
  try {
    return await OrderDetailModel.deleteMany({ order_id: orderId });
  } catch (error) {
    console.error("Lỗi xoá chi tiết đơn hàng:", error.message);
    throw new Error("Lỗi xoá chi tiết đơn hàng");
  }
}

/** Báo cáo: sản phẩm bán ít nhất trong khoảng thời gian */
function parseTimePeriod(tp) {
  // hỗ trợ: 7d, 30d, 90d, 180d, 365d, all
  if (!tp || tp === "30d") return 30;
  if (tp === "7d") return 7;
  if (tp === "90d") return 90;
  if (tp === "180d") return 180;
  if (tp === "365d") return 365;
  if (tp === "all") return null; // không filter thời gian
  return 30;
}

async function getLeastSoldProducts(timePeriod) {
  try {
    const days = parseTimePeriod(timePeriod);
    const match = {};
    if (days) {
      const from = new Date();
      from.setDate(from.getDate() - days);
      match.createdAt = { $gte: from };
    }

    const rows = await OrderDetailModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$product_id",
          total_qty: { $sum: "$quantity" },
        },
      },
      { $sort: { total_qty: 1 } }, // ít nhất trước
      { $limit: 20 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          product_id: "$_id",
          total_qty: 1,
          name: "$product.name",
          price: "$product.price",
          images: "$product.images",
        },
      },
    ]);

    const BASE_URL = "https://fiyo.click/api/images/";

    const result = rows.map((r) => ({
      product_id: r.product_id,
      name: r.name,
      price: r.price,
      total_qty: r.total_qty,
      images: Array.isArray(r.images)
        ? r.images.map((img) => (/^http/.test(img) ? img : `${BASE_URL}${img}`))
        : [],
    }));

    return { status: true, result };
  } catch (error) {
    console.error("Lỗi lấy sản phẩm bán ít nhất:", error.message);
    throw new Error("Lỗi lấy sản phẩm bán ít nhất");
  }
}

module.exports = {
  addOrderDetail,
  getOrderDetailByOrderId,
  deleteDetailsByOrderId,
  getLeastSoldProducts, // ✅ thêm export
};
