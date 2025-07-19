const OrderDetailModel = require("../models/orderDetailModel");
const mongoose = require("mongoose");

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

async function getDetailsByOrderId(orderId) {
  try {
    const BASE_URL = "http://localhost:3000/images/";

    const details = await OrderDetailModel.aggregate([
      {
        $match: {
          order_id: new mongoose.Types.ObjectId(orderId),
        },
      },
      // Join product
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },

      // Join variant
      {
        $lookup: {
          from: "productvariant",
          localField: "variant_id",
          foreignField: "_id",
          as: "variant",
        },
      },
      { $unwind: { path: "$variant", preserveNullAndEmptyArrays: true } },

      // Join size
      {
        $lookup: {
          from: "size",
          localField: "size_id",
          foreignField: "_id",
          as: "size",
        },
      },
      { $unwind: { path: "$size", preserveNullAndEmptyArrays: true } },

      // Xử lý ảnh thành link đầy đủ
      {
        $addFields: {
          "product.images": {
            $map: {
              input: "$product.images",
              as: "img",
              in: {
                $cond: [
                  { $regexMatch: { input: "$$img", regex: /^http/ } },
                  "$$img",
                  { $concat: [BASE_URL, "$$img"] },
                ],
              },
            },
          },
        },
      },

      // Format dữ liệu trả về
      {
        $project: {
          _id: 0,
          order_id: "$order_id",
          product_id: "$product._id",
          name: "$product.name",
          images: "$product.images",
          price: "$product.price",
          quantity: "$quantity",
          variant: "$variant",
          size: "$size",
        },
      },
    ]);

    return details;
  } catch (error) {
    console.error("Lỗi lấy chi tiết đơn hàng theo ID:", error.message);
    throw new Error("Lỗi lấy chi tiết đơn hàng");
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
  getDetailsByOrderId,
  deleteDetailsByOrderId,
};
