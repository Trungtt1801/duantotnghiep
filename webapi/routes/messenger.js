const express = require("express");
const router = express.Router();
const chat = require("../mongo/controllers/messengerController");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ================= Upload config =================
const uploadDir = path.join(__dirname, "../uploads");

// đảm bảo thư mục tồn tại
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // tối đa 50MB
});

// ================= Chat API =================

// Tạo/lấy thread
router.post("/threads/open", chat.openThread);

// List theo vai trò
router.get("/threads/me/user",   chat.listMyUserThreads);
router.get("/threads/me/seller", chat.listMySellerThreads);

// Messages
router.get("/threads/:thread_id/messages", chat.getMessages);
router.post("/threads/:thread_id/messages", chat.sendMessage);

// Read
router.post("/threads/:thread_id/read", chat.markRead);

// ================= Upload file =================
// upload 1 hoặc nhiều file (image, video)
router.post("/upload", upload.array("files", 5), (req, res) => {
  try {
    const files = req.files.map(f => {
      // xác định type dựa trên mime
      let type = "file";
      if (f.mimetype.startsWith("image/")) type = "image";
      else if (f.mimetype.startsWith("video/")) type = "video";

      return {
        url: `http://localhost:3000/api/images/${f.filename}`,
        name: f.originalname,
        type,
        size: f.size,
      };
    });
    return res.json(files);
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
