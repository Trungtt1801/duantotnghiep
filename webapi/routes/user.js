var express = require("express");
var router = express.Router();
const userController = require("../mongo/controllers/userController");
const jwt = require("jsonwebtoken");

// Lấy toàn bộ người dùng
// GET http://localhost:3000/user/
router.get("/", async (req, res) => {
  try {
    const result = await userController.getAllUsers();
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu người dùng" });
  }
});

// Đăng ký người dùng
// POST http://localhost:3000/user/register
router.post("/register", async (req, res) => {
  try {
    const data = req.body;
    console.log("Dữ liệu đăng ký nhận được:", data);
    const result = await userController.register(data);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res
      .status(500)
      .json({
        status: false,
        message: "Lỗi đăng ký người dùng",
        error: error.message,
      });
  }
});

// Đăng nhập người dùng
// POST http://localhost:3000/user/login
router.post("/login", async (req, res) => {
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

module.exports = router;
