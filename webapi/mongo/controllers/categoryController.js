const categoriesModel = require('../models/categoryModel');
module.exports = { getAllCate};

// Lấy toàn bộ danh mục
async function getAllCate() {
    try {
        return await categoriesModel.find();
    } catch (error) {
        console.error('Lỗi lấy dữ liệu danh mục:', error.message);
        throw new Error('Lỗi lấy dữ liệu danh mục');
    }
}