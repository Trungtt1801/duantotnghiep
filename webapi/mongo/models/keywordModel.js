const mongoose = require("mongoose");

const keywordSchema = new mongoose.Schema(
  {
    word: { type: String, required: true, unique: true },
    intent: { type: String, default: "unknown" },
  },
  {
    timestamps: true,
    collection: "keywords",
  }
);

module.exports = mongoose.model("Keyword", keywordSchema);
