const voucherModel = require('../models/voucherModel');

// Lấy tất cả voucher
async function getAllVouchers() {
  return await voucherModel.find().sort({ createdAt: -1 });
}

// Lấy voucher theo ID
async function getVoucherById(id) {
  const voucher = await voucherModel.findById(id);
  if (!voucher) throw new Error('Không tìm thấy voucher');
  return voucher;
}

// Tạo voucher mới
async function addVoucher(data) {
  const { value, voucher_code, min_total, max_total } = data;

  if (!value || !voucher_code) {
    throw new Error('Thiếu thông tin bắt buộc');
  }

  // Kiểm tra mã voucher đã tồn tại chưa
  const existing = await voucherModel.findOne({ voucher_code });
  if (existing) throw new Error('Mã voucher đã tồn tại');

  const newVoucher = new voucherModel({
    value,
    voucher_code,
    min_total,
    max_total,
    createdAt: Date.now(),
  });

  return await newVoucher.save();
}

// Cập nhật voucher
async function updateVoucher(id, data) {
  const voucher = await voucherModel.findById(id);
  if (!voucher) throw new Error('Không tìm thấy voucher');

  const { value, voucher_code, min_total, max_total } = data;

  if (voucher_code && voucher_code !== voucher.voucher_code) {
    // Kiểm tra mã mới có trùng không
    const exists = await voucherModel.findOne({ voucher_code });
    if (exists) throw new Error('Mã voucher đã tồn tại');
  }

  voucher.value = value ?? voucher.value;
  voucher.voucher_code = voucher_code ?? voucher.voucher_code;
  voucher.min_total = min_total ?? voucher.min_total;
  voucher.max_total = max_total ?? voucher.max_total;

  return await voucher.save();
}

// Xóa voucher
async function deleteVoucher(id) {
  const voucher = await voucherModel.findById(id);
  if (!voucher) throw new Error('Không tìm thấy voucher');
  return await voucherModel.findByIdAndDelete(id);
}

module.exports = {
  getAllVouchers,
  getVoucherById,
  addVoucher,
  updateVoucher,
  deleteVoucher,
};
