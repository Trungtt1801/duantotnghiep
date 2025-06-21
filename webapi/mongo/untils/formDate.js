const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('dayjs/locale/vi');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('vi');

function formatDateVN(date) {
  return dayjs(date).tz('Asia/Ho_Chi_Minh').format('DD-MM-YYYY HH:mm');
}

module.exports = formatDateVN;
