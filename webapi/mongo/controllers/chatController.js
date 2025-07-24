const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/productsModel");
const Category = require("../models/categoryModel");
const Keyword = require("../models/keywordModel");
const ProductVariant = require("../models/productVariantModel");
const ChatHistory = require("../models/historychatModel");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const knownIntents = ["product", "shipping", "return", "general"];

const detectIntentByAI = async (message) => {
  const prompt = `
Người dùng hỏi: "${message}"
Phân loại câu này vào một trong các nhóm sau:
- "product": hỏi về sản phẩm, đồ, quần áo, tìm đồ mua
- "shipping": hỏi về giao hàng, phí ship, vận chuyển
- "return": hỏi về đổi trả, hoàn hàng
- "general": hỏi shop bán gì, có gì
- "other": nếu không thuộc nhóm nào

Chỉ trả lời đúng 1 từ: product / shipping / return / general / other.
  `;

  const result = await model.generateContent({
    contents: [{ parts: [{ text: prompt }] }],
  });

  return result.response.text().trim().toLowerCase();
};

const chatWithBot = async (req, res) => {
  // Lưu ý: yêu cầu FE gửi cả userId và message
  const { message, userId } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Thiếu message" });
  }

  const messageLower = message.toLowerCase();

  try {
    const allKeywords = await Keyword.find({});
    const matched = allKeywords.filter((kw) => messageLower.includes(kw.word));
    const matchedIntent = matched.map((k) => k.intent);

    const isProduct = matchedIntent.includes("product");
    const isShipping = matchedIntent.includes("shipping");
    const isReturn = matchedIntent.includes("return");
    const isGeneral = matchedIntent.includes("general");

    let prompt = "";
    let reply = "";

    // === 1. Hỏi về danh mục
    if (isGeneral) {
      const categories = await Category.find().select("name");
      const categoryList = categories.map((cat) => cat.name).join(", ");
      prompt = `
Khách hỏi: "${message}".
Bạn là trợ lý tư vấn sản phẩm thân thiện. Danh mục hiện có gồm: ${categoryList}.
Viết câu trả lời ngắn gọn, tự nhiên, không sử dụng dấu sao.
      `;

      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });
      reply = result.response.text().trim();
      if (userId) {
        await saveChatHistory(userId, message, reply);
      }

      return res.status(200).json({ reply });
    }

    // === 2. Hỏi về giao hàng
    if (isShipping) {
      prompt = `
Khách hỏi: "${message}".
Chính sách giao hàng: miễn phí nội thành nếu mua từ 3 sản phẩm trở lên. Ngoại thành tính phí 30.000 VNĐ.
Viết câu trả lời rõ ràng, thân thiện, không dùng định dạng Markdown.
      `;

      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });
      reply = result.response.text().trim();
      if (userId) {
        await saveChatHistory(userId, message, reply);
      }

      return res.status(200).json({ reply });
    }

    // === 3. Hỏi về đổi trả
    if (isReturn) {
      prompt = `
Khách hỏi: "${message}".
Chính sách đổi trả: hỗ trợ trong 7 ngày nếu sản phẩm còn tem mác, chưa sử dụng. Không áp dụng với đồ lót hoặc hàng giảm giá.
Viết câu trả lời thân thiện, dễ hiểu, không dùng dấu ** hoặc đặc biệt.
      `;
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });
      reply = result.response.text().trim();
      if (userId) {
        await saveChatHistory(userId, message, reply);
      }

      return res.status(200).json({ reply });
    }

    // === 4. Hỏi về sản phẩm
    if (isProduct) {
      const orConditions = matched
        .filter((k) => k.intent === "product")
        .map((kw) => ({ name: { $regex: kw.word, $options: "i" } }));

      const products = await Product.find({ $or: orConditions }).limit(3);
      let productInfo = "";

      for (const product of products) {
        const productVariants = await ProductVariant.findOne({
          product_id: product._id,
        });
        let variantInfo = "";

        if (productVariants) {
          for (const v of productVariants.variants) {
            const sizes = v.sizes
              .map((s) => `${s.size} (${s.quantity} cái)`)
              .join(", ");
            variantInfo += `- Màu: ${v.color}, Size: ${sizes}\n`;
          }
        }

        productInfo += `
${product.name}
Giá: ${product.price.toLocaleString()} VNĐ
${product.description || ""}
${variantInfo}
`;
      }

     const prompt = `
Khách hàng vừa hỏi: "${message}"

Danh sách sản phẩm gợi ý:
${productInfo || "Hiện tại không tìm thấy sản phẩm phù hợp."}

Hãy viết lại câu trả lời thân thiện, tự nhiên như đang nhắn tin cho khách. Câu trả lời cần:
- Rõ ràng, dễ hiểu.
- Ngắn gọn, tránh dài dòng.
- Không sử dụng định dạng Markdown (không dùng dấu * hay **).
- Nếu không có sản phẩm, hãy xin lỗi khách và gợi ý giúp đỡ thêm.
`;


      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });
      reply = result.response.text().trim();
      if (userId) {
        await saveChatHistory(userId, message, reply);
      }

      return res.status(200).json({ reply });
    }

    // === 5. Không xác định => học từ mới
    const existing = await Keyword.findOne({ word: messageLower });
    if (!existing) {
      const aiIntent = await detectIntentByAI(messageLower);
      const intent = knownIntents.includes(aiIntent) ? aiIntent : "unknown";

      await Keyword.create({ word: messageLower, intent });
      console.log(
        `🧠 Bot học từ mới: "${messageLower}" với intent "${intent}"`
      );
    }

    reply =
      "Bạn vui lòng cho biết rõ loại sản phẩm hoặc thông tin bạn cần nhé!";
    await saveChatHistory(userId, message, reply);
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ ChatBot Error:", err);
    return res.status(500).json({
      error: "Lỗi xử lý yêu cầu",
      detail: err.message || "Không rõ lỗi",
    });
  }
};

// Hàm lưu lịch sử chat
async function saveChatHistory(userId, userMsg, botReply) {
  try {
    const existingChat = await ChatHistory.findOne({ userId });
    if (existingChat) {
      existingChat.messages.push({ role: "user", content: userMsg });
      existingChat.messages.push({ role: "bot", content: botReply });
      existingChat.updatedAt = Date.now();
      await existingChat.save();
    } else {
      const newChat = new ChatHistory({
        userId,
        messages: [
          { role: "user", content: userMsg },
          { role: "bot", content: botReply },
        ],
      });
      await newChat.save();
    }
  } catch (error) {
    console.error("❌ Lỗi khi lưu chat history:", error);
  }
}

// === Chào ban đầu
const welcomeMessage = async (req, res) => {
  try {
    const categories = await Category.find().select("name");
    const categoryList = categories.map((cat) => cat.name).join(", ");
    const prompt = `
Bạn là trợ lý bán hàng của shop quần áo. Hãy chào hỏi thân thiện khách mới và giới thiệu các danh mục hiện có gồm: ${categoryList}.
Viết câu trả lời tự nhiên, KHÔNG dùng định dạng Markdown (** hoặc *).
    `;
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
    });
    const reply = result.response.text().trim();
    await saveChatHistory(req.body.userId, "", reply); // Nếu có userId, hoặc bạn có thể truyền mặc định
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ Welcome Error:", err);
    return res.status(500).json({
      error: "Lỗi tạo lời chào",
      detail: err.message || "Không rõ lỗi",
    });
  }
};

module.exports = { chatWithBot, welcomeMessage };
