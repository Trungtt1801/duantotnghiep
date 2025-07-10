const moment = require("moment");
const crypto = require("crypto");
const qs = require("qs");

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (let key of keys) {
    const value = obj[key] !== null && obj[key] !== undefined ? obj[key] : '';
    sorted[key] = encodeURIComponent(value).replace(/%20/g, "+");
  }
  return sorted;
}

/**
 * Tạo link thanh toán VNPAY
 * @param {number} amount - Tổng tiền (VNĐ)
 * @param {string} userId - ID người dùng (để ghi log, mở rộng sau)
 * @param {string} ipAddr - IP client gửi request
 * @param {string} [locale='vn'] - Ngôn ngữ giao diện VNPAY
 * @param {string} [returnUrl=process.env.VNP_RETURN_URL] - URL callback từ VNPAY
 * @returns {Promise<{transaction_code: string, payment_url: string}>}
 */
async function createVnpayPayment(amount, userId, ipAddr = '127.0.0.1', locale = 'vn', returnUrl = process.env.VNP_RETURN_URL) {
  const date = new Date();
  const orderId = moment(date).format('DDHHmmss');
  const createDate = moment(date).format('YYYYMMDDHHmmss');

  const vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: process.env.VNP_TMN_CODE,
    vnp_Amount: amount * 100,
    vnp_CurrCode: 'VND',
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
    vnp_OrderType: 'other',
    vnp_Locale: locale,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr,
    vnp_CreateDate: createDate,
  };

  const sortedParams = sortObject(vnp_Params);
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', process.env.VNP_HASH_SECRET);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  sortedParams['vnp_SecureHash'] = signed;
  const vnpUrl = process.env.VNP_URL + '?' + qs.stringify(sortedParams, { encode: false });

  return {
    transaction_code: orderId,
    payment_url: vnpUrl,
  };
}

module.exports = {
  createVnpayPayment
};
