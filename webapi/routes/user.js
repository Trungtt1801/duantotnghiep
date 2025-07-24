require('dotenv').config();
const express = require("express");
const router = express.Router();
const https = require("https");
const userController = require("../mongo/controllers/userController");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Lấy toàn bộ người dùng
router.get("/", async (req, res) => {
  try {
    const result = await userController.getAllUsers();
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi lấy dữ liệu người dùng" });
  }
});

// Đăng ký người dùng
router.post("/register", async (req, res) => {
  try {
    const data = req.body;
    console.log("Dữ liệu đăng ký nhận được:", data);
    const result = await userController.register(data);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ status: false, message: "Lỗi đăng ký người dùng", error: error.message });
  }
});

// Đăng nhập người dùng
router.post("/login", async (req, res) => {
  console.log("===> VÀO LOGIN THƯỜNG");
  try {
    const { email, password } = req.body;
    const user = await userController.login({ email, password });

    const jwtSecret = process.env.PRIVATE_KEY || "defaultSecretKey";

    const token = jwt.sign(
      { email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: "2h", subject: user._id.toString() }
    );

    return res.status(200).json({
      status: true,
      message: "Đăng nhập thành công",
      token,
      user
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Lỗi đăng nhập",
      error: error.message
    });
  }
});

// Quên mật khẩu
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    await userController.forgotPassword(email);
    return res.status(200).json({ status: true, message: "Email đặt lại mật khẩu đã được gửi!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: "Lỗi gửi email đặt lại mật khẩu", error: error.message });
  }
});

// Đặt lại mật khẩu
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const message = await userController.resetPassword(token, newPassword);
    return res.status(200).json({ status: true, message });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ status: false, message: error.message });
  }
});

// Đăng nhập bằng Google
router.post("/login-google", async (req, res) => {
  console.log("===> VÀO LOGIN GOOGLE");
  try {
    const { token } = req.body;
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { email, name} = payload;

    let user = await userController.findOrCreateGoogleUser({ name, email });

    const jwtSecret = process.env.PRIVATE_KEY || "defaultSecretKey";
    const jwtToken = jwt.sign(
      { email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: "2h", subject: user._id.toString() }
    );

    return res.status(200).json({
      status: true,
      message: "Đăng nhập Google thành công",
      token: jwtToken,
      user,
    });
  } catch (error) {
    console.error("Lỗi đăng nhập Google:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi đăng nhập bằng Google",
      error: error.message,
    });
  }
});

// Đăng nhập bằng Facebook (không dùng axios / fetch)
router.post("/login-facebook", async (req, res) => {
  console.log("===> VÀO LOGIN FACEBOOK");
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ status: false, message: "Thiếu accessToken" });
    }

    const fbUrl = `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`;

    const getFbData = (url) =>
      new Promise((resolve, reject) => {
        https.get(url, (response) => {
          let data = "";
          response.on("data", (chunk) => (data += chunk));
          response.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              resolve(parsed);
            } catch (err) {
              reject(err);
            }
          });
        }).on("error", (err) => reject(err));
      });

    const fbData = await getFbData(fbUrl);
console.log("===> Dữ liệu từ Facebook:", fbData);

if (!fbData.email) {
  return res.status(400).json({
    status: false,
    message: "Token Facebook không hợp lệ hoặc chưa cấp quyền email",
    fbData,
  });
}


    const { id: name, email } = fbData;
    const user = await userController.findOrCreateFacebookUser({ name, email });

    const jwtSecret = process.env.PRIVATE_KEY || "defaultSecretKey";
    const jwtToken = jwt.sign(
      { email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: "2h", subject: user._id.toString() }
    );

    return res.status(200).json({
      status: true,
      message: "Đăng nhập Facebook thành công",
      token: jwtToken,
      user,
    });
  } catch (error) {
    console.error("Lỗi đăng nhập Facebook:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi đăng nhập bằng Facebook",
      error: error.message,
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const user = await userController.getUserById(req.params.id); 

    res.status(200).json({ status: true, data: user });
  } catch (err) {
    console.error("Lỗi khi gọi API /user/:id:", err.message);

    const statusCode = err.message.includes("Không tìm thấy") || err.message.includes("ID không hợp lệ")
      ? 404
      : 500;

    res.status(statusCode).json({ status: false, message: err.message });
  }
});


module.exports = router;
