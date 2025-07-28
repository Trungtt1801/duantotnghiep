const nodemailer = require("nodemailer");

async function sendOrderConfirmationEmail(email, orderId, name) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,     // ✅ Đúng với .env
      pass: process.env.EMAIL_PASS,     // ✅ Đúng với .env
    },
  });

  const mailOptions = {
    from: '"Shop của bạn" <no-reply@shop.com>',
    to: email,
    subject: "Xác nhận đơn hàng",
    html: `<p>Xin chào ${name},</p>
           <p>Cảm ơn bạn đã đặt hàng. Vui lòng xác nhận đơn hàng bằng cách bấm vào liên kết dưới:</p>
           <p><a href="${process.env.CLIENT_URL}/page/confirm-order">Xác nhận đơn hàng</a></p>`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendOrderConfirmationEmail;
