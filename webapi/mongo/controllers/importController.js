// controllers/import.controller.js
const ImportModel = require("../models/ImportReceipt");

exports.importProducts = async (req, res) => {
  try {
    const { products, date, note } = req.body;

    // Validate đầu vào
    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ message: "Danh sách sản phẩm không hợp lệ" });
    }

    const newImport = new ImportModel({
      products,
      date: date || new Date(),
      note: note || "",
    });

    await newImport.save();

    res.status(201).json({ message: "Nhập kho thành công", data: newImport });
  } catch (error) {
    console.error("Lỗi khi nhập kho:", error);
    res.status(500).json({ message: "Lỗi server khi nhập kho" });
  }
};
