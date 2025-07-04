const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/productsModel");
const Category = require("../models/categoryModel");
const Keyword = require("../models/keywordModel"); 
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chatWithBot = async (req, res) => {
  const { message } = req.body;
  const messageLower = message.toLowerCase();

  try {
    //  Lấy toàn bộ keyword từ DB
    const allKeywords = await Keyword.find({});
    
    // Tìm từ khóa có trong câu hỏi
    const matched = allKeywords.filter((kw) =>
      messageLower.includes(kw.word)
    );

    // Chia nhóm theo intent
    const matchedIntent = matched.map(k => k.intent);
    const isProduct = matchedIntent.includes("product");
    const isShipping = matchedIntent.includes("shipping");
    const isReturn = matchedIntent.includes("return");
    const isGeneral = matchedIntent.includes("general");

    // === 1. Câu hỏi về danh mục chung
    if (isGeneral) {
      const categories = await Category.find().select("name");
      const categoryList = categories.map((cat) => cat.name).join(", ");

      const prompt = `Khách hỏi: "${message}".
Bạn là trợ lý tư vấn quần áo thân thiện.
Các danh mục sản phẩm mà shop hiện có gồm: ${categoryList}.
Hãy trả lời ngắn gọn, dễ hiểu, khuyến khích khách chọn danh mục hoặc hỏi thêm.`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });

      const reply = result.response.text();
      return res.status(200).json({ reply });
    }

    // === 2. Giao hàng
    if (isShipping) {
      const prompt = `Khách hỏi: "${message}".
Bạn là trợ lý thân thiện của shop quần áo.
Chính sách giao hàng như sau:
- Miễn phí vận chuyển **nội thành** nếu mua từ **3 sản phẩm trở lên**
- Giao hàng **nội địa** (ngoài nội thành) có **phí ship 30.000 VNĐ**
Hãy trả lời rõ ràng, ngắn gọn, thân thiện, chuyên nghiệp.`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });

      const reply = result.response.text();
      return res.status(200).json({ reply });
    }

    // === 3. Đổi trả
    if (isReturn) {
      const prompt = `Khách hỏi: "${message}".
Bạn là trợ lý tư vấn quần áo của shop.
Chính sách đổi trả như sau:
- Shop **hỗ trợ đổi trả trong vòng 7 ngày** kể từ khi nhận hàng.
- Áp dụng cho các sản phẩm còn nguyên tem mác, chưa qua sử dụng.
- **Không áp dụng** cho đồ lót, đồ giảm giá hoặc hàng đã qua sử dụng.
- Khách cần liên hệ fanpage hoặc hotline để được hỗ trợ nhanh chóng.
Hãy trả lời thân thiện, ngắn gọn và rõ ràng, chuyên nghiệp.`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });

      const reply = result.response.text();
      return res.status(200).json({ reply });
    }

    // === 4. Tìm sản phẩm
    if (isProduct) {
      const orConditions = matched
        .filter(k => k.intent === "product")
        .map((kw) => ({
          name: { $regex: kw.word, $options: "i" },
        }));

      const products = await Product.find({ $or: orConditions }).limit(5);
      let productInfo = "";

      if (products.length > 0) {
        productInfo = products
          .map(
            (p) =>
              `- ${p.name}: Giá ${p.price} VNĐ. Mô tả: ${p.description || "Không có mô tả"}`
          )
          .join("\n");
      } else {
        productInfo = "Hiện tại không tìm thấy sản phẩm phù hợp.";
      }

      const promptText = `Khách hỏi: "${message}".
Bạn là trợ lý tư vấn quần áo thân thiện, ngắn gọn, chuyên nghiệp.
Dưới đây là thông tin sản phẩm liên quan bạn có thể tham khảo:
${productInfo}`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ parts: [{ text: promptText }] }],
      });

      const reply = result.response.text();
      return res.status(200).json({ reply });
    }

    // === 5. Không rõ => tự động lưu từ mới
    const exists = await Keyword.findOne({ word: messageLower });
    if (!exists) {
      await Keyword.create({
        word: messageLower,
        intent: "unknown", // có thể để trống, gắn intent sau
      });
    }

    return res.status(200).json({
      reply: "Bạn vui lòng cho biết rõ loại sản phẩm hoặc thông tin bạn cần nhé!",
    });
  } catch (err) {
    console.error("❌ Gemini API Error:", err);
    return res.status(500).json({
      error: "Lỗi khi gọi AI",
      detail: err.message || "Không rõ lỗi",
    });
  }
};

// === Lời chào ban đầu
const welcomeMessage = async (req, res) => {
  try {
    const categories = await Category.find().select("name");
    const categoryList = categories.map((cat) => cat.name).join(", ");

    const prompt = `Bạn là trợ lý tư vấn quần áo thân thiện cho khách hàng mới truy cập website.
Hãy chào hỏi ngắn gọn và liệt kê các danh mục sản phẩm hiện có: ${categoryList}.
Gợi ý khách hãy nhắn tên danh mục hoặc sản phẩm mà họ quan tâm để được gợi ý.`;

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent({
      contents: [{ parts: [{ text: prompt }] }],
    });

    const reply = result.response.text();
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ Welcome AI Error:", err);
    return res.status(500).json({
      error: "Lỗi tạo lời chào",
      detail: err.message || "Không rõ lỗi",
    });
  }
};

module.exports = { chatWithBot, welcomeMessage };
