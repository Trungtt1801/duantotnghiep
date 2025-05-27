const productsModel = require("../models/productsModel");
const productVariantModel = require("../models/productVariantModel");
const mongoose = require("mongoose");

module.exports = { getProducts, getProductById, addProduct };

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
    console.log("Product ID nhận được:", id); // ✅ log ra id

    const product = await productsModel.findById(id);
    if (!product) {
      throw new Error("Sản phẩm không tồn tại");
    }

    const objectId = new mongoose.Types.ObjectId(id); // ✅ ép kiểu chính xác
    console.log("ObjectId ép kiểu:", objectId);

    const variants = await productVariantModel.find({ product_id: objectId });
    console.log("Variants tìm được:", variants);

    return { product, variants };
  } catch (error) {
    console.log("Lỗi khi lấy sản phẩm:", error); // ✅ hiển thị lỗi cụ thể
    throw error;
  }
}

async function addProduct(req, res) {
  try {
    const { name, images, price, sale, material, category_id, variants } =
      req.body;

    const newProduct = await Product.create({
      name,
      images,
      price,
      sale,
      material,
      category_id,
      variants,
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
