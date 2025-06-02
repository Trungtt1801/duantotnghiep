var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const mongoose = require('mongoose');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/user');
var productRouter = require('./routes/products');
var categoryRouter = require('./routes/category');
var cartRouter = require('./routes/cart');
<<<<<<< HEAD
var productvariantRouter = require('./routes/productVariant')
var cartRouter = require('./routes/cart');
=======
var productvariantRouter = require('./routes/productvariant');
var cartRouter = require('./routes/cart');


>>>>>>> 8a2617a296800faabdeb7b373c8192cb0d6efc4f
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/user', usersRouter); 
app.use('/products', productRouter); 
app.use('/category', categoryRouter);
app.use('/variant', productvariantRouter);
app.use('/cart', cartRouter);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
// kết nối database mogoose
mongoose.connect('mongodb://localhost:27017/DATN')
.then(() => console.log('Kết nối Database thành công'))
.catch(err=> console.log(err))

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
