const express = require("express");
const router = express.Router();
const categoryController = require("../mongo/controllers/categoryController");

// [GET] Lấy tất cả danh mục
// http://localhost:3000/category/
router.get("/", async (req, res) => {
  try {
    const result = await categoryController.getAllCate();
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu danh mục" });
  }
});
// GET /category/parents
router.get("/parents", async (req, res) => {
  try {
    const result = await categoryController.getParentCategories();
    return res.status(200).json([{ status: true }, ...result]);
  } catch (error) {
    console.error("Lỗi lấy danh mục cha:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi server khi lấy danh mục cha",
    });
  }
});
// [GET] Tìm kiếm danh mục 
// http://localhost:3000/search/
router.get('/search', categoryController.filterCategories);

// GET /category/children/:parentId
router.get("/children/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;
    const categories = await categoryController.getSubCategories(parentId);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh mục con" });
  }
});

// [GET] Lấy chi tiết danh mục theo ID
// http://localhost:3000/category/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoryController.getCateById(id);
    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Danh mục không tồn tại" });
    }
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy chi tiết danh mục" });
  }
});

// [POST] Thêm mới danh mục
// http://localhost:3000/category/create
router.post("/create", async (req, res) => {
  try {
    const data = req.body;
    const result = await categoryController.addCate(data);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi thêm danh mục" });
  }
});
router.get("/slug/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await categoryController.getParentCategoryBySlug(slug);

    if (!category) {
      return res.status(404).json({
        status: false,
        message: "Không tìm thấy danh mục cha",
      });
    }

    return res.status(200).json({
      status: true,
      data: category,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh mục cha theo slug:", error.message);
    return res.status(500).json({
      status: false,
      message: "Lỗi server",
    });
  }
});


router.get("/:parentSlug/:childSlug", async (req, res) => {
  const { parentSlug, childSlug } = req.params;

  try {
    const category = await categoryController.getCategoryByParentAndChildSlug(parentSlug, childSlug);
    res.json(category);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});
// File routes/category.js (hoặc tương tự)

// Trong route

// [PUT] Cập nhật danh mục theo ID
// http://localhost:3000/category/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await categoryController.updateCate(id, data);
    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Danh mục không tồn tại" });
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi cập nhật danh mục" });
  }
});


// [DELETE] Xóa danh mục theo ID
// http://localhost:3000/category/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoryController.deleteCate(id);
    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Danh mục không tồn tại" });
    }
    return res
      .status(200)
      .json({ status: true, message: "Xóa danh mục thành công", result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi xóa danh mục" });
  }
});


module.exports = router;
