const mongoose = require('mongoose');
const voucherModel = require('../models/voucherModel');
const userModels = require('../models/userModels');
// Lấy tất cả voucher
async function getAllVouchers() {
    try {
        return await voucherModel.find().sort({ createdAt: -1 });
    } catch (error) {
        throw new Error('Lỗi lấy danh sách voucher');
    }
}

// Lấy voucher theo ID
async function getVoucherById(id) {
    try {
        const voucher = await voucherModel.findById(id);
        if (!voucher) throw new Error('Không tìm thấy voucher');
        return voucher;
    } catch (error) {
        throw new Error(error.message || 'Lỗi lấy chi tiết voucher');
    }
}

// Tạo voucher mới
async function addVoucher(data) {
  try {
    console.log('DỮ LIỆU NHẬN VỀ:', data);

    const {
      value,
      voucher_code,
      min_total,
      max_total,
      quantity,
      is_active,
      expired_at,
      description,
      target_rank, // ✅ rank thêm vào từ client
    } = data;

    // Kiểm tra bắt buộc
    if (value === undefined || voucher_code === undefined || voucher_code === '') {
      throw new Error('Thiếu thông tin bắt buộc');
    }

    // Kiểm tra rank nếu có
    const validRanks = [null, 'bronze', 'silver', 'gold', 'platinum'];
    if (target_rank && !validRanks.includes(target_rank)) {
      throw new Error('Rank không hợp lệ');
    }

    // Check trùng mã
    const existing = await voucherModel.findOne({ voucher_code });
    if (existing) throw new Error('Mã voucher đã tồn tại');

    const newVoucher = new voucherModel({
      value,
      voucher_code,
      min_total,
      max_total,
      quantity,
      is_active,
      description,
      expired_at: expired_at ? new Date(expired_at) : null,
      target_rank: target_rank || null, // ✅ lưu vào DB
    });

    return await newVoucher.save();
  } catch (error) {
    throw new Error(error.message || 'Lỗi thêm voucher');
  }
}


// Cập nhật voucher
async function updateVoucher(id, data) {
    try {
        const voucher = await voucherModel.findById(id);
        if (!voucher) throw new Error('Không tìm thấy voucher');

        const { value, voucher_code, min_total, max_total, quantity, is_active, expired_at } = data;

        if (voucher_code && voucher_code !== voucher.voucher_code) {
            const exists = await voucherModel.findOne({ voucher_code });
            if (exists) throw new Error('Mã voucher đã tồn tại');
        }

        voucher.value = value ?? voucher.value;
        voucher.voucher_code = voucher_code ?? voucher.voucher_code;
        voucher.min_total = min_total ?? voucher.min_total;
        voucher.max_total = max_total ?? voucher.max_total;
        voucher.quantity = quantity ?? voucher.quantity;
        voucher.is_active = is_active ?? voucher.is_active;
        voucher.expired_at = expired_at ? new Date(expired_at) : voucher.expired_at;

        return await voucher.save();
    } catch (error) {
        throw new Error(error.message || 'Lỗi cập nhật voucher');
    }
}

// Xóa voucher
async function deleteVoucher(id) {
    try {
        const voucher = await voucherModel.findById(id);
        if (!voucher) throw new Error('Không tìm thấy voucher');
        return await voucherModel.findByIdAndDelete(id);
    } catch (error) {
        throw new Error('Lỗi xóa voucher');
    }
}

// Gọi khi dùng voucher thành công để giảm số lượng
async function useVoucher(voucherId) {
    try {
        const voucher = await voucherModel.findById(voucherId);
        if (!voucher) throw new Error('Voucher không tồn tại');
        if (!voucher.is_active) throw new Error('Voucher không còn hiệu lực');
        if (voucher.quantity <= 0) throw new Error('Voucher đã hết lượt sử dụng');

        // Check ngày hết hạn nếu có
        if (voucher.expired_at && voucher.expired_at < new Date()) {
            voucher.is_active = false;
            await voucher.save();
            throw new Error('Voucher đã hết hạn');
        }

        voucher.quantity -= 1;
        if (voucher.quantity === 0) {
            voucher.is_active = false;
        }

        return await voucher.save();
    } catch (error) {
        throw new Error(error.message || 'Lỗi sử dụng voucher');
    }
}
// Hàm cập nhật trạng thái voucher (bật/tắt)
async function updateStatusVoucher(id, is_active) {
    try {
        const voucher = await voucherModel.findById(id);
        if (!voucher) throw new Error('Không tìm thấy voucher');
        voucher.is_active = is_active;
        return await voucher.save();
    } catch (error) {
        throw new Error(error.message || 'Lỗi cập nhật trạng thái voucher');
    }
}
async function searchVouchers(keywordRegex) {
  try {
    return await voucherModel.find({
      $or: [
        { voucher_code: keywordRegex },
        { value: { $regex: keywordRegex } }
      ]
    }).sort({ createdAt: -1 });
  } catch (error) {
    throw new Error('Lỗi tìm kiếm voucher');
  }
}

async function getVouchersByUserRank(req, res) {
  try {
    // Lấy userId một cách an toàn: từ params hoặc từ req.user (nếu dùng auth)
    const userId =
      (req && req.params && (req.params.userId ?? req.params.id)) ||
      (req && req.user && (req.user._id ?? req.user.id));

    // Nếu không có userId -> trả lỗi 400
    if (!userId) {
      return res.status(400).json({ message: "userId không được cung cấp" });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "userId không hợp lệ" });
    }

    // Lấy user (chỉ select field cần thiết)
    const user = await userModels.findById(userId).select("rank");
    if (!user) {
      return res.status(404).json({ message: "User không tồn tại" });
    }

    // Lấy voucher theo rank user
    const vouchers = await voucherModel.find({
      is_active: true,
      $or: [{ target_rank: null }, { target_rank: user.rank }],
      // thêm điều kiện expired/quantity nếu cần:
      // expired_at: { $gt: new Date() } // nếu muốn loại voucher đã hết hạn
    });

    // Trả mảng rỗng nếu không có voucher (200 OK)
    return res.status(200).json({
      message: "Lấy voucher thành công",
      userRank: user.rank,
      vouchers: vouchers || [],
    });
  } catch (error) {
    console.error("Lỗi getVouchersByUserRank:", error);
    return res.status(500).json({ message: "Lỗi server", error: error.message });
  }
}

module.exports = {
    getAllVouchers,
    getVoucherById,
    addVoucher,
    updateVoucher,
    deleteVoucher,
    useVoucher,
    updateStatusVoucher,
    searchVouchers,
    getVouchersByUserRank
};
