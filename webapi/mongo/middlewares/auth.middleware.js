const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './token.env' });

function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer token

  if (!token) {
    return res.status(401).json({ message: 'Không có token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.PRIVATE_KEY);
    req.user = decoded; 
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
}

function verifyAdmin(req, res, next) {
  if (req.user?.role !== 1) {
    return res.status(403).json({ message: 'Chỉ admin mới được phép truy cập' });
  }
  next();
}

module.exports = { verifyToken, verifyAdmin };
