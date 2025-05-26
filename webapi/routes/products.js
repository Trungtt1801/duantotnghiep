const express = require('express');
const router = express.Router();
const productController = require('../mongo/controllers/productsController');
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

        return res.status(200).json({ status: true, result: updatedProducts });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
    }
});


 //http://localhost:3000/products/:id
 
router.get("/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        const result = await productController.getProductById(productId);
        const baseUrl = "http://localhost:3000/images/";

        const updatedProduct = {
            ...result._doc,
            images: result.images?.map(imgName =>
                imgName.startsWith("http") ? imgName : baseUrl + imgName
            )
        };

        return res.status(200).json({ status: true, result: updatedProduct });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
    }
});


 // http://localhost:3000/products/addproduct

router.post("/addproduct", upload.array("images", 10), async (req, res) => {
    try {
        const data = req.body;

        // Parse nested JSON fields from FormData
        const category_id = JSON.parse(data.category_id);
        const variants = JSON.parse(data.variants);

        const images = req.files.map(file => file.filename);

        const newProduct = {
            name: data.name,
            price: Number(data.price),
            sale: Number(data.sale),
            material: data.material,
            category_id,
            variants,
            images
        };

        const result = await productController.addProduct(newProduct);
        return res.status(200).json({ status: true, result });
    } catch (error) {
        console.error("Error adding product:", error);
        return res.status(500).json({ status: false, message: "Lỗi thêm sản phẩm" });
    }
});

module.exports = router;
