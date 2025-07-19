require("dotenv").config();
const usersModel = require("../models/userModels");
const Address = require("../models/addressModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Cấu hình mail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Lấy tất cả user (ẩn password)
async function getAllUsers() {
  try {
    const users = await usersModel
      .find()
      .select("-password")
      .populate("addresses"); // lấy từ virtual populate

    return users;
  } catch (error) {
    throw new Error("Lỗi lấy dữ liệu người dùng");
  }
}


// Đăng ký người dùng
async function register(data) {
  try {
    const { name, email, password, role, phone, gender } = data;

    if (await usersModel.findOne({ email })) {
      throw new Error("Email đã tồn tại!");
    }

    if (await usersModel.findOne({ name, phone })) {
      throw new Error("Tên và số điện thoại đã được sử dụng!");
    }

    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);
    const userRole = typeof role !== "undefined" ? role : 1;

    const newUser = new usersModel({
      name,
      email,
      password: hashedPassword,
      role: userRole,
      phone,
      gender
    });

    const result = await newUser.save();
    const userData = result.toObject();
    delete userData.password;

    return userData;
  } catch (error) {
    throw new Error(error.message || "Lỗi đăng ký");
  }
}

// Đăng nhập bằng email và password
async function login(data) {
  try {
    const { email, password } = data;
    const user = await usersModel.findOne({ email }).select("+password");
    if (!user) throw new Error("Email chưa được đăng ký!");

    const isPasswordValid = bcryptjs.compareSync(password, user.password);
    if (!isPasswordValid) throw new Error("Sai mật khẩu!");

    const { password: _, ...userData } = user.toObject();
    return userData;
  } catch (error) {
    throw new Error(error.message || "Lỗi đăng nhập");
  }
}

// Gửi email đặt lại mật khẩu
async function sendResetPasswordEmail(email, resetLink) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Yêu cầu đặt lại mật khẩu",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; background-color: #ffffff; color: #333333; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2c3e50;">Kính gửi Quý khách hàng</h2>
          <p>Chúng tôi vừa nhận được yêu cầu đặt lại mật khẩu cho tài khoản <strong>FIYO</strong> của bạn.</p>
          <p>
            Vui lòng nhấn vào liên kết bên dưới để tạo mật khẩu mới. Để bảo vệ tối đa quyền lợi và thông tin cá nhân của bạn, liên kết này chỉ có hiệu lực trong vòng <strong>15 phút</strong> kể từ thời điểm nhận được email.
          </p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #007BFF; color: white; text-decoration: none; border-radius: 4px;">
              Tạo mật khẩu mới
            </a>
          </p>
          <p>Nếu bạn không phải là người thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ ngay với đội ngũ hỗ trợ khách hàng FIYO để được hỗ trợ kịp thời.</p>
          <p>Chúng tôi cam kết đồng hành cùng bạn trong việc bảo mật và an toàn thông tin.</p>
          <p style="margin-top: 30px;">Trân trọng,<br/><strong>Đội ngũ hỗ trợ khách hàng FIYO</strong></p>
          <hr style="margin-top: 30px;"/>
          <p style="font-size: 12px; color: #888888;"><i>Email này được gửi tự động, vui lòng không trả lời email này.</i></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Lỗi gửi email đặt lại mật khẩu:", error);
    throw new Error("Không thể gửi email đặt lại mật khẩu");
  }
}

async function forgotPassword(email) {
  try {
    console.log("Email nhận được trong forgotPassword:", email);

    const user = await usersModel.findOne({ email });
    console.log("User tìm thấy:", user);

    if (!user) {
      throw new Error("Email chưa được đăng ký!");
    }

    const today = new Date();
    const isSameDay =
      user.resetPasswordDate &&
      new Date(user.resetPasswordDate).toDateString() === today.toDateString();

    if (isSameDay && user.resetPasswordCount >= 5) {
      throw new Error(
        "Bạn đã yêu cầu quá số lần cho phép trong ngày (5 lần). Vui lòng thử lại vào ngày mai."
      );
    }

    // Nếu khác ngày thì reset lại bộ đếm
    if (!isSameDay) {
      user.resetPasswordCount = 0;
      user.resetPasswordDate = today;
    }
    // Tạo token reset
    const jwtSecret = process.env.PRIVATE_KEY || "defaultSecretKey";
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "15m",
    });

    const resetLink = `http://localhost:3001/reset-password/${token}`;

    // Gửi email
    await sendResetPasswordEmail(email, resetLink);

    // Tăng số lần gửi
    user.resetPasswordCount += 1;
    user.resetPasswordDate = today;
    await user.save();

    return "Email đặt lại mật khẩu đã được gửi.";
  } catch (error) {
    console.error("Lỗi trong forgotPassword:", error);
    throw error;
  }
}

async function resetPassword(token, newPassword) {
  const jwtSecret = process.env.PRIVATE_KEY || "defaultSecretKey";
  try {
    console.log("Verify token:", token);
    console.log("Using jwt secret:", jwtSecret);

    const payload = jwt.verify(token, jwtSecret);
    const user = await usersModel.findById(payload.userId);
    if (!user) throw new Error("Người dùng không tồn tại.");

    user.password = bcryptjs.hashSync(newPassword, 10);
    await user.save();

    return "Đổi mật khẩu thành công.";
  } catch (error) {
    console.error("Lỗi resetPassword:", error);
    if (error.name === "TokenExpiredError") {
      throw new Error("Token đã hết hạn.");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Token không hợp lệ.");
    } else {
      throw new Error("Có lỗi xảy ra trong quá trình đổi mật khẩu.");
    }
  }
}
// Tìm hoặc tạo user Google
async function findOrCreateGoogleUser({ name, email }) {
  let user = await usersModel.findOne({ email });

  if (!user) {
    user = new usersModel({
      name,
      email,
      authType: "google",
      password: null,
    });
    await user.save();
  }

  return user;
}
async function findOrCreateFacebookUser({ name, email }) {
  let user = await usersModel.findOne({ email });

  if (!user) {
    user = new usersModel({
      name,
      email,
      authType: "facebook",
      password: null,
    });
    await user.save();
  }

  return user;
}
async function getUserById(userId) {
  try {
    const user = await usersModel
      .findById(userId)
      .select("-password");

    if (!user) throw new Error("Không tìm thấy người dùng");

    const defaultAddress = await Address.findOne({
      user_id: userId,
      is_default: true,
    });

    const userObj = user.toObject(); // chuyển sang object thường để gán thêm field
    userObj.defaultAddress = defaultAddress;

    return userObj;
  } catch (error) {
    throw new Error("Lỗi khi lấy thông tin người dùng");
  }
}


module.exports = {
  register,
  getAllUsers,
  login,
  sendResetPasswordEmail,
  forgotPassword,
  resetPassword,
  findOrCreateGoogleUser,
  findOrCreateFacebookUser,
  getUserById
};

