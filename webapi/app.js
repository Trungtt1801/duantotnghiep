const dotenv = require("dotenv");
// Load biến môi trường từ file .env
dotenv.config();
const cors = require("cors");
var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "public/images")));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use("/", indexRouter);
app.use("/user", usersRouter);
app.use("/products", productRouter);
app.use("/category", categoryRouter);
app.use("/variant", productvariantRouter);
app.use("/cart", cartRouter);
app.use("/address", addressRouter);
app.use("/orders", orderRouter);
app.use("/voucher", voucherRouter);
app.use("/review", reviewRouter);
app.use("/orderDetail", orderDetailRouter);
app.use("/chat", chatRouter);
app.use("/shop", shopRouter);

app.use(function (req, res, next) {
  next(createError(404));
});
// kết nối database mogoose
mongoose
  .connect("mongodb://localhost:27017/DATN")
  .then(() => console.log("Kết nối Database thành công"))
  .catch((err) => console.log(err));

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
