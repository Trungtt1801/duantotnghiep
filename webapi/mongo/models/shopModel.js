const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      // Nếu mỗi user chỉ có 1 shop, có thể bật unique:
      // unique: true,
    },
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    phone: { type: String, required: true, match: /^[0-9]{9,15}$/ },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/,
      // Nếu cần đảm bảo email shop duy nhất:
      // unique: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
    },
    description: { type: String, default: "" },
    avatar: { type: String, default: "" },
    banner: { type: String, default: "" },

    sale_count: { type: Number, default: 0 },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },

    // Bỏ index: true để tránh trùng lặp, index được khai báo ở dưới
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: số người follow
shopSchema.virtual("followers_count").get(function () {
  return Array.isArray(this.followers) ? this.followers.length : 0;
});

// Giữ điểm rating trong khoảng [0..5]
shopSchema.pre("save", function (next) {
  if (this.rating) {
    if (typeof this.rating.average === "number") {
      this.rating.average = Math.max(0, Math.min(5, this.rating.average));
    }
    if (typeof this.rating.count === "number") {
      this.rating.count = Math.max(0, this.rating.count);
    }
  }
  next();
});

// Index phụ trợ (không trùng lặp)
shopSchema.index({ followers: 1 });
shopSchema.index({ user_id: 1 });
// Nếu muốn 1 user chỉ có 1 shop:
// shopSchema.index({ user_id: 1 }, { unique: true });

/** ======= Helper methods cho follow ======= */
// Check đang follow?
shopSchema.methods.isFollowing = function (userId) {
  return this.followers?.some((f) => String(f) === String(userId));
};

// Follow (không trùng)
shopSchema.methods.follow = async function (userId) {
  if (!this.isFollowing(userId)) {
    this.followers.push(userId);
    await this.save();
  }
  return this;
};

// Unfollow
shopSchema.methods.unfollow = async function (userId) {
  this.followers = (this.followers || []).filter((f) => String(f) !== String(userId));
  await this.save();
  return this;
};

// Toggle follow/unfollow
shopSchema.methods.toggleFollow = async function (userId) {
  return this.isFollowing(userId) ? this.unfollow(userId) : this.follow(userId);
};

module.exports = mongoose.model("Shop", shopSchema);
