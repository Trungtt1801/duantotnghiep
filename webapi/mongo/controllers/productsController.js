const productsModel = require("../models/productsModel");
const productVariantModel = require("../models/productVariantModel");
const mongoose = require("mongoose");

module.exports = {
  getProducts,
  getProductById,
  addProduct,
};

async function getProducts() {
  try {
    const products = await productsModel.find({});
    return products;
  } catch (error) {
    console.log("Lỗi khi lấy sản phẩm:", error);
    throw error;
  }
}

async function getProductById(id) {
  try {
    console.log("Product ID nhận được:", id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("ID không hợp lệ");
    }

    const product = await productsModel.findById(id);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    const objectId = new mongoose.Types.ObjectId(id);
    console.log("ObjectId ép kiểu:", objectId);

    const variants = await productVariantModel.find({
      product_id: objectId,
    });

    console.log("Variants tìm được:", variants);
    return { product, variants };
  } catch (error) {
    console.log("Lỗi khi lấy sản phẩm:", error.message);
    throw error;
  }
}

async function addProduct(req, res) {
  try {
    const { name, images, price, sale, material, category_id } = req.body;

    const newProduct = await productsModel.create({
      name,
      images,
      price,
      sale,
      material,
      category_id,
    });

    res.status(201).json({
      message: "Thêm sản phẩm thành công!",
      product: newProduct,
    });
  } catch (err) {
    console.error("Lỗi khi thêm sản phẩm:", err);
    res.status(500).json({
      message: "Thêm sản phẩm thất bại!",
      error: err.message,
    });
  }
}
