const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * Message trong thread
 */
const ChatMessageSchema = new Schema(
  {
    thread_id: { type: Schema.Types.ObjectId, ref: "ChatThread", required: true },

    // ai gửi
    sender: { type: String, enum: ["user", "seller"], required: true },

    // nội dung text
    text: { type: String, default: "" },

    // file đính kèm (ảnh / video / pdf...)
    attachments: [
      {
        url:  { type: String },  // link public: https://fiyo.click/api/images/xxx.png|.mp4
        name: { type: String },  // tên file gốc
        type: { type: String },  // "image" | "video" | "file"
        size: { type: Number },  // dung lượng bytes
      }
    ],

    // đã đọc bởi phía nào
    readBy: [{ type: String, enum: ["user", "seller"] }],
  },
  { timestamps: true }
);

// index để query nhanh tin nhắn trong 1 thread
ChatMessageSchema.index({ thread_id: 1, createdAt: 1 });

module.exports =
  mongoose.models.ChatMessage ||
  mongoose.model("ChatMessage", ChatMessageSchema);
