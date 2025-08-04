const categoriesModel = require("../models/categoryModel");
const productsModel = require("../models/productsModel");
const mongoose = require("mongoose");

const baseUrl = "http://localhost:3000/images/";

// Hàm định dạng đường dẫn ảnh
function formatImages(images) {
  return Array.isArray(images)
    ? images.map((img) => (img.startsWith("http") ? img : baseUrl + img))
    : [];
}

async function getAllCate() {
  try {
    const categories = await categoriesModel.find();
    return categories.map((cate) => ({
      ...cate._doc,
      images: formatImages(cate.images),
    }));
  } catch (error) {
    console.error("Lỗi lấy dữ liệu danh mục:", error.message);
    throw new Error("Lỗi lấy dữ liệu danh mục");
  }
}

async function getParentCategoryBySlug(slug) {
  const category = await categoriesModel.findOne({ slug, parentId: null });
  if (!category) return null;

  return {
    id: category._id,
    name: category.name,
    slug: category.slug,
    images: formatImages(category.images),
    parentId: category.parentId,
  };
}

async function getCateById(id) {
  try {
    const category = await categoriesModel.findById(id);
    if (!category) throw new Error("Danh mục không tồn tại");
    return {
      ...category._doc,
      images: formatImages(category.images),
    };
  } catch (error) {
    console.error("Lỗi lấy chi tiết danh mục:", error.message);
    throw new Error("Lỗi lấy chi tiết danh mục");
  }
}

async function addCate(data) {
  try {
    const { name, slug, parentId, type, images } = data;
    if (!name) throw new Error("Tên danh mục không được để trống");
    if (!slug) throw new Error("Slug danh mục không được để trống");

    const newCate = new categoriesModel({
      name,
      slug,
      images,
      parentId: parentId || null,
      type,
    });

    const saved = await newCate.save();

    return {
      ...saved._doc,
      images: formatImages(saved.images),
    };
  } catch (error) {
    console.error("Lỗi thêm danh mục:", error.message);
    throw new Error(error.message || "Lỗi thêm danh mục");
  }
}

async function updateCate(id, data) {
  try {
    const { name, slug, parentId, type, images } = data;
    const category = await categoriesModel.findById(id);
    if (!category) throw new Error("Danh mục không tồn tại");

    if (name) category.name = name;
    if (slug) category.slug = slug;
    if (type) category.type = type;
    if (images) category.images = images;
    if (parentId !== undefined) category.parentId = parentId;

    const updated = await category.save();

    return {
      ...updated._doc,
      images: formatImages(updated.images),
    };
  } catch (error) {
    console.error("Lỗi cập nhật danh mục:", error.message);
    throw new Error("Lỗi cập nhật danh mục");
  }
}


async function deleteCate(id) {
  try {
    const cate = await categoriesModel.findById(id);
    if (!cate) throw new Error("Không tìm thấy danh mục");

    const pros = await productsModel.find({ "cate_id.categoryId": id });
    if (pros.length > 0)
      throw new Error("Danh mục có sản phẩm không thể xóa");

    const childCates = await categoriesModel.find({ parentId: id });
    if (childCates.length > 0)
      throw new Error("Danh mục có danh mục con, không thể xóa");

    return await categoriesModel.findByIdAndDelete(id);
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error.message);
    throw new Error("Lỗi xóa danh mục");
  }
}

async function getSubCategories(parentId) {
  try {
    const categories = await categoriesModel.find({ parentId });
    return categories.map((cate) => ({
      ...cate._doc,
      images: formatImages(cate.images),
    }));
  } catch (error) {
    console.error("Lỗi khi lấy danh mục con:", error);
    throw error;
  }
}

async function getParentCategories() {
  try {
    const categories = await categoriesModel.find({ parentId: null });
    return categories.map((cate) => ({
      ...cate._doc,
      images: formatImages(cate.images),
    }));
  } catch (error) {
    console.error("Lỗi khi lấy danh mục cha:", error.message);
    throw new Error("Lỗi khi lấy danh mục cha");
  }
}

async function getCategoryByParentAndChildSlug(parentSlug, childSlug) {
  try {
    const parent = await categoriesModel.findOne({ slug: parentSlug, parentId: null });
    if (!parent) throw new Error("Không tìm thấy danh mục cha");

    const child = await categoriesModel.findOne({ slug: childSlug, parentId: parent._id });
    if (!child) throw new Error("Không tìm thấy danh mục con");

    return {
      id: child._id,
      name: child.name,
      slug: child.slug,
      images: formatImages(child.images),
      parent: {
        id: parent._id,
        name: parent.name,
        slug: parent.slug,
      },
    };
  } catch (error) {
    console.error("Lỗi khi lấy danh mục con theo slug cha và con:", error.message);
    throw new Error("Lỗi khi lấy danh mục con theo slug cha và con");
  }
}

// Được refactor lại để không dùng trực tiếp req, res trong controller
async function filterCategoriesByQuery(query) {
  try {
    const { search = "", parentId = "" } = query;
    const filter = {};

    if (search) {
      filter.name = { $regex: search, $options: "i" };
    }

    if (parentId && mongoose.Types.ObjectId.isValid(parentId)) {
      filter.parentId = parentId;
    }

    const result = await categoriesModel.find(filter);
    return result.map((cate) => ({
      ...cate._doc,
      images: formatImages(cate.images),
    }));
  } catch (error) {
    console.error("Lỗi tìm kiếm danh mục:", error.message);
    throw new Error("Lỗi tìm kiếm danh mục");
  }
}

module.exports = {
  getAllCate,
  getCateById,
  addCate,
  updateCate,
  deleteCate,
  getSubCategories,
  getParentCategories,
  getParentCategoryBySlug,
  getCategoryByParentAndChildSlug,
  filterCategoriesByQuery,
};
