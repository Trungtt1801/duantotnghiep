const voucherModel = require('../models/voucherModel');

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

        const { value, voucher_code, min_total, max_total, quantity, is_active, expired_at } = data;

       if (value === undefined || voucher_code === undefined || voucher_code === '') {
    throw new Error('Thiếu thông tin bắt buộc');
}

        const existing = await voucherModel.findOne({ voucher_code });
        if (existing) throw new Error('Mã voucher đã tồn tại');

        const newVoucher = new voucherModel({
            value,
            voucher_code,
            min_total,
            max_total,
            quantity,
            is_active,
            expired_at: expired_at ? new Date(expired_at) : null,
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
module.exports = {
    getAllVouchers,
    getVoucherById,
    addVoucher,
    updateVoucher,
    deleteVoucher,
    useVoucher,
    updateStatusVoucher
};
