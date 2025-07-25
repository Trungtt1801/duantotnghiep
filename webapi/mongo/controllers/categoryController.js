const categoriesModel = require("../models/categoryModel");
const productsModel = require("../models/productsModel");

async function getAllCate() {
  try {
    return await categoriesModel.find();
  } catch (error) {
    console.error("Lỗi lấy dữ liệu danh mục:", error.message);
    throw new Error("Lỗi lấy dữ liệu danh mục");
  }
}
async function getParentCategoryBySlug(req, res) {
  try {
    const { slug } = req.params;
    const category = await categoriesModel.findOne({ slug, parentId: null });

    if (!category) {
      return res.status(404).json({ status: false, message: "Không tìm thấy danh mục cha" });
    }

    return res.status(200).json({
      status: true,
      data: {
        id: category._id,
        name: category.name,
        slug: category.slug,
        image: category.image,
        parentId: category.parentId,
      },
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh mục cha theo slug:", error);
    return res.status(500).json({ status: false, message: "Lỗi server" });
  }
}


async function getCateById(id) {
  try {
    const category = await categoriesModel.findById(id);
    if (!category) throw new Error("Danh mục không tồn tại");
    return category;
  } catch (error) {
    console.error("Lỗi lấy chi tiết danh mục:", error.message);
    throw new Error("Lỗi lấy chi tiết danh mục");
  }
}

async function addCate(data) {
    try {
        const { name, slug, parentId,type} = data;
        if (!name) throw new Error('Tên danh mục không được để trống');
        if (!slug) throw new Error('Slug danh mục không được để trống');
        const newCate = new categoriesModel({
            name,
            slug,
            parentId: parentId || null,
            type
        });

    return await newCate.save();
  } catch (error) {
    console.error("Lỗi thêm danh mục:", error.message);
    throw new Error(error.message || "Lỗi thêm danh mục");
  }
}

async function updateCate(id, data) {
    try {
        const { name, slug, parentId, type } = data;
        const category = await categoriesModel.findById(id);
        if (!category) {
            throw new Error('Danh mục không tồn tại');
        }

        category.name = name || category.name;
        category.slug = slug || category.slug;
        category.type = type || category.type;

        if (parentId !== undefined) {
            category.parentId = parentId;
        }

        return await category.save();
    } catch (error) {
        console.error('Lỗi cập nhật danh mục:', error.message);
        throw new Error('Lỗi cập nhật danh mục');
    }
}

async function deleteCate(id) {
  try {
    const cate = await categoriesModel.findById(id);
    if (!cate) throw new Error("Không tìm thấy danh mục");
    const pros = await productsModel.find({ "cate_id.categoryId": id });
    if (pros.length > 0) throw new Error("Danh mục có sản phẩm không thể xóa"); // níu danh mục có sản phẩm thì kh xoá
    const childCates = await categoriesModel.find({ parentId: id });
    if (childCates.length > 0)
      throw new Error("Danh mục có danh mục con, không thể xóa");

    const result = await categoriesModel.findByIdAndDelete(id);
    return result;
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error.message);
    throw new Error("Lỗi xóa danh mục");
  }
}
async function getSubCategories(parentId) {
  try {
    const categories = await categoriesModel.find({ parentId });
    return categories;
  } catch (error) {
    console.error("Lỗi khi lấy danh mục con:", error);
    throw error;
  }
}

async function getParentCategories() {
  try {
    const categories = await categoriesModel.find({ parentId: null });
    return categories;
  } catch (error) {
    console.error("Lỗi khi lấy danh mục cha:", error.message);
    throw new Error("Lỗi khi lấy danh mục cha");
  }
}
async function getCategoryByParentAndChildSlug(parentSlug, childSlug) {
  try {
    // Tìm danh mục cha
    const parent = await categoriesModel.findOne({ slug: parentSlug, parentId: null });
    if (!parent) throw new Error("Không tìm thấy danh mục cha");

    // Tìm danh mục con có slug tương ứng và parentId là danh mục cha
    const child = await categoriesModel.findOne({ slug: childSlug, parentId: parent._id });
    if (!child) throw new Error("Không tìm thấy danh mục con");

    // Trả về thông tin danh mục con
    return {
      id: child._id,
      name: child.name,
      slug: child.slug,
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


module.exports = {
  getCategoryByParentAndChildSlug,
  getAllCate,
  getCateById,
  addCate,
  updateCate,
  deleteCate,
  getSubCategories,
  getParentCategories,
  getParentCategoryBySlug,
 
};
