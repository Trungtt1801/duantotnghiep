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
      isHidden, // ✅ Thêm dòng này
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
      isHidden: isHidden ?? false, // ✅ Ưu tiên dùng isHidden từ client, fallback false
      shop_id: shop_id || 1,
      description,
      sale_count,
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

async function filterFromList(productList, query) {
  try {
    const {
      sort,       // price_asc | price_desc | newest
      minPrice,
      maxPrice,
      price,      // Giá cụ thể muốn tìm gần đúng
      size,
      color,
    } = query;

    let products = [...productList]; // clone để không ảnh hưởng list gốc

    // Lọc theo khoảng ±100k nếu có 'price'
    if (price && !minPrice && !maxPrice) {
      const target = parseFloat(price);
      const range = 100000;
      products = products.filter(
        (p) => p.price >= target - range && p.price <= target + range
      );
    }

    // Lọc theo khoảng giá min/max
    if (minPrice || maxPrice) {
      products = products.filter((p) => {
        if (minPrice && p.price < parseFloat(minPrice)) return false;
        if (maxPrice && p.price > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    // Lọc theo size / color trong biến thể (variants)
    if (size || color) {
      products = products.filter((product) => {
        if (!product.variants) return false;
        return product.variants.some((variant) => {
          const matchColor = !color || variant.color === color;
          const matchSize = !size || variant.sizes?.some((s) => s.size === size);
          return matchColor && matchSize;
        });
      });
    }

    // Sắp xếp
    if (price) {
      const target = parseFloat(price);
      products.sort(
        (a, b) => Math.abs(a.price - target) - Math.abs(b.price - target)
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

    // Gắn base URL cho ảnh
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
    console.error("Lỗi filterFromList:", error);
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
  filterFromList,
};
