const mongoose = require("mongoose");
const { Schema } = mongoose;

/**
 * 1 thread = 1 user ↔ 1 shop
 */
const ChatThreadSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true }, 
    shop_id: { type: Schema.Types.ObjectId, ref: "Shop", required: true },

    lastMessage: {
      text: { type: String, default: "" },
      at:   { type: Date },
      from: { type: String, enum: ["user", "seller"], default: "user" }, //  "user"
    },

    unread_user:   { type: Number, default: 0 }, // ⬅ đổi tên
    unread_seller: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Không cho trùng cặp user + shop
ChatThreadSchema.index({ user_id: 1, shop_id: 1 }, { unique: true });
ChatThreadSchema.index({ updatedAt: -1 });

module.exports =
  mongoose.models.ChatThread || mongoose.model("ChatThread", ChatThreadSchema);
