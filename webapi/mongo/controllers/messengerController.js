const ChatThread = require("../models/chatThreadModel");
const ChatMessage = require("../models/chatMessengerModel");
const Shop = require("../models/shopModel");

// Tạo/lấy thread User ↔ Shop
exports.openThread = async (req, res) => {
  try {
    const userId = req.user?._id || req.body.user_id; // có token thì lấy token, không thì lấy từ body
    const { shop_id } = req.body;
    if (!userId || !shop_id) return res.status(400).json({ message: "user_id & shop_id required" });

    let thread = await ChatThread.findOne({ user_id: userId, shop_id });
    if (!thread) thread = await ChatThread.create({ user_id: userId, shop_id });

    const populated = await ChatThread.findById(thread._id)
      .populate("user_id", "name avatar email")
      .populate("shop_id", "name avatar banner");
    return res.json(populated);
  } catch (err) {
    console.error("openThread:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// List thread của USER (từ token)
exports.listMyUserThreads = async (req, res) => {
  try {
    const userId = req.user?._id || req.query.user_id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const threads = await ChatThread.find({ user_id: userId })
      .sort({ updatedAt: -1 })
      .populate("shop_id", "name avatar banner status");
    return res.json(threads);
  } catch (err) {
    console.error("listMyUserThreads:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// List thread của SELLER (user sở hữu shop)
exports.listMySellerThreads = async (req, res) => {
  try {
    const sellerUserId = req.user?._id || req.query.seller_user_id;
    if (!sellerUserId) return res.status(401).json({ message: "Unauthorized" });

    const myShops = await Shop.find({ user_id: sellerUserId }, "_id name avatar");
    if (!myShops.length) return res.json([]);
    const shopIds = myShops.map(s => s._id);

    const threads = await ChatThread.find({ shop_id: { $in: shopIds } })
      .sort({ updatedAt: -1 })
      .populate("user_id", "name avatar email")
      .populate("shop_id", "name avatar");
    return res.json(threads);
  } catch (err) {
    console.error("listMySellerThreads:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Lấy messages (paging)
exports.getMessages = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const msgs = await ChatMessage.find({ thread_id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    return res.json(msgs.reverse());
  } catch (err) {
    console.error("getMessages:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Gửi message
exports.sendMessage = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const { text = "", attachments = [] } = req.body;

    if (!text && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ message: "Empty message" });
    }

    const thread = await ChatThread.findById(thread_id).populate("shop_id", "user_id");
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const currentUserId = String(req.user?._id || req.body.user_id || "");
    let sender; // "user" | "seller"

    if (currentUserId && String(thread.user_id) === currentUserId) {
      sender = "user";
    } else if (currentUserId && String(thread.shop_id.user_id) === currentUserId) {
      sender = "seller";
    } else if (req.body.sender === "user" || req.body.sender === "seller") {
      sender = req.body.sender; // fallback khi chưa gắn auth
    } else {
      return res.status(403).json({ message: "Not allowed in this thread" });
    }

    const senderRole = sender;                         // "user" | "seller"
    const otherRole  = sender === "user" ? "seller" : "user";

    // 1) Người gửi coi như đã đọc hết tin trước đó
    await ChatMessage.updateMany(
      { thread_id, readBy: { $ne: senderRole } },
      { $addToSet: { readBy: senderRole } }           // tránh trùng
    );
    if (senderRole === "user") thread.unread_user = 0;
    else                        thread.unread_seller = 0;

    // 2) Tạo message mới (người gửi luôn đọc tin của mình)
    const msg = await ChatMessage.create({
      thread_id,
      sender: senderRole,
      text,
      attachments,
      readBy: [senderRole],
    });

    // 3) Cập nhật lastMessage & tăng unread phía còn lại
    thread.lastMessage = { text: text || "[file]", at: msg.createdAt, from: senderRole };
    if (otherRole === "user")  thread.unread_user  = (thread.unread_user  || 0) + 1;
    else                       thread.unread_seller = (thread.unread_seller || 0) + 1;

    await thread.save();

    return res.json(msg);
  } catch (err) {
    console.error("sendMessage:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// Đánh dấu đã đọc cho 1 phía
// Đánh dấu đã đọc cho 1 phía
exports.markRead = async (req, res) => {
  try {
    const { thread_id } = req.params;
    const thread = await ChatThread.findById(thread_id).populate("shop_id", "user_id");
    if (!thread) return res.status(404).json({ message: "Thread not found" });

    const currentUserId = String(req.user?._id || req.body.user_id || "");
    let role; // "user" | "seller"

    if (currentUserId && String(thread.user_id) === currentUserId) role = "user";
    else if (currentUserId && String(thread.shop_id.user_id) === currentUserId) role = "seller";
    else if (req.body.role === "user" || req.body.role === "seller") role = req.body.role;
    else return res.status(403).json({ message: "Not allowed in this thread" });

    await ChatMessage.updateMany(
      { thread_id, readBy: { $ne: role } },
      { $addToSet: { readBy: role } } // ✅ tránh trùng
    );

    if (role === "user") thread.unread_user = 0;
    else                 thread.unread_seller = 0;
    await thread.save();

    return res.json({ ok: true });
  } catch (err) {
    console.error("markRead:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
