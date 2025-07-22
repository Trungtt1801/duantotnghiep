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

// ✅ Sửa lại: lấy đúng địa chỉ đã chọn khi đặt hàng (không phải mặc định)
const address = await AddressModel.findById(order.address_id).lean();

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

        const matchedSize = matchedVariant.sizes?.find(
          (s) => s?._id?.toString() === item?.size_id?.toString()
        );

        if (matchedSize) {
          sizeData = {
            _id: matchedSize._id,
            size: matchedSize.size,
            sku: matchedSize.sku,
            quantity: matchedSize.quantity,
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
