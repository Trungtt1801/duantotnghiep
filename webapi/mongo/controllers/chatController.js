const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/productsModel");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const chatWithBot = async (req, res) => {
  const { message } = req.body;
  const messageLower = message.toLowerCase();

  try {
    // Danh sách từ khóa sản phẩm bạn có thể mở rộng thêm
    const productKeywords = [
      "áo phông",
      "áo thun",
      "áo sơ mi",
      "bộ quần áo",
      "quần áo thể thao",
      "chống nắng",
      "đồ ngủ",
      "quần áo mặc tại nhà",
      "quần soóc",
      "quần short",
      "quần dài",
      "quần jean",
      "quần áo nỉ",
      "áo khoác",
      "giữ nhiệt",
      "áo len",
      "đồ lót",
      "tất/vớ",
    ];

    // Tìm từ khóa có trong câu hỏi
    const foundKeywords = productKeywords.filter((kw) =>
      messageLower.includes(kw)
    );

    if (foundKeywords.length === 0) {
      return res.status(200).json({
        reply: "Bạn vui lòng cho biết rõ loại sản phẩm bạn muốn tìm nhé!",
      });
    }

    // Tạo điều kiện tìm kiếm MongoDB dựa trên các từ khóa tìm được
    const orConditions = foundKeywords.map((kw) => ({
      name: { $regex: kw, $options: "i" },
    }));

    const products = await Product.find({ $or: orConditions }).limit(5);

    // Tạo thông tin sản phẩm để chèn vào prompt AI
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

    // Tạo prompt cho Gemini AI
    const promptText = `Khách hỏi: "${message}".
Bạn là trợ lý tư vấn quần áo thân thiện, ngắn gọn.
Dưới đây là thông tin sản phẩm liên quan bạn có thể tham khảo:
${productInfo}
`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    const result = await model.generateContent({
      contents: [
        {
          parts: [{ text: promptText }],
        },
      ],
    });

    const reply = result.response.text();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error("❌ Gemini API Error:", err);
    return res.status(500).json({
      error: "Lỗi khi gọi AI",
      detail: err.message || "Không rõ lỗi",
    });
  }
};

module.exports = { chatWithBot };
