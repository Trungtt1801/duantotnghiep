  const express = require("express");
  const router = express.Router();
  const chat = require("../mongo/controllers/messengerController");
  const multer = require("multer");
  const path = require("path");
  const fs = require("fs");

  // =============== STATIC DIR ===============
  const UPLOAD_DIR = path.join(__dirname, "../public/images");
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // =============== MULTER CONFIG ===============
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
      // giữ nguyên tên gốc
      cb(null, file.originalname);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // tối đa 50MB
  });

  // helper để tạo URL ảnh
  function mapImagePath(file) {
    return file ? `http://localhost:3000/api/images/
${file.filename}` : "";
  }

  // =============== CHAT API ===============
  router.post("/threads/open", chat.openThread);
  router.get("/threads/me/user", chat.listMyUserThreads);
  router.get("/threads/me/seller", chat.listMySellerThreads);
  router.get("/threads/:thread_id/messages", chat.getMessages);
  router.post("/threads/:thread_id/messages", chat.sendMessage);
  router.post("/threads/:thread_id/read", chat.markRead);

  // =============== UPLOAD ===============
  router.post("/upload", upload.array("files", 5), (req, res) => {
    try {
      const files = (req.files || []).map((f) => {
        const type = f.mimetype.startsWith("image/")
          ? "image"
          : f.mimetype.startsWith("video/")
          ? "video"
          : "file";

        return {
          url: mapImagePath(f),       // URL công khai
          name: f.originalname,       // tên gốc để hiển thị
          type,
          mimetype: f.mimetype,
          size: f.size,
          filename: f.filename,       // tên file lưu trong thư mục
        };
      });

      return res.json(files);
    } catch (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ message: "Upload failed" });
    }
  });

  module.exports = router;
