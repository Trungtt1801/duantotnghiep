const OrderDetailModel = require("../models/orderDetailModel");
const Product = require("../models/productsModel");
const ProductVariant = require("../models/productVariantModel");
const OrderModel = require("../models/orderModel");
const User = require("../models/userModels");
const AddressModel = require("../models/addressModel");
const OrderShopModel = require("../models/orderShopModel");

const BASE_URL = "http://localhost:3000/api/images/";

function httpifyImages(images) {
  if (!Array.isArray(images)) return [];
  return images.map((img) =>
    /^https?:\/\//i.test(img) ? img : `${BASE_URL}${img}`
  );
}

// Tìm đúng variant và size theo ID trong tài liệu ProductVariant
function pickVariantAndSize(variantDoc, variantId, sizeId) {
  let variantData = null;
  let sizeData = null;

  const v = variantDoc?.variants?.find(
    (x) => x?._id?.toString() === variantId?.toString()
  );
  if (v) {
    variantData = { _id: v._id, color: v.color };
    const s = v.sizes?.find(
      (x) => x?._id?.toString() === sizeId?.toString()
    );
    if (s) {
      sizeData = {
        _id: s._id,
        sku: s.sku,
        quantity: s.quantity,
        size: s.size,
      };
    }
  }
  return { variantData, sizeData };
}

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


// async function getDetailsByOrderId(orderId) {
//   try {
//     const BASE_URL = "http://localhost:3000/api/images/";

//     const details = await OrderDetailModel.aggregate([
//       {
//         $match: {
//           order_id: new mongoose.Types.ObjectId(orderId),
//         },
//       },
//       // Join product
//       {
//         $lookup: {
//           from: "products",
//           localField: "product_id",
//           foreignField: "_id",
//           as: "product",
//         },
//       },
//       { $unwind: "$product" },

//       // Join variant
//       {
//         $lookup: {
//           from: "productvariant",
//           localField: "variant_id",
//           foreignField: "_id",
//           as: "variant",
//         },
//       },
//       { $unwind: { path: "$variant", preserveNullAndEmptyArrays: true } },

//       // Join size
//       {
//         $lookup: {
//           from: "size",
//           localField: "size_id",
//           foreignField: "_id",
//           as: "size",
//         },
//       },
//       { $unwind: { path: "$size", preserveNullAndEmptyArrays: true } },

//       // Xử lý ảnh thành link đầy đủ
//       {
//         $addFields: {
//           "product.images": {
//             $map: {
//               input: "$product.images",
//               as: "img",
//               in: {
//                 $cond: [
//                   { $regexMatch: { input: "$$img", regex: /^http/ } },
//                   "$$img",
//                   { $concat: [BASE_URL, "$$img"] },
//                 ],
//               },
//             },
//           },
//         },
//       },

//       // Format dữ liệu trả về
//       {
//         $project: {
//           _id: 0,
//           order_id: "$order_id",
//           product_id: "$product._id",
//           name: "$product.name",
//           images: "$product.images",
//           price: "$product.price",
//           quantity: "$quantity",
//           variant: "$variant",
//           size: "$size",
//         },
//       },
//     ]);

//     return details;
//   } catch (error) {
//     console.error("Lỗi lấy chi tiết đơn hàng theo ID:", error.message);
//     throw new Error("Lỗi lấy chi tiết đơn hàng");
//   }
// }

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
        address_guess: {
          name: guessed.name,
          phone: guessed.phone,
          address: guessed.address,
          detail: guessed.detail,
          type: guessed.type,
        },
      };
    }

    // 4. Xử lý chi tiết sản phẩm
    const BASE_URL = "http://localhost:3000/api/images/";
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
        transaction_code: order.transaction_code || null, // 👈 thêm dòng này
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

    const BASE_URL = "http://localhost:3000/api/images/";

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

// helper chuẩn hoá địa chỉ
function shapeAddress(addr) {
  if (!addr) return null;
  return {
    _id: addr._id || null,
    name: addr.name || null,
    phone: addr.phone || null,
    address: addr.address || null,
    detail: addr.detail || null,
    type: addr.type || null,
  };
}

async function getOrderDetailsByOrderShopId(orderShopId) {
  try {
    // 1) Lấy OrderShop + order cha
    const orderShop = await OrderShopModel.findById(orderShopId).lean();
    if (!orderShop) {
      return { status: false, message: "Không tìm thấy OrderShop" };
    }

    const order = await OrderModel.findById(orderShop.order_id).lean();
    if (!order) {
      return { status: false, message: "Không tìm thấy Order cha của OrderShop" };
    }

    // 2) Lấy chi tiết thuộc OrderShop
    const details = await OrderDetailModel.find({ order_shop_id: orderShopId }).lean();
    if (details.length === 0) {
      return { status: false, message: "Không có chi tiết cho OrderShop này" };
    }

    // 3) Batch products & variants
    const productIds = [...new Set(details.map((d) => d.product_id?.toString()))];
    const [products, variantDocs] = await Promise.all([
      Product.find({ _id: { $in: productIds } }).lean(),
      ProductVariant.find({ product_id: { $in: productIds } }).lean(),
    ]);
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const variantMap = new Map(variantDocs.map((v) => [v.product_id.toString(), v]));

    // 4) User/guest info + shipping_address từ order
    let userInfo = null;
    let shippingAddress = null;

    if (order.user_id) {
      const [user, address] = await Promise.all([
        User.findById(order.user_id).lean(),
        AddressModel.findById(order.address_id).lean(),
      ]);
      shippingAddress = shapeAddress(address);

      if (user) {
        userInfo = {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: shippingAddress, // giữ để tương thích
        };
      }
    } else if (order.address_guess) {
      const g = order.address_guess;
      shippingAddress = shapeAddress(g);
      userInfo = {
        name: g.name,
        email: g.email,
        phone: g.phone,
        address: shippingAddress,
      };
    }

    // 5) Build items
    const items = details
      .map((it) => {
        const product = productMap.get(it.product_id?.toString());
        if (!product) return null;

        const vdoc = variantMap.get(it.product_id?.toString());
        const { variantData, sizeData } = pickVariantAndSize(vdoc, it.variant_id, it.size_id);

        return {
          order_id: it.order_id,
          order_shop_id: it.order_shop_id,
          createdAt: it.createdAt,
          quantity: it.quantity,
          product: {
            product_id: product._id,
            name: product.name,
            description: product.description,
            price: product.price,
            images: httpifyImages(product.images),
            variant: variantData,
            size: sizeData,
          },
        };
      })
      .filter(Boolean);

    // 6) Trả về kèm shipping_address
    return {
      status: true,
      order_shop: {
        _id: orderShop._id,
        shop_id: orderShop.shop_id,
        order_id: orderShop.order_id,
        status: orderShop.status_order || orderShop.status,
        total_price: orderShop.total_price,
        createdAt: orderShop.createdAt,
        status_history: orderShop.status_history || [],
      },
      order_parent: {
        _id: order._id,
        payment_method: order.payment_method,
        status_order: order.status_order,
        transaction_status: order.transaction_status || null,
        transaction_code: order.transaction_code || null,
        total_price: order.total_price || 0,
        createdAt: order.createdAt,
        status_history: order.status_history || [],
        address_id: order.address_id || null, // (tuỳ chọn) trả kèm id để debug
      },
      shipping_address: shippingAddress, // 👈 THÊM TRƯỜNG NÀY
      user: userInfo,
      items,
    };
  } catch (err) {
    console.error("❌ Lỗi getOrderDetailsByOrderShopId:", err);
    return { status: false, message: "Lỗi server" };
  }
}




module.exports = {
  addOrderDetail,
  getOrderDetailByOrderId,
  deleteDetailsByOrderId,
  getLeastSoldProducts,
  getOrderDetailsByOrderShopId,
};
