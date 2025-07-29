const nodemailer = require("nodemailer");

async function sendOrderConfirmationEmail(email, orderId, name) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  const confirmUrl = `${process.env.CLIENT_URL}/page/confirm-order/${orderId}`;
  const mailOptions = {
    from: 'Shop của bạn <no-reply@shop.com>',
    to: email,
    subject: "Xác nhận đơn hàng",
    html: `
      <p>Xin chào ${name},</p>
      <p>Cảm ơn bạn đã đặt hàng. Vui lòng xác nhận đơn hàng bằng cách bấm vào nút bên dưới:</p>
      <p>
        <a href="${confirmUrl}" style="padding: 10px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">
          ✅ Xác nhận đơn hàng
        </a>
      </p>
      <p>Nếu bạn không click được nút, có thể truy cập link sau:</p>
      <p><a href="${confirmUrl}">${confirmUrl}</a></p>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = sendOrderConfirmationEmail;
