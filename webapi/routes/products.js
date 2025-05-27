const express = require('express');
const router = express.Router();
const productController = require('../mongo/controllers/productsController');
const productVariantModel = require('../mongo/models/productVariantModel')

const multer = require('multer');

// Cấu hình multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './public/images');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage: storage });


 // http://localhost:3000/products/

router.get("/", async (req, res) => {
    try {
        const result = await productController.getProducts();
        const baseUrl = "http://localhost:3000/images/";

        const updatedProducts = result.map((product) => ({
            ...product._doc,
            images: product.images?.map(imgName =>
                imgName.startsWith("http") ? imgName : baseUrl + imgName
            )
        }));

        return res.status(200).json([{ status: true }, ...updatedProducts]);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
    }
});


 //http://localhost:3000/products/:id
 
router.get("/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        const baseUrl = "http://localhost:3000/images/";

        const { product, variants } = await productController.getProductById(productId);

        if (!product) {
            return res.status(404).json({ status: false, message: "Sản phẩm không tồn tại" });
        }

        const updatedProduct = {
            ...(product._doc || product),  // Fix bug khi không có _doc
            images: product.images?.map(imgName =>
                imgName.startsWith("http") ? imgName : baseUrl + imgName
            )
        };

        const updatedVariants = variants.map(variant => ({
            ...(variant._doc || variant),
            ...(variant.image && {
                image: variant.image.startsWith("http") ? variant.image : baseUrl + variant.image
            })
        }));

        return res.status(200).json({
            status: true,
            product: updatedProduct,
            variants: updatedVariants
        });

    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu sản phẩm:", error);
        return res.status(500).json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
    }
});


 // http://localhost:3000/products/addproduct

// router.post("/addproduct", upload.array("images", 10), async (req, res) => {
//     try {
//         const data = req.body;

//         // Parse nested JSON fields from FormData
//         const category_id = JSON.parse(data.category_id);
//         const variants = JSON.parse(data.variants);

//         const images = req.files.map(file => file.filename);

//         const newProduct = {
//             name: data.name,
//             price: Number(data.price),
//             sale: Number(data.sale),
//             material: data.material,
//             category_id,
//             variants,
//             images
//         };

//         const result = await productController.addProduct(newProduct);
//         return res.status(200).json({ status: true, result });
//     } catch (error) {
//         console.error("Error adding product:", error);
//         return res.status(500).json({ status: false, message: "Lỗi thêm sản phẩm" });
//     }
// });

module.exports = router;
