const ImportModel = require("../models/ImportModel");
const ProductModel = require("../models/productsModel");

exports.importProducts = async (req, res) => {
  try {
    const { products, date, note, staff } = req.body;

    if (!staff) {
      return res.status(400).json({ message: "Thiếu thông tin nhân viên nhập kho" });
    }

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Danh sách sản phẩm không hợp lệ" });
    }

    // Tạo phiếu nhập kho
    const newImport = new ImportModel({
      products,
      date: date || new Date(),
      staff,
      note: note || "",
    });

    await newImport.save();

    // Cập nhật tồn kho từng sản phẩm
    await Promise.all(products.map(async (item) => {
      await ProductModel.findByIdAndUpdate(
        item.productId,
        { $inc: { quantity: item.quantity } },
        { new: true }
      );
    }));


    res.status(201).json({
      message: "Nhập kho thành công và đã cập nhật tồn kho",
      data: newImport,
    });
  } catch (error) {
    console.error("Lỗi khi nhập kho:", error);
    res.status(500).json({ message: "Lỗi server khi nhập kho" });
  }
};
