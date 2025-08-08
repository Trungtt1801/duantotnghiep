const moment = require("moment");
const crypto = require("crypto");

/**
 * Sắp xếp object theo key tăng dần
 */
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key] ?? "";
  }
  return sorted;
}

/**
 * Tạo link thanh toán VNPAY dành cho khách vãng lai (không có user_id)
 * @param {number} amount - Tổng tiền (VNĐ)
 * @param {string} ipAddr - IP client gửi request
 * @param {string} orderId - Mã đơn hàng (lấy từ savedOrder._id)
 * @param {string} [locale='vn'] - Ngôn ngữ giao diện VNPAY
 * @param {string} [returnUrl=process.env.VNP_RETURN_GUESS_URL] - URL callback từ VNPAY
 * @returns {Promise<{transaction_code: string, payment_url: string}>}
 */
async function createVnpayPaymentForGuest(
  amount,
  ipAddr = "127.0.0.1",
  orderId,
  locale = "vn",
  returnUrl = process.env.VNP_RETURN_GUESS_URL
) {
  if (!orderId) throw new Error("orderId bắt buộc cho khách vãng lai");

  const date = new Date();
  const createDate = moment(date).format("YYYYMMDDHHmmss");

  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: process.env.VNP_TMN_CODE,
    vnp_Amount: amount * 100, // nhân 100 như VNPAY yêu cầu
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId, // dùng order._id làm mã đơn
    vnp_OrderInfo: `Thanh toán đơn hàng ${orderId}`,
    vnp_OrderType: "other",
    vnp_Locale: locale,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  // 1. Sắp xếp và tạo chuỗi ký
  const sortedParams = sortObject(vnp_Params);
  const signData = Object.entries(sortedParams)
    .map(([key, val]) => `${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`)
    .join("&");

  // 2. Ký SHA512
  const hmac = crypto.createHmac("sha512", process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  // 3. Gắn chữ ký vào tham số
  sortedParams["vnp_SecureHash"] = signed;

  // 4. Tạo URL thanh toán
  const vnpUrl =
    process.env.VNP_URL +
    "?" +
    Object.entries(sortedParams)
      .map(([key, val]) => `${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`)
      .join("&");

  return {
    transaction_code: orderId,
    payment_url: vnpUrl,
  };
}

module.exports = {
  createVnpayPaymentForGuest,
};
