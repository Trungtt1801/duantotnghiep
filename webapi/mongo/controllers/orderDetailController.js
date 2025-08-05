const OrderDetailModel = require("../models/orderDetailModel");
const Product = require("../models/productsModel");
const ProductVariant = require("../models/productVariantModel");
const OrderModel = require("../models/orderModel");
const User = require("../models/userModels");
const AddressModel = require("../models/addressModel");


async function addOrderDetail(data) {
  try {
    const { order_id, product_id, quantity } = data;

    if (!order_id || !product_id || !quantity) {
      throw new Error("Thiếu thông tin chi tiết đơn hàng");
    }

    const newDetail = new OrderDetailModel({ order_id, product_id, quantity });
    return await newDetail.save();
  } catch (error) {
    console.error("Lỗi thêm chi tiết đơn hàng:", error.message);
    throw new Error("Lỗi thêm chi tiết đơn hàng");
  }
}


// async function getDetailsByOrderId(orderId) {
//   try {
//     const BASE_URL = "http://localhost:3000/images/";

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

    // 3. Lấy thông tin user
    const user = await User.findById(order.user_id).lean();

    // ✅ Lấy đúng địa chỉ được chọn khi đặt hàng
    const address = await AddressModel.findById(order.address_id).lean();

    const userInfo = user
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

    // 4. Xử lý chi tiết sản phẩm
    const result = [];

    for (const item of orderDetails) {
      const [product, variantDoc] = await Promise.all([
        Product.findById(item.product_id),
        ProductVariant.findOne({ product_id: item.product_id }),
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

      result.push({
        order_id: item.order_id,
        createdAt: item.createdAt,
        quantity: item.quantity,
        product: {
          product_id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          images: product.images.map(
            (img) => `http://localhost:3000/images/${img}`
          ),
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

async function getLeastSoldProducts(timePeriod = 'week', limit = 10) {
  try {
    const now = new Date();
    let startDate;

    switch (timePeriod) {
      case 'month':
        // Ngày đầu tiên của tháng hiện tại
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        // Ngày đầu tiên của năm hiện tại
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'week':
      default:
        // Ngày đầu tiên của tuần hiện tại (Chủ nhật)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
    }

    const result = await OrderDetailModel.aggregate([
      // Join với collection 'orders' để lấy thông tin createdAt
      {
        $lookup: {
          from: 'orders',
          localField: 'order_id',
          foreignField: '_id',
          as: 'orderInfo',
        },
      },
      { $unwind: '$orderInfo' },
      // Lọc các đơn hàng trong khoảng thời gian đã chọn và không bị hủy
      {
        $match: {
          'orderInfo.createdAt': { $gte: startDate },
          'orderInfo.status_order': { $ne: 'cancelled' }
        },
      },
      // Gom nhóm theo product_id để tính tổng số lượng bán
      {
        $group: {
          _id: '$product_id',
          totalSold: { $sum: '$quantity' },
        },
      },
      // Sắp xếp theo số lượng bán tăng dần (ít bán nhất)
      { $sort: { totalSold: 1 } },
      // Giới hạn số lượng kết quả
      { $limit: limit },
      // Join với collection 'products' để lấy thêm thông tin sản phẩm
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: '$productInfo' },
      // Lựa chọn các trường dữ liệu cần trả về
      {
        $project: {
          product_id: '$_id',
          name: '$productInfo.name',
          stock: '$productInfo.stock', // Lấy số lượng tồn kho
          totalSold: 1,
        },
      },
    ]);

    return result;
  } catch (err) {
    console.error(`Lỗi lấy sản phẩm bán ít trong ${timePeriod}:`, err.message);
    throw new Error(`Không thể lấy sản phẩm bán ít theo ${timePeriod}`);
  }
}
module.exports = {
  addOrderDetail,
  getOrderDetailByOrderId,
  deleteDetailsByOrderId,
  getLeastSoldProducts,
};
