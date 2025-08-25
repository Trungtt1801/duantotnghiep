const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const productController = require("../mongo/controllers/productsController");
const productVariantModel = require("../mongo/models/productVariantModel");
const productsModel = require("../mongo/models/productsModel");



const multer = require("multer");

// Cấu hình multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/images");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage: storage });

// http://localhost:3000/api/products/


router.get("/", async (req, res) => {
  try {
    const result = await productController.getProducts();
    const baseUrl = "http://localhost:3000/api/images/";
   
    const updatedProducts = await Promise.all(
      result.map(async (product) => {
        const variantsDoc = await productVariantModel.findOne({
          product_id: product._id,
        });

        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          sale: product.sale,
          sale_count: product.sale_count,
          material: product.material,
          shop_id: product.shop_id,
          category_id: product.category_id,
          isHidden: product.isHidden,
          create_at: product.create_at,
          images: product.images?.map((imgName) =>
            imgName.startsWith("http") ? imgName : baseUrl + imgName
          ),
          variants: variantsDoc ? variantsDoc.variants : [],
        };

      })
    );
    return res.status(200).json([{ status: true }, ...updatedProducts]);
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
  }
});



// http://localhost:3000/api/products?page=1&limit=10
router.get("/pro", async (req, res) => {
  try {
    const baseUrl = "http://localhost:3000/api/images/";

    // Lấy page & limit từ query, mặc định page=1, limit=10
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Lấy tổng số sản phẩm
    const total = await productsModel.countDocuments();

    // Lấy danh sách sản phẩm có phân trang
    const result = await productsModel.find().skip(skip).limit(limit);

    const updatedProducts = await Promise.all(
      result.map(async (product) => {
        const variantsDoc = await productVariantModel.findOne({
          product_id: product._id,
        });

        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          sale: product.sale,
          sale_count: product.sale_count,
          material: product.material,
          shop_id: product.shop_id,
          category_id: product.category_id,
          isHidden: product.isHidden,
          create_at: product.create_at,
          images: product.images?.map((imgName) =>
            imgName.startsWith("http") ? imgName : baseUrl + imgName
          ),
          variants: variantsDoc ? variantsDoc.variants : [],
        };

      })
    );

    return res.status(200).json({
      status: true,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalItems: total,
      data: updatedProducts,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
  }
});

router.get('/shop/:shopId/category/:categoryId', async (req, res) => {
  try {
    const { shopId, categoryId } = req.params;
    const products = await productController.getProductsByShopAndCategory(shopId, categoryId);
    res.json(products);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.get("/shop/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const products = await productController.getProductsByShop(shopId);
    res.status(200).json({ status: true, products });
  } catch (error) {
    res.status(400).json({ status: false, message: error.message });
  }
});


// http://localhost:3000/api/products/search?name=Áo
router.get("/search", async (req, res) => {
  const nameKeyword = req.query.name;

  try {
    const results = await productController.searchProductsByName(nameKeyword);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi tìm kiếm sản phẩm." });
  }
});
// http://localhost:3000/api/filter
// vidu http://localhost:3000/api/products/filter?size=M
router.post("/filter", async (req, res) => {
  try {
    const { products, filters } = req.body;

    if (!Array.isArray(products)) {
      return res.status(400).json({
        status: false,
        message: "Danh sách sản phẩm phải là một mảng",
      });
    }

    const result = await productController.filterFromList(products, filters);

    return res.status(200).json({
      status: true,
      message: "Lọc sản phẩm thành công",
      data: result,
    });
  } catch (error) {
    console.error("Lỗi lọc sản phẩm:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi server khi lọc sản phẩm",
      error: error.message,
    });
  }
});


//http://localhost:3000/api/products/:id

router.get("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
  const baseUrl = "http://localhost:3000/api/images/";

    const { product, variants } = await productController.getProductById(
      productId
    );

    if (!product) {
      return res
        .status(404)
        .json({ status: false, message: "Sản phẩm không tồn tại" });
    }

    const updatedProduct = {
      ...(product._doc || product),
      images: product.images?.map((imgName) =>
        imgName.startsWith("http") ? imgName : baseUrl + imgName
      ),
    };

    const updatedVariants = variants.map((variant) => ({
      ...(variant._doc || variant),
      ...(variant.image && {
        image: variant.image.startsWith("http")
          ? variant.image
          : baseUrl + variant.image,
      }),
    }));

    return res.status(200).json({
      status: true,
      ...updatedProduct,
      variants: updatedVariants,
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu sản phẩm:", error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
  }
});

// http://localhost:3000/api/products/create
router.post("/create", upload.array("images", 10), async (req, res) => {
  try {
    const data = req.body;

    // Kiểm tra bắt buộc
    if (!data.name || !data.price || !data.category_id) {
      return res.status(400).json({
        status: false,
        message: "Vui lòng điền đầy đủ tên sản phẩm, giá và danh mục!",
      });
    }

    // Parse variants
    let variants = [];
    try {
      variants = data.variants ? JSON.parse(data.variants) : [];
    } catch (err) {
      return res.status(400).json({
        status: false,
        message: "Dữ liệu variants không hợp lệ!",
      });
    }

    // Xử lý images từ multer
    const images = req.files?.length
      ? req.files.map((file) => file.filename)
      : [];

    // Kiểm tra ID danh mục
    if (!mongoose.Types.ObjectId.isValid(data.category_id)) {
      return res.status(400).json({
        status: false,
        message: "ID danh mục không hợp lệ!",
      });
    }

    // Parse isHidden nếu có (nếu không, mặc định là false)
    const isHidden = data.isHidden === "true" || data.isHidden === true;

    // Chuẩn bị dữ liệu gửi qua controller
    const sendData = {
      name: data.name,
      price: Number(data.price),
      sale: Number(data.sale || 0),
      material: data.material || "",
      images,
      variants,
      category_id: data.category_id,
      isHidden,
      shop_id: data.shop_id, // Lấy shop_id từ body
      description: data.description,
      sale_count: Number(data.sale_count || 0),
    };


    const result = await productController.addProduct(sendData);

    return res.status(200).json({
      status: true,
      message: result.message,
      product: result.product,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi thêm sản phẩm",
    });
  }
});
// http://localhost:3000/api/products/update/:id
router.put("/update/:id", upload.array("images", 10), async (req, res) => {
  try {
    const productId = req.params.id;
    const data = req.body;

    // Parse variants
    let variants = [];
    try {
      variants = data.variants ? JSON.parse(data.variants) : [];
    } catch (err) {
      return res.status(400).json({
        status: false,
        message: "Dữ liệu variants không hợp lệ!",
      });
    }

    // Xử lý images từ multer
    const images = req.files?.length
      ? req.files.map((file) => file.filename)
      : data.images || []; // giữ lại ảnh cũ nếu không upload ảnh mới

    const isHidden = data.isHidden === "true" || data.isHidden === true;

    const sendData = {
      name: data.name,
      price: Number(data.price),
      sale: Number(data.sale || 0),
      material: data.material || "",
      description: data.description || "",  // <-- Thêm dòng này
      images,
      isHidden,
      category_id: data.category_id,
      variants,
      sale_count: data.sale_count,
    };


    const result = await productController.updateProduct(productId, sendData);

    return res.status(200).json({
      status: true,
      message: result.message,
      product: result.product,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật sản phẩm:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi cập nhật sản phẩm",
    });
  }
});
// http://localhost:3000/api/products/category/:categoryId
router.get("/category/:categoryId", async (req, res) => {
  try {
    const categoryId = req.params.categoryId;
    const baseUrl = "http://localhost:3000/api/images/";

    const products = await productController.getProductsByCategoryTree(
      categoryId
    );

    const updatedProducts = await Promise.all(
      products.map(async (product) => {
        const variantsDoc = await productVariantModel.findOne({
          product_id: product._id,
        });

        return {
          ...product._doc,
          images: product.images?.map((imgName) =>
            imgName.startsWith("http") ? imgName : baseUrl + imgName
          ),
          variants: variantsDoc ? variantsDoc.variants : [],
        };
      })
    );

    return res.status(200).json([{ status: true }, ...updatedProducts]);
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm theo danh mục:", error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy sản phẩm theo danh mục" });
  }
});
//localhost:3000/products/related/:id
router.get("/related/:id", async (req, res) => {
  try {
    const related = await productController.getRelatedProducts(req.params.id);
    res.json(related);
  } catch (error) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id/visibility", async (req, res) => {
  try {
    const { id } = req.params;
    const parsedIsHidden = req.body.isHidden === "true" || req.body.isHidden === true || req.body.isHidden === 1;

    const result = await productController.updateProductVisibility(id, parsedIsHidden);

    res.status(200).json({ status: true, message: result.message });
  } catch (err) {
    res.status(400).json({ status: false, message: "Không thể cập nhật trạng thái hiển thị" });
  }
});

router.put("/variants/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    const { variants } = req.body;

    const result = await productController.updateProductVariants(productId, variants);

    res.status(200).json({ status: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
});


// [GET] Lấy sản phẩm bán ít theo salecount nhất trong khoảng thời gian nhất định
router.get("/reports/least-sold", async (req, res) => {
  try {
    const { timePeriod } = req.query;
   const result = await productController.getLeastSoldProducts(timePeriod);

    res.status(200).json({ status: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
});

router.get("/shopadmin/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ status: false, message: "ID của shop không hợp lệ" });
    }

    const baseUrl = "http://localhost:3000/api/images/"; // chỉnh theo env nếu cần
    const filter = { shop_id: new mongoose.Types.ObjectId(shopId) }; // ❗ KHÔNG lọc isHidden

    // Lấy toàn bộ sản phẩm của shop (admin xem hết), sort mới → cũ
    const products = await productsModel
      .find(filter)
      .sort({ create_at: -1, _id: -1 })
      .lean();

    // Lấy variants theo lô để tránh N+1
    const productIds = products.map((p) => p._id);
    const variantsDocs = await productVariantModel
      .find({ product_id: { $in: productIds } })
      .lean();

    const variantsMap = new Map(
      variantsDocs.map((v) => [String(v.product_id), v.variants || []])
    );

    const updatedProducts = products.map((p) => ({
      _id: p._id,
      name: p.name,
      description: p.description,
      price: p.price,
      sale: p.sale,
      sale_count: p.sale_count,
      material: p.material,
      shop_id: p.shop_id,
      category_id: p.category_id,
      isHidden: p.isHidden,
      create_at: p.create_at,
      images: (p.images || []).map((img) => (/^https?:/i.test(img) ? img : baseUrl + img)),
      variants: variantsMap.get(String(p._id)) || [],
    }));

    // Giữ nguyên format bạn đang dùng: [ {status:true}, ...items ]
    return res.status(200).json([{ status: true }, ...updatedProducts]);
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm theo shop (admin):", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi lấy sản phẩm theo shop (admin)",
    });
  }
});

router.get("/shop/:shopId", async (req, res) => {
  try {
    const { shopId } = req.params;
    const includeHidden =
      req.query.includeHidden === "true" ||
      req.query.includeHidden === true ||
      req.query.includeHidden === 1;

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return res.status(400).json({ status: false, message: "ID của shop không hợp lệ" });
    }

    const baseUrl = "http://localhost:3000/api/images/";
    const filter = { shop_id: new mongoose.Types.ObjectId(shopId) };
    if (!includeHidden) filter.isHidden = { $ne: true };

    // Lấy toàn bộ sản phẩm của shop (không phân trang), sort mới → cũ
    const result = await productsModel
      .find(filter)
      .sort({ create_at: -1, _id: -1 });

    const updatedProducts = await Promise.all(
      result.map(async (product) => {
        const variantsDoc = await productVariantModel.findOne({
          product_id: product._id,
        });

        return {
          _id: product._id,
          name: product.name,
          description: product.description,
          price: product.price,
          sale: product.sale,
          sale_count: product.sale_count,
          material: product.material,
          shop_id: product.shop_id,
          category_id: product.category_id,
          isHidden: product.isHidden,
          create_at: product.create_at,
          images: product.images?.map((imgName) =>
            String(imgName).startsWith("http") ? imgName : baseUrl + imgName
          ),
          variants: variantsDoc ? variantsDoc.variants : [],
        };
      })
    );

    // Giữ đúng format mảng: [ {status:true}, ...items ]
    return res.status(200).json([{ status: true }, ...updatedProducts]);
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm theo shop:", error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy sản phẩm theo shop" });
  }
});


module.exports = router;
