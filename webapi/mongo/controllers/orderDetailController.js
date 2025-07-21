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
    const order = await OrderModel.findById(orderId);
    if (!order) {
      return {
        status: false,
        message: "Không tìm thấy đơn hàng",
      };
    }

    // 3. Lấy thông tin user
    const user = await User.findById(order.user_id).lean();

    // ✅ Lấy địa chỉ mặc định (is_default) của user
    const address = await AddressModel.findOne({
      user_id: order.user_id,
      is_default: true, // chứ không phải isDefault
    }).lean();

    const userInfo = user
      ? {
          name: user.name,
          email: user.email,
          phone: user.phone,
          address: address
            ? {
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

       

        if (matchedSize) {
          sizeData = {
            _id: matchedSize._id,
            sku: matchedSize.sku,
            quantity: matchedSize.quantity,
          };
        }
      }

      result.push({
        order_id: item.order_id,
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

    // 5. Trả kết quả
    return {
      status: true,
      result,
      user: userInfo,
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

module.exports = {
  addOrderDetail,
  getOrderDetailByOrderId,
  deleteDetailsByOrderId,
};
