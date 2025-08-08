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
      isHidden,
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
      isHidden: isHidden ?? false,
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
    const keywordRegex =
      ".*" + nameKeyword.trim().split(/\s+/).join(".*") + ".*";
    const regex = new RegExp(keywordRegex, "i");

    const products = await productsModel
      .find({
        name: { $regex: regex },
      })
      .lean();

    const baseUrl = "http://localhost:3000/images/";

    // Lấy danh sách product_id để fetch variant
    const productIds = products.map((p) => p._id);
    const variantsDocs = await productVariantModel
      .find({
        product_id: { $in: productIds },
      })
      .lean();

    const updatedProducts = products.map((product) => {
      // Chuẩn hóa ảnh
      if (Array.isArray(product.images)) {
        product.images = product.images.map((img) =>
          img.startsWith("http") ? img : baseUrl + img
        );
      }
      // Tìm document chứa variants tương ứng
      const match = variantsDocs.find(
        (v) => v.product_id.toString() === product._id.toString()
      );
      product.variants = match?.variants || [];

      return product;
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

function removeVietnameseTones(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

async function filterFromList(productList, filters) {
  try {
    const { sort, size, color, minPrice, maxPrice } = filters;

    // Bước 1: Lọc sản phẩm hợp lệ
    let products = [...productList].filter(
      (p) => p && typeof p.price === "number"
    );

    // Bước 2: Lọc theo khoảng giá
    if (minPrice || maxPrice) {
      products = products.filter((p) => {
        if (minPrice && p.price < parseFloat(minPrice)) return false;
        if (maxPrice && p.price > parseFloat(maxPrice)) return false;
        return true;
      });
    }

    // Bước 3: Lọc theo color và size trong variants
    if (color || size) {
      products = products
        .map((product) => {
          if (!Array.isArray(product.variants)) return null;

          // Lọc variants phù hợp
          const filteredVariants = product.variants.filter((variant) => {
            const matchColor =
              !color ||
              removeVietnameseTones(variant.color || "").includes(
                removeVietnameseTones(color)
              );
            const matchSize =
              !size || variant.sizes?.some((s) => s.size === size);
            return matchColor && matchSize;
          });

          if (filteredVariants.length === 0) return null;

          return {
            ...product,
            variants: filteredVariants.map((variant) => {
              const newSizes = size
                ? variant.sizes?.filter((s) => s.size === size)
                : variant.sizes;

              return {
                ...variant,
                sizes: newSizes,
              };
            }),
          };
        })
        .filter(Boolean); // Loại bỏ null
    }

    // Bước 4: Sắp xếp
    switch (sort) {
      case "price_asc":
        products.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        products.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        products.sort((a, b) => new Date(b.create_at) - new Date(a.create_at));
        break;
    }

    // Bước 5: Thêm base URL vào hình ảnh nếu chưa có
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

    // ✅ Trả về mảng sản phẩm trực tiếp
    return products;
  } catch (error) {
    console.error("Lỗi trong filterFromList:", error);
    throw error; // giữ nguyên để bên ngoài xử lý
  }
}

const updateProductVisibility = async (id, isHidden) => {
  const product = await productsModel.findById(id);
  if (!product) throw new Error("Sản phẩm không tồn tại");

  product.isHidden = isHidden;
  await product.save();

  return { message: "Cập nhật trạng thái hiển thị thành công" };
};
// loc sản phẩm dựa vào salecount bán ít nhất trong khoảng thời gian nhất định
// loc sản phẩm dựa vào salecount bán ít nhất trong khoảng thời gian nhất định
async function getLeastSoldProducts(timePeriod) {
  try {
    const timeMap = {
      week: 7,
      month: 30,
      year: 365
    };

    const days = timeMap[timePeriod];
    if (!days) throw new Error("Invalid time period. Must be 'week', 'month', or 'year'.");

    const dateCondition = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const result = await productVariantModel.aggregate([
      {
        $lookup: {
          from: "products",
          localField: "product_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $match: {
          "product.create_at": { $gte: dateCondition }
        }
      },
      {
        $addFields: {
          total_quantity: {
            $sum: {
              $map: {
                input: "$variants",
                as: "v",
                in: {
                  $sum: "$$v.sizes.quantity"
                }
              }
            }
          }
        }
      },
      {
        $sort: {
          "product.sale_count": 1
        }
      },
      {
        $project: {
          _id: 0,
          product_id: "$product._id",
          total_quantity: 1,
          sale_count: "$product.sale_count",
          name: "$product.name",
          images: "$product.images",
          price: "$product.price",

        }
      }
    ]);
    return result.map(item => ({
      ...item,
      images: item.images.map(img => img.startsWith("http") ? img : `http://localhost:3000/images/${img}`)
    }));
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm bán ít nhất:", error);
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
  updateProductVisibility,
  getLeastSoldProducts,

};
