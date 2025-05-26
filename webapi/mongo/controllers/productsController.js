const productsModel = require('../models/productsModel');

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
        const product = await productsModel.findById(id);
        if (!product) {
            throw new Error("Sản phẩm không tồn tại");
        }
        return product; 
    } catch (error) {
        console.log("Lỗi khi lấy sản phẩm:", error);
        throw error; 
    }
}
async function addProduct(req, res) {
  try {
    const {
      name,
      images,
      price,
      sale,
      material,
      category_id,
      variants
    } = req.body;

    const newProduct = await Product.create({
      name,
      images,
      price,
      sale,
      material,
      category_id,
      variants
    });

    res.status(201).json({
      message: 'Thêm sản phẩm thành công!',
      product: newProduct
    });
  } catch (err) {
    console.error('Lỗi khi thêm sản phẩm:', err);
    res.status(500).json({
      message: 'Thêm sản phẩm thất bại!',
      error: err.message
    });
  }
}
