const productsModel = require('../models/productsModel');

module.exports = { getProducts };

async function getProducts() {
    try {
        const products = await productsModel.find({});
        return products; 
    } catch (error) {
        console.log("Lỗi khi lấy sản phẩm:", error);
        throw error; 
    }
}
