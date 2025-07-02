const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/productsModel");
const Category = require("../models/categoryModel");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Danh sách từ khóa
const productKeywords = [
  "áo phông", "áo thun", "áo sơ mi", "bộ quần áo", "quần áo thể thao",
  "chống nắng", "đồ ngủ", "quần áo mặc tại nhà", "quần soóc", "quần short",
  "quần dài", "quần jean", "quần áo nỉ", "áo khoác", "giữ nhiệt", "áo len",
  "đồ lót", "tất", "vớ"
];

const generalShopQuestions = [
  "shop bán gì", "có những sản phẩm nào", "bán gì", "bạn bán gì",
  "danh mục sản phẩm", "có đồ gì", "bán mặt hàng nào", "có mặt hàng nào",
  "shop có gì"
];

const shippingQuestions = [
  "phương thức giao hàng", "giao hàng thế nào", "có ship không",
  "vận chuyển như nào", "ship hàng", "phí vận chuyển", "giao hàng bao lâu",
  "giao hàng trong bao lâu", "miễn phí vận chuyển", "có freeship không",
  "ship nội địa", "ship trong thành phố"
];

const returnPolicyQuestions = [
  "hoàn hàng", "đổi trả", "trả hàng", "đổi size", "đổi màu", "đổi sản phẩm",
  "chính sách hoàn hàng", "chính sách đổi trả", "trả lại hàng", "đổi đồ"
];
const categoryKeywords = [
  "nam", "nữ", "phụ kiện", "trẻ em", "unisex", "đồ nam", "đồ nữ", "áo nam", "áo nữ"
];

const chatWithBot = async (req, res) => {
  const { message } = req.body;
  const messageLower = message.toLowerCase();

  try {
    // Những câu hỏi thường gặp từ khách hàng
    const isGeneralShopQuestion = generalShopQuestions.some((q) =>
      messageLower.includes(q)
    );
    if (isGeneralShopQuestion) {
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

    // Giao hàng và vận chuyển
    const isShippingQuestion = shippingQuestions.some((q) =>
      messageLower.includes(q)
    );
    if (isShippingQuestion) {
      const prompt = `Khách hỏi: "${message}".
Bạn là trợ lý thân thiện của shop quần áo.
Chính sách giao hàng như sau:
- Miễn phí vận chuyển **nội thành** nếu mua từ **3 sản phẩm trở lên**
- Giao hàng **nội địa** (ngoài nội thành) có **phí ship 30.000 VNĐ**
Hãy trả lời rõ ràng, ngắn gọn, thân thiện.`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });
      const reply = result.response.text();
      return res.status(200).json({ reply });
    }

    // về mặt đổi trả hàng
    const isReturnPolicyQuestion = returnPolicyQuestions.some((q) =>
      messageLower.includes(q)
    );
    if (isReturnPolicyQuestion) {
      const prompt = `Khách hỏi: "${message}".
Bạn là trợ lý tư vấn quần áo của shop.
Chính sách đổi trả như sau:
- Shop **hỗ trợ đổi trả trong vòng 7 ngày** kể từ khi nhận hàng.
- Áp dụng cho các sản phẩm còn nguyên tem mác, chưa qua sử dụng.
- **Không áp dụng** cho đồ lót, đồ giảm giá hoặc hàng đã qua sử dụng.
- Khách cần liên hệ fanpage hoặc hotline để được hỗ trợ nhanh chóng.
Hãy trả lời thân thiện, ngắn gọn và rõ ràng.`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });
      const reply = result.response.text();
      return res.status(200).json({ reply });
    }

    // === INTENT 4: Tìm sản phẩm ===
    const foundKeywords = productKeywords.filter((kw) =>
      messageLower.includes(kw)
    );

    if (foundKeywords.length > 0) {
      const orConditions = foundKeywords.map((kw) => ({
        name: { $regex: kw, $options: "i" },
      }));

      const products = await Product.find({ $or: orConditions }).limit(5);
      let productInfo = "";

      if (products.length > 0) {
        productInfo = products
          .map(
            (p) =>
              `- ${p.name}: Giá ${p.price} VNĐ. Mô tả: ${
                p.description || "Không có mô tả"
              }`
          )
          .join("\n");
      } else {
        productInfo = "Hiện tại không tìm thấy sản phẩm phù hợp.";
      }

      const promptText = `Khách hỏi: "${message}".
Bạn là trợ lý tư vấn quần áo thân thiện, ngắn gọn.
Dưới đây là thông tin sản phẩm liên quan bạn có thể tham khảo:
${productInfo}`;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ parts: [{ text: promptText }] }],
      });

      const reply = result.response.text();
      return res.status(200).json({ reply });
    }

    // === INTENT 5: Không rõ yêu cầu ===
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

// Tin nhắn chào hỏi ban đầu
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
