const productVariantModel = require('../models/productVariantModel');
const mongoose = require('mongoose');
// Lấy tất cả biến thể
async function getAllProductVariants() {
    try {
        return await productVariantModel.find();
    } catch (error) {
        throw new Error('Lỗi lấy danh sách biến thể sản phẩm');
    }
}

// Lấy một biến thể theo _id của chính nó
async function getVariantById(variantId) {
    try {
        return await productVariantModel.findById(variantId);
    } catch (error) {
        throw new Error('Lỗi lấy biến thể theo ID');
    }
}

// Lấy tất cả biến thể theo product_id
async function getVariantsByProductId(productId) {
    try {
        return await productVariantModel.find({ product_id: productId });
    } catch (error) {
        throw new Error('Lỗi lấy danh sách biến thể theo product_id');
    }
}
async function updateVariantById(variantId, updatedData) {
    try {
        const updatedVariant = await productVariantModel.findByIdAndUpdate(
            variantId,
            updatedData,
            { new: true } // Trả về dữ liệu sau khi update
        );
        return updatedVariant;
    } catch (error) {
        throw new Error('Lỗi cập nhật biến thể sản phẩm');
    }
}
async function addVariantToProduct(productId, variantData) {
    try {
        // Tìm document productvariant theo product_id
        let productVariant = await productVariantModel.findOne({ product_id: productId });

        // Nếu chưa có document, tạo mới
        if (!productVariant) {
            productVariant = new productVariantModel({
                product_id: productId,
                variants: []
            });
        }

        // Thêm variant mới (Mongoose sẽ tự tạo _id vì có auto: true)
        productVariant.variants.push(variantData);

        // Lưu lại
        await productVariant.save();

        return productVariant;
    } catch (error) {
        throw new Error('Lỗi khi thêm biến thể: ' + error.message);
    }
}
async function updateSizeInVariant(variantId, sizeId, updatedSize) {
    try {
        // Tìm document chứa variant có _id = variantId
        const productVariant = await productVariantModel.findOne({
            'variants._id': new mongoose.Types.ObjectId(variantId)
        });

        if (!productVariant) {
            // Không tìm thấy document chứa variant
            return null;
        }

        // Tìm variant trong mảng variants theo id
        const variant = productVariant.variants.id(variantId);
        if (!variant) {
            return null;
        }

        // Tìm size cụ thể trong variant.sizes theo sizeId
        const sizeToUpdate = variant.sizes.id(sizeId);
        if (!sizeToUpdate) {
            return null;
        }

        // Cập nhật các trường nếu có trong updatedSize
        if (updatedSize.size !== undefined) sizeToUpdate.size = updatedSize.size;
        if (updatedSize.quantity !== undefined) sizeToUpdate.quantity = updatedSize.quantity;
        if (updatedSize.sku !== undefined) sizeToUpdate.sku = updatedSize.sku;

        // Lưu lại document sau khi cập nhật
        await productVariant.save();

        return sizeToUpdate; // Trả về object size sau khi cập nhật
    } catch (error) {
        throw new Error('Lỗi khi cập nhật size trong variant: ' + error.message);
    }
}


module.exports = {
    getAllProductVariants,
    getVariantById,
    getVariantsByProductId,
    updateVariantById,
    addVariantToProduct,
    updateSizeInVariant
};
