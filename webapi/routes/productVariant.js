var express = require('express');
var router = express.Router();
const productVariantController = require('../mongo/controllers/productVariantController');
// localhost:3000/variant
// GET all variants
// http://localhost:3000/variant
router.get('/', async (req, res) => {
    try {
        const variants = await productVariantController.getAllProductVariants();
        res.status(200).json(variants);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy danh sách biến thể sản phẩm' });
    }
});

// GET variant by variant _id
// http://localhost:3000/variant/:variant_id
router.get('/:variant_id', async (req, res) => {
    try {
        const variantId = req.params.variant_id;
        const variant = await productVariantController.getVariantById(variantId);
        if (!variant) {
            return res.status(404).json({ message: 'Biến thể không tồn tại' });
        }
        res.status(200).json(variant);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy biến thể' });
    }
});

// GET variants by product_id
// http://localhost:3000/variant/products/:product_id
router.get('/products/:product_id', async (req, res) => {
    try {
        const productId = req.params.product_id;
        const variants = await productVariantController.getVariantsByProductId(productId);
        res.status(200).json(variants);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi lấy biến thể theo sản phẩm' });
    }
});
// PUT /variant/:variant_id
router.put('/:variant_id', async (req, res) => {
    try {
        const updatedVariant = await productVariantController.updateVariantById(
            req.params.variant_id,
            req.body
        );
        if (!updatedVariant) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể để cập nhật' });
        }
        res.status(200).json(updatedVariant);
    } catch (error) {
        console.error('Lỗi khi cập nhật biến thể:', error);
        res.status(500).json({ message: 'Lỗi cập nhật biến thể' });
    }
});
router.post('/', async (req, res) => {
    try {
        const { product_id, color, sizes } = req.body;

        const variantData = {
            color,
            sizes
        };

        const result = await productVariantController.addVariantToProduct(product_id, variantData);

        res.status(201).json({ message: 'Thêm biến thể thành công', data: result });
    } catch (error) {
        console.error('Lỗi khi thêm biến thể:', error);
        res.status(500).json({ message: 'Lỗi khi thêm biến thể' });
    }
});

// PUT /variant/size/:variantId/:sizeId
router.put('/size/:variantId/:sizeId', async (req, res) => {
    try {
        const { variantId, sizeId } = req.params;
        const updatedSize = req.body;

        const result = await productVariantController.updateSizeInVariant(variantId, sizeId, updatedSize);

        if (!result) {
            return res.status(404).json({ message: 'Không tìm thấy biến thể hoặc size cần cập nhật' });
        }

        res.status(200).json({ message: 'Cập nhật size thành công', data: result });
    } catch (error) {
        console.error('Lỗi khi cập nhật size:', error);
        res.status(500).json({ message: 'Lỗi khi cập nhật size' });
    }
});


module.exports = router;
