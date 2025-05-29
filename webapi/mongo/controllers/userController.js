const usersModel = require('../models/userModels');
const bcryptjs = require('bcryptjs');

async function getAllUsers() {
  try {
    const users = await usersModel.find().select('-password');
    return users;
  } catch (error) {
    console.error(error.message);
    throw new Error('Lỗi lấy dữ liệu người dùng');
  }
}

async function register(data) {
  try {
    const { name, email, password, role, phone } = data;

    let user = await usersModel.findOne({ email });
    if (user) {
      throw new Error('Email đã tồn tại!');
    }

    const salt = bcryptjs.genSaltSync(10);
    const hashedPassword = bcryptjs.hashSync(password, salt);

    const userRole = typeof role !== 'undefined' ? role : 1;

    user = new usersModel({
      name,
      email,
      password: hashedPassword,
      role: userRole,
      phone,
    });

    const result = await user.save();

    const userData = { ...result._doc };
    delete userData.password;

    return userData;
  } catch (error) {
    console.error(error.message);
    throw new Error(error.message || 'Lỗi đăng ký');
  }
}

async function login(data) {
  try {
    const { email, password } = data;

    let user = await usersModel.findOne({ email }).select('+password');
    if (!user) {
      throw new Error('Email chưa được đăng ký!');
    }

    const isPasswordValid = bcryptjs.compareSync(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Sai mật khẩu!');
    }

    const userData = { ...user._doc };
    delete userData.password;

    return userData;
  } catch (error) {
    console.error(error.message);
    throw new Error(error.message || 'Lỗi đăng nhập');
  }
}

module.exports = { register, getAllUsers, login };
