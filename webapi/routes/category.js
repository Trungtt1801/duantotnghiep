const express = require("express");
const router = express.Router();
const categoryController = require("../mongo/controllers/categoryController");

const baseUrl = "http://localhost:3000/images/";
const multer = require("multer");

// Multer config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// === ROUTES ===

// [GET] Lấy tất cả danh mục
router.get("/", async (req, res) => {
  try {
    const categories = await categoryController.getAllCate();
    const updatedCategories = categories.map((category) => ({
      _id: category._id,
      name: category.name,
      slug: category.slug,
      parentId: category.parentId,
      type: category.type,
      images: Array.isArray(category.images)
        ? category.images.map((imgName) =>
            imgName.startsWith("http") ? imgName : baseUrl + imgName
          )
        : category.images
        ? [baseUrl + category.images]
        : [],
    }));
    res.status(200).json([{ status: true }, ...updatedCategories]);
  } catch (error) {
    console.error("Lỗi lấy danh mục:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
});

// [GET] Lấy danh mục cha
router.get("/parents", async (req, res) => {
  try {
    const result = await categoryController.getParentCategories();
    const updated = result.map((category) => ({
      ...category,
      images: Array.isArray(category.images)
        ? category.images.map((img) =>
            img.startsWith("http") ? img : baseUrl + img
          )
        : category.images
        ? [baseUrl + category.images]
        : [],
    }));
    res.status(200).json([{ status: true }, ...updated]);
  } catch (error) {
    console.error("Lỗi lấy danh mục cha:", error);
    res.status(500).json({
      status: false,
      message: "Lỗi server khi lấy danh mục cha",
    });
  }
});

// [GET] Tìm kiếm danh mục
router.get("/search", async (req, res) => {
  try {
    const result = await categoryController.filterCategoriesByQuery(req.query);
    res.status(200).json(result);
  } catch (error) {
    console.error("Lỗi tìm kiếm danh mục:", error.message);
    res.status(500).json({ message: "Lỗi server khi tìm kiếm danh mục" });
  }
});

// [GET] Lấy danh mục con theo parentId
router.get("/children/:parentId", async (req, res) => {
  try {
    const { parentId } = req.params;
    const categories = await categoryController.getSubCategories(parentId);
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy danh mục con" });
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

    res.status(200).json({ status: true, data: category });
  } catch (error) {
    console.error("Lỗi khi lấy danh mục cha theo slug:", error.message);
    res.status(500).json({
      status: false,
      message: "Lỗi server",
    });
  }
});
// [GET] Lấy danh mục con qua slug cha & slug con
router.get("/:parentSlug/:childSlug", async (req, res) => {
  const { parentSlug, childSlug } = req.params;
  try {
    const category = await categoryController.getCategoryByParentAndChildSlug(
      parentSlug,
      childSlug
    );
    res.status(200).json(category);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// [GET] Lấy danh mục theo slug cha


// [GET] Lấy chi tiết danh mục theo ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoryController.getCateById(id);
    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Danh mục không tồn tại" });
    }
    res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: false, message: "Lỗi lấy chi tiết danh mục" });
  }
});

// [POST] Thêm mới danh mục
router.post("/create", upload.array("images", 5), async (req, res) => {
  try {
    const { name, slug, parentId, type } = req.body;
    const images = req.files.map((file) => file.filename);

    const data = {
      name,
      slug,
      parentId: parentId || null,
      images,
      type,
    };

    const category = await categoryController.addCate(data);
    res
      .status(200)
      .json({ status: true, message: "Thêm danh mục thành công", category });
  } catch (error) {
    console.error("Lỗi tạo danh mục:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
});

// [PUT] Cập nhật danh mục
router.put("/:id", upload.array("images", 5), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, parentId, type } = req.body;

    // Lấy danh sách ảnh cũ từ req.body (gửi từ frontend)
    let existingImages = [];
    if (req.body.existingImages) {
      existingImages = Array.isArray(req.body.existingImages)
        ? req.body.existingImages
        : [req.body.existingImages]; // nếu chỉ có 1 ảnh
    }

    // Nếu có ảnh mới thì dùng ảnh mới, nếu không thì giữ lại ảnh cũ
    const newImages =
      req.files && req.files.length > 0
        ? req.files.map((file) => file.filename)
        : existingImages;

    const updateData = {
      ...(name && { name }),
      ...(slug && { slug }),
      ...(type && { type }),
      ...(parentId !== undefined && { parentId: parentId || null }),
      images: newImages, // luôn cập nhật images
    };

    const updatedCategory = await categoryController.updateCate(id, updateData);

    if (!updatedCategory) {
      return res
        .status(404)
        .json({ status: false, message: "Danh mục không tồn tại" });
    }

    res.status(200).json({
      status: true,
      message: "Cập nhật danh mục thành công",
      category: updatedCategory,
    });
  } catch (error) {
    console.error("Lỗi cập nhật danh mục:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
});


// [DELETE] Xóa danh mục
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await categoryController.deleteCate(id);

    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Danh mục không tồn tại" });
    }

    res.status(200).json({
      status: true,
      message: "Xóa danh mục thành công",
      result,
    });
  } catch (error) {
    console.error("Lỗi xóa danh mục:", error);
    res.status(500).json({ status: false, message: "Lỗi server" });
  }
});

module.exports = router;
