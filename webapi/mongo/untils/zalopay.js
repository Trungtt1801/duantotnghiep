const axios = require("axios").default;
const CryptoJS = require("crypto-js");
const moment = require("moment");

const config = {
  app_id: "2554",
  key1: "sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn",
  key2: "trMrHtvjo6myautxDUiAcYsVtaeQ8nhf",
  endpoint: "https://sb-openapi.zalopay.vn/v2/create",
};

async function createZaloPayOrder(amount, userId) {
  const transID = Math.floor(Math.random() * 1000000);
  const embed_data = {};
  const items = [{}];

  const order = {
    app_id: config.app_id,
    app_trans_id: `${moment().format("YYMMDD")}_${transID}`,
    app_user: userId || "anonymous",
    app_time: Date.now(),
    item: JSON.stringify(items),
    embed_data: JSON.stringify(embed_data),
    amount,
    description: `Thanh toán đơn hàng #${transID}`,
    bank_code: "zalopayapp",
    return_url: "https://order",
  };

  const data = [
    order.app_id,
    order.app_trans_id,
    order.app_user,
    order.amount,
    order.app_time,
    order.embed_data,
    order.item,
  ].join("|");

  order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

  const response = await axios.post(config.endpoint, null, { params: order });
  return {
    ...response.data,
    app_trans_id: order.app_trans_id, // để lưu vào transaction_code
  };
}

module.exports = createZaloPayOrder;
