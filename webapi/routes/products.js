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

// http://localhost:3000/products/

router.get("/", async (req, res) => {
  try {
    const result = await productController.getProducts();
    const baseUrl = "http://localhost:3000/images/";

    // Lặp qua từng sản phẩm để lấy variant tương ứng
    const updatedProducts = await Promise.all(
      result.map(async (product) => {
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
    console.log(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
  }
});
// http://localhost:3000/products/search?name=Áo
router.get("/search", async (req, res) => {
  const nameKeyword = req.query.name;

  try {
    const results = await productController.searchProductsByName(nameKeyword);
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: "Lỗi server khi tìm kiếm sản phẩm." });
  }
});
//http://localhost:3000/products/:id

router.get("/:id", async (req, res) => {
  try {
    const productId = req.params.id;
    const baseUrl = "http://localhost:3000/images/";

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
      product: updatedProduct,
      variants: updatedVariants,
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu sản phẩm:", error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
  }
});

// http://localhost:3000/products/create
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
      shop_id: 1, // ✅ Thêm dòng này
      description: data.description
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
// http://localhost:3000/products/update/:id
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
      images,
      isHidden,
      category_id: data.category_id,
      variants,
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




module.exports = router;
