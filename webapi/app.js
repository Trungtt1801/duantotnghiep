const dotenv = require("dotenv");
// Load biến môi trường từ file .env
dotenv.config();

const cors = require("cors");
const createError = require("http-errors");
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const mongoose = require("mongoose");
const helmet = require("helmet");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/user");
var productRouter = require("./routes/products");
var categoryRouter = require("./routes/category");
var cartRouter = require("./routes/cart");
var productvariantRouter = require("./routes/productVariant");
var orderRouter = require("./routes/order");
var voucherRouter = require("./routes/voucher");
var addressRouter = require("./routes/address");
var reviewRouter = require("./routes/review");
var orderDetailRouter = require("./routes/orderDetail");
var chatRouter = require("./routes/chat");
var shopRouter = require("./routes/shop");
var app = express();
app.use(cors());

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");

app.use(logger("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
// app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use("/api/images", express.static(path.join(__dirname, "public/images")));

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
app.use("/api/shop", shopRouter);

// 404 handler
app.use(function (req, res, next) {
  next(createError(404));
});

// Kết nối database mongoose
mongoose
    .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Kết nối Database thành công"))
  .catch((err) => console.error("❌ Lỗi kết nối Database:", err));
  
// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
