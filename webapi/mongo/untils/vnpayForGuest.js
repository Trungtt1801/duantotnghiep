const moment = require("moment");
const crypto = require("crypto");

function sortAndEncode(obj) {
  const keys = Object.keys(obj).sort();
  return keys
    .map((k) => `${k}=${encodeURIComponent(obj[k]).replace(/%20/g, "+")}`)
    .join("&");
}

function toIPv4(ip) {
  if (!ip) return "127.0.0.1";
  const first = String(ip).split(",")[0].trim();
  return first.includes(":") ? "127.0.0.1" : first;
}

function normalizeLocale(loc) {
  const l = String(loc || "vn").toLowerCase();
  return l === "en" ? "en" : "vn";
}

/**
 * Tạo link thanh toán VNPAY dành cho khách vãng lai
 */
async function createVnpayPaymentForGuest(
  amount,
  ipAddr = "127.0.0.1",
  orderId,
  locale = "vn",
  returnUrl = process.env.VNP_RETURN_GUESS_URL || process.env.VNP_RETURN_URL
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
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  // Sắp xếp và ký SHA512
  const signData = sortAndEncode(vnp_Params);
  const secretKey = process.env.VNP_HASH_SECRET;  // Đọc từ .env
  const vnp_SecureHash = crypto
    .createHmac("sha512", secretKey)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  const vnpUrl = process.env.VNP_URL;
  const payment_url = `${vnpUrl}?${signData}&vnp_SecureHash=${vnp_SecureHash}`;

  return {
    transaction_code: orderId,
    payment_url,
  };
}

module.exports = {
  createVnpayPaymentForGuest,
  toIPv4,
  normalizeLocale
};
