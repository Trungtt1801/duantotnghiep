const moment = require("moment");
const crypto = require("crypto");

// --- helpers ---
function sortAndEncode(obj) {
  const keys = Object.keys(obj).sort();
  return keys
    .map((k) => `${k}=${encodeURIComponent(obj[k]).replace(/%20/g, "+")}`)
    .join("&");
}
function toIPv4(ip) {
  if (!ip) return "127.0.0.1";
  const first = String(ip).split(",")[0].trim();
  return first.includes(":") ? "127.0.0.1" : first; // IPv6 -> IPv4
}
function normalizeLocale(loc) {
  const l = String(loc || "vn").toLowerCase();
  return l === "en" ? "en" : "vn";
}

/**
 * Tạo link thanh toán VNPAY dành cho khách vãng lai (không có user_id)
 * ***KHỚP THỨ TỰ THAM SỐ VỚI CONTROLLER***
 * Controller gọi: createVnpayPaymentForGuest(amount, ipAddr, orderId, locale)
 *
 * @param {number} amount                 - Tổng tiền (VND)
 * @param {string} ipAddr                 - IP client
 * @param {string} orderId                - savedOrder._id (chỉ dùng để tham chiếu)
 * @param {'vn'|'en'} [locale='vn']       - Ngôn ngữ giao diện
 * @param {string} [returnUrl=process.env.VNP_RETURN_URL_GUEST || process.env.VNP_RETURN_URL]
 * @returns {Promise<{transaction_code: string, payment_url: string}>}
 */
async function createVnpayPaymentForGuest(
  amount,
  ipAddr = "127.0.0.1",
  orderId,
  locale = "vn",
  returnUrl = process.env.VNP_RETURN_GUESS_URL // 👉 đổi lại đọc biến cũ
) {
  if (!orderId) throw new Error("orderId bắt buộc cho khách vãng lai");

  const date = new Date();
  const createDate = moment(date).format("YYYYMMDDHHmmss");

  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: process.env.VNP_TMN_CODE,
    vnp_Amount: amount * 100,
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Thanh toán đơn hàng ${orderId}`,
    vnp_OrderType: "other",
    vnp_Locale: locale,
    vnp_ReturnUrl: returnUrl,  // 👉 sẽ lấy từ VNP_RETURN_GUESS_URL trong .env
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };
  // Ký SHA512
  const signData = sortAndEncode(vnp_Params);
  const vnp_SecureHash = crypto
    .createHmac("sha512", secret)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  const payment_url = `${vnp_Url}?${signData}&vnp_SecureHash=${vnp_SecureHash}`;

  return {
    transaction_code: txnRef, // controller sẽ lưu vào order.transaction_code
    payment_url,
  };
}

module.exports = {
  createVnpayPaymentForGuest,
};
