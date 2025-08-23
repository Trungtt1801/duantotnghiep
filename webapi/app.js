const dotenv = require("dotenv");
// Load biến môi trường từ file .env
dotenv.config();

var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");

// Import các router
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/user");
const productRouter = require("./routes/products");
const categoryRouter = require("./routes/category");
const cartRouter = require("./routes/cart");
const productvariantRouter = require("./routes/productVariant");
const orderRouter = require("./routes/order");
const voucherRouter = require("./routes/voucher");
const addressRouter = require("./routes/address");
const reviewRouter = require("./routes/review");
const orderDetailRouter = require("./routes/orderDetail");
const chatRouter = require("./routes/chat");

const app = express();
app.use(cors());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "public/images")));

// Prefix /api cho tất cả router
app.use("/api", indexRouter);
app.use("/api/user", usersRouter);
app.use("/api/products", productRouter);
app.use("/api/category", categoryRouter);
app.use("/api/variant", productvariantRouter);
app.use("/api/cart", cartRouter);
app.use("/api/address", addressRouter);
app.use("/api/orders", orderRouter);
app.use("/api/voucher", voucherRouter);
app.use("/api/review", reviewRouter);
app.use("/api/orderDetail", orderDetailRouter);
app.use("/api/chat", chatRouter);

// 404 handler
app.use(function (req, res, next) {
  next(createError(404));
});

// kết nối database mogoose
mongoose
    .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Kết nối Database thành công"))
  .catch((err) => console.error("❌ Lỗi kết nối Database:", err));
// mongoose
//   .connect("mongodb://localhost:27017/DATN")
//   .then(() => console.log("Kết nối Database thành công"))
//   .catch((err) => console.log(err));
    
// Error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;