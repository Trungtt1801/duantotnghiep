// http://localhost:3000/products/
var express = require('express');
var router = express.Router();
const productController = require('../mongo/controllers/productsController');

router.get("/", async (req, res) => {
    try {
        const result = await productController.getProducts();
        const baseUrl = "http://localhost:3000/images/";

        const updatedProducts = result.map((product) => ({
            ...product._doc,
            image: product.image?.map(imgName =>
                imgName.startsWith("http") ? imgName : baseUrl + imgName
            )
        }));

        return res.status(200).json({ status: true, result: updatedProducts });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ status: false, message: "Lỗi lấy dữ liệu sản phẩm" });
    }
});

module.exports = router;
