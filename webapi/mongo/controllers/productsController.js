const productsModel = require("../models/productsModel");
const productVariantModel = require("../models/productVariantModel");
const categoryModel = require("../models/categoryModel");
const mongoose = require("mongoose");
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

async function addProduct(data) {
  try {
    const {
      name,
      images,
      price,
      sale,
      material,
      variants,
      category_id,
    } = data;

    console.log("Received category_id:", category_id);

    // Tìm danh mục
    const category = await categoryModel.findById(category_id);
    if (!category) {
      throw new Error("Không tìm thấy danh mục!");
    }

    // Tạo sản phẩm mới
    const newProduct = await productsModel.create({
      name,
      images,
      price,
      sale,
      material,
      isHidden: false,
      category_id: {
        categoryName: category.name,
        categoryId: category._id,
      },
    });

    // Thêm biến thể nếu có
    if (variants && variants.length > 0) {
      await productVariantModel.create({
        product_id: newProduct._id,
        variants,
      });
    }

    return {
      message: "Thêm sản phẩm thành công!",
      product: newProduct,
    };
  } catch (error) {
    console.error("Lỗi khi thêm sản phẩm:", error);
    throw error;
  }
}


async function searchProductsByName(nameKeyword) {
  try {
    // Tách từ, chèn .* giữa các từ để tìm linh hoạt
    const keywordRegex = nameKeyword.trim().split(/\s+/).join(".*");

    const regex = new RegExp(keywordRegex, "i");

    const products = await productsModel.find({
      name: { $regex: regex },
    });

    return products;
  } catch (error) {
    console.error("Lỗi khi tìm kiếm sản phẩm theo tên:", error);
    throw error;
  }
}

async function updateProduct(id, data) {
  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("ID không hợp lệ");
    }

    const {
      name,
      price,
      sale,
      material,
      images,
      isHidden,
      category_id,
      variants,
    } = data;

    const product = await productsModel.findById(id);
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm để cập nhật");
    }

    // Cập nhật thông tin danh mục nếu thay đổi
    let categoryInfo = product.category_id;
    if (category_id && category_id !== String(product.category_id.categoryId)) {
      const category = await categoryModel.findById(category_id);
      if (!category) {
        throw new Error("Không tìm thấy danh mục mới!");
      }
      categoryInfo = {
        categoryName: category.name,
        categoryId: category._id,
      };
    }

    // Cập nhật thông tin sản phẩm
    const updatedProduct = await productsModel.findByIdAndUpdate(
      id,
      {
        name,
        price,
        sale,
        material,
        images,
        isHidden,
        category_id: categoryInfo,
      },
      { new: true }
    );

    // Cập nhật variants nếu có
    if (variants && Array.isArray(variants)) {
      await productVariantModel.findOneAndUpdate(
        { product_id: id },
        { variants },
        { upsert: true } // nếu chưa có thì tạo mới
      );
    }

    return {
      message: "Cập nhật sản phẩm thành công!",
      product: updatedProduct,
    };
  } catch (error) {
    console.error("Lỗi khi cập nhật sản phẩm:", error);
    throw error;
  }
}

module.exports = {
  getProducts,
  getProductById,
  addProduct,
  searchProductsByName,
  updateProduct
};
