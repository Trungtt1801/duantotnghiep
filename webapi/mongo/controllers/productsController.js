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
      shop_id,
      description,
      sale_count,
    } = data;

    if (!mongoose.Types.ObjectId.isValid(category_id)) {
      throw new Error("ID danh mục không hợp lệ!");
    }

    if (!mongoose.Types.ObjectId.isValid(shop_id)) {
      throw new Error("ID của shop không hợp lệ!");
    }

    const category = await categoryModel.findById(category_id);
    if (!category) {
      throw new Error("Không tìm thấy danh mục!");
    }

    const newProduct = await productsModel.create({
      name,
      images,
      price,
      sale,
      material,
      isHidden: false,
      shop_id: data.shop_id || 1, // ✅ giá trị mặc định
      description,
      sale_count: sale_count,
      category_id: {
        categoryName: category.name,
        categoryId: category._id,
      },
    });

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
    // Tách từ khóa tìm kiếm và tạo regex
    const keywordRegex = nameKeyword.trim().split(/\s+/).join(".*");
    const regex = new RegExp(keywordRegex, "i");

    const products = await productsModel.find({
      name: { $regex: regex },
    });

    const baseUrl = "http://localhost:3000/images/";

    const updatedProducts = products.map((product) => {
      const productObj = product.toObject();

      if (Array.isArray(productObj.images)) {
        productObj.images = productObj.images.map((img) =>
          img.startsWith("http") ? img : baseUrl + img
        );
      }

      return productObj;
    });

    return updatedProducts;
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
      shop_id,
      description,
      sale_count,
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
        shop_id,
        description,
        sale_count,
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
async function getProductsByCategoryTree(categoryId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      throw new Error("ID danh mục không hợp lệ");
    }
    const subCategories = await categoryModel.find({ parentId: categoryId });

    // Nếu có danh mục con thì lọc theo chúng, nếu không thì chỉ lọc theo chính nó
    const categoryIds = subCategories.length
      ? subCategories.map((cat) => cat._id)
      : [categoryId];

    const products = await productsModel.find({
      "category_id.categoryId": { $in: categoryIds },
    });

    return products;
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm theo danh mục:", error);
    throw error;
  }
}
async function getRelatedProducts(productId) {
  try {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      throw new Error("ID sản phẩm không hợp lệ");
    }

    const product = await productsModel.findById(productId);
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm");
    }

    const categoryId = product.category_id?.categoryId;
    if (!categoryId) {
      throw new Error("Sản phẩm không có thông tin danh mục");
    }

    const relatedProducts = await productsModel
      .find({
        "category_id.categoryId": categoryId,
        _id: { $ne: productId },
      })
      .limit(12);

    // ✅ Gắn URL ảnh
    const baseUrl = "http://localhost:3000/images/";

    const updatedProducts = relatedProducts.map((product) => {
      const productObj = product.toObject();

      if (Array.isArray(productObj.images)) {
        productObj.images = productObj.images.map((img) =>
          img.startsWith("http") ? img : baseUrl + img
        );
      }

      return productObj;
    });

    return updatedProducts;
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm liên quan:", error);
    throw error;
  }
}

async function filterProducts(query) {
  try {
    const {
      sort,       // price_asc | price_desc | newest
      minPrice,
      maxPrice,
      price,      // Giá cụ thể muốn tìm gần đúng
      size,
      color,
      categoryId  
    } = query;

    const filter = { isHidden: false };

    // lọc theo categoryId (danh mục cha)
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      filter.category = new mongoose.Types.ObjectId(categoryId);
    }

    // Trường hợp người dùng nhập giá cụ thể => tìm giá gần đúng trong khoảng ±100k
    if (price && !minPrice && !maxPrice) {
      const targetPrice = parseFloat(price);
      const range = 100000; // biên độ giá linh hoạt

      filter.price = {
        $gte: targetPrice - range,
        $lte: targetPrice + range,
      };
    }

    // Trường hợp nhập minPrice / maxPrice
    if (minPrice || maxPrice) {
      filter.price = filter.price || {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Lấy danh sách sản phẩm thỏa điều kiện ban đầu
    let products = await productsModel.find(filter).lean();

    // Lọc theo size và color thông qua bảng variant
    if (size || color) {
      const productIds = products.map((p) => p._id);
      const variants = await productVariantModel
        .find({ product_id: { $in: productIds } })
        .lean();

      const matchedIds = new Set();

      variants.forEach((variant) => {
        variant.variants.forEach((v) => {
          const matchColor = !color || v.color === color;
          const matchSize = !size || v.sizes.some((s) => s.size === size);
          if (matchColor && matchSize) {
            matchedIds.add(variant.product_id.toString());
          }
        });
      });

      products = products.filter((p) => matchedIds.has(p._id.toString()));
    }

    // Nếu có 'price' cụ thể => sắp xếp theo độ gần với giá
    if (price) {
      const target = parseFloat(price);
      products.sort((a, b) =>
        Math.abs(a.price - target) - Math.abs(b.price - target)
      );
    } else {
      switch (sort) {
        case "newest":
          products.sort((a, b) => new Date(b.create_at) - new Date(a.create_at));
          break;
        case "price_asc":
          products.sort((a, b) => a.price - b.price);
          break;
        case "price_desc":
          products.sort((a, b) => b.price - a.price);
          break;
      }
    }

    // Cập nhật đường dẫn ảnh
    const baseUrl = "http://localhost:3000/images/";
    products = products.map((product) => {
      const updated = { ...product };
      if (Array.isArray(updated.images)) {
        updated.images = updated.images.map((img) =>
          img.startsWith("http") ? img : baseUrl + img
        );
      }
      return updated;
    });

    return products;
  } catch (error) {
    console.error("Lỗi filterProducts:", error);
    throw error;
  }
}


module.exports = {
  getProducts,
  getProductById,
  addProduct,
  searchProductsByName,
  updateProduct,
  getProductsByCategoryTree,
  getRelatedProducts,
  filterProducts,
};
