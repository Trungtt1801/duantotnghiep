const moment = require("moment");
const crypto = require("crypto");

// --- helpers ---
function sortAndEncode(obj) {
  return Object.keys(obj)
    .sort()
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
 * Tạo link thanh toán VNPAY (KHỚP THỨ TỰ THAM SỐ VỚI CONTROLLER)
 * @param {number} amount            - Tổng tiền VND
 * @param {string|null} userId       - Id user (không dùng trong params)
 * @param {string} ipAddr            - IP client
 * @param {string} orderId           - _id đơn hàng MongoDB (dùng để sinh TxnRef)
 * @param {'vn'|'en'} [locale='vn']  - Ngôn ngữ giao diện VNPAY
 * @param {string} [returnUrl=process.env.VNP_RETURN_URL] - URL callback VNPAY
 * @returns {Promise<{transaction_code: string, payment_url: string}>}
 */
async function createVnpayPayment(
  amount,
  userId,
  ipAddr = "127.0.0.1",
  orderId,
  locale = "vn",
  returnUrl = process.env.VNP_RETURN_URL
) {
  // Kiểm tra cấu hình
  const vnp_TmnCode = process.env.VNP_TMN_CODE;
  const vnp_Url = process.env.VNP_URL; // https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
  const vnp_Hash = process.env.VNP_HASH_SECRET;
  if (!vnp_TmnCode || !vnp_Url || !vnp_Hash || !returnUrl) {
    throw new Error("Thiếu cấu hình VNPAY (.env) – kiểm tra VNP_TMN_CODE, VNP_URL, VNP_HASH_SECRET, VNP_RETURN_URL");
  }

  const date = new Date();
  const createDate = moment(date).format("YYYYMMDDHHmmss");

  // Sinh mã tham chiếu giao dịch (8–10 ký tự), KHÔNG gán nhầm vào locale
  // Có thể dựa theo thời gian để dễ đọc, không phụ thuộc _id
  const txnRef = moment(date).format("DDHHmmss");

  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: vnp_TmnCode,
    vnp_Amount: Number(amount) * 100, // nhân 100 theo chuẩn VNPAY
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,
    vnp_OrderInfo: `Thanh toan don hang ${txnRef}`,
    vnp_OrderType: "other",
    vnp_Locale: normalizeLocale(locale),            // ✅ đúng 'vn' | 'en'
    vnp_ReturnUrl: returnUrl,                       // ✅ đúng URL, không phải 'vn'
    vnp_IpAddr: toIPv4(ipAddr),                     // ✅ ép IPv4
    vnp_CreateDate: createDate,
  };

  // 1) Sắp xếp + encode để ký
  const signData = sortAndEncode(vnp_Params);

  // 2) Ký SHA512
  const secureHash = crypto
    .createHmac("sha512", vnp_Hash)
    .update(Buffer.from(signData, "utf-8"))
    .digest("hex");

  // 3) Ghép URL thanh toán
  const payment_url = `${vnp_Url}?${signData}&vnp_SecureHash=${secureHash}`;

  return {
    transaction_code: txnRef,
    payment_url,
  };
}

module.exports = { createVnpayPayment };
