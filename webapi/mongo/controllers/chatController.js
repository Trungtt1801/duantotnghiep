const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/productsModel");
const Category = require("../models/categoryModel");
const Keyword = require("../models/keywordModel");
const ProductVariant = require("../models/productVariantModel");
const ChatHistory = require("../models/historychatModel");
const AddressModel = require("../models/addressModel");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const knownIntents = [
  "product",
  "shipping",
  "return",
  "general",
  "order",
  "order_confirm",
  "greeting",
  "add_to_cart",
];

const detectIntentByAI = async (message) => {
  const prompt = `
Người dùng hỏi: "${message}"
Phân loại câu này vào một trong các nhóm sau:
- "product": hỏi về sản phẩm, đồ, quần áo, tìm đồ mua
- "shipping": hỏi về giao hàng, phí ship, vận chuyển
- "return": hỏi về đổi trả, hoàn hàng
- "general": hỏi shop bán gì, có gì
- "order": đặt mua hàng
- "order_confirm": xác nhận đặt hàng
- "greeting": chào hỏi như xin chào, chào, hello, hi
- "other": nếu không thuộc nhóm nào
- "add_to_cart": người dùng yêu cầu thêm sản phẩm vào giỏ hàng, lưu sản phẩm để mua sau


Chỉ trả lời đúng 1 từ: product / shipping / return / general / order / order_confirm / greeting / other / add_to_cart.
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
    const isOrder = matchedIntent.includes("order");
    const isOrderConfirm = matchedIntent.includes("order_confirm");
    const isGreeting = matchedIntent.includes("greeting");
    const isAddToCart = matchedIntent.includes("add_to_cart");


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
    if (isGreeting) {
      const prompt = `
Người dùng vừa chào: "${message}".
Bạn là trợ lý bán hàng thân thiện. Hãy chào lại khách và hỏi xem khách muốn tìm sản phẩm gì.
Không dùng dấu ** hoặc *.
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
  let chatHistory = [];
  if (userId) {
    const existingChat = await ChatHistory.findOne({ userId });
    if (existingChat) {
      chatHistory = existingChat.messages
        .slice(-6) 
        .map(m => `${m.role === "user" ? "Khách" : "Bot"}: ${m.content}`)
        .join("\n");
    }
  }

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

  let prompt = `
Lịch sử trò chuyện gần đây:
${chatHistory}

Khách hàng vừa hỏi: "${message}"
`;

  if (products.length > 0) {
    prompt += `
Danh sách sản phẩm phù hợp:
${productInfo}

Hãy viết câu trả lời thân thiện, tự nhiên như đang nhắn tin cho khách.
- Nếu khách đã cung cấp chiều cao và cân nặng trước đó, hãy tư vấn size luôn.
- Nếu chưa có thông tin chiều cao và cân nặng, hãy hỏi thêm.
- Tránh dài dòng, không dùng định dạng Markdown.
`;
  } else {
    prompt += `
Hiện tại không tìm thấy sản phẩm phù hợp.

Hãy viết câu trả lời thân thiện, tự nhiên:
- Xin lỗi khách.
- Gợi ý họ mô tả rõ hơn để shop có thể tìm sản phẩm phù hợp.
- Không dùng định dạng Markdown.
`;
  }

  const result = await model.generateContent({
    contents: [{ parts: [{ text: prompt }] }],
  });

  reply = result.response.text().trim();

  if (userId) {
    await saveChatHistory(userId, message, reply);
  }

  return res.status(200).json({ reply });
}

    // === 5. Đặt hàng tự động
    if (isOrder) {
      // 1. Hỏi Gemini trích xuất thông tin đặt hàng
      prompt = `
Người dùng: "${message}"

Trích xuất dưới dạng JSON với các trường:
- "product": tên sản phẩm
- "quantity": số lượng (số)
- "color": màu (nếu có)
- "size": size (nếu có)

Nếu thiếu thông tin, để trống chuỗi. KHÔNG trả lời văn bản, chỉ trả JSON.
`;

      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });

      let extracted = {};
      try {
        extracted = JSON.parse(result.response.text());
      } catch (e) {
        return res.status(200).json({
          reply:
            "Tui chưa hiểu rõ bạn muốn đặt gì, bạn có thể nói rõ hơn không?",
        });
      }

      const { product, quantity, color, size } = extracted;

      if (!product || !quantity || !color || !size) {
        return res.status(200).json({
          reply: `Bạn vui lòng cung cấp đầy đủ thông tin: tên sản phẩm, số lượng, màu sắc, và size nhé.`,
        });
      }

      // 2. Tìm sản phẩm và variant phù hợp
      const foundProduct = await Product.findOne({
        name: new RegExp(product, "i"),
      });
      if (!foundProduct) {
        return res
          .status(200)
          .json({ reply: `Tui không tìm thấy sản phẩm "${product}" rồi 🥲` });
      }

      const variant = await ProductVariant.findOne({
        product_id: foundProduct._id,
        "variants.color": { $regex: color, $options: "i" },
        "variants.sizes.size": size,
      });

      if (!variant) {
        return res.status(200).json({
          reply: `Không tìm thấy phiên bản phù hợp với màu "${color}" và size "${size}".`,
        });
      }

      // 3. Lấy variantId & tạo đơn
      const matchedVariant = variant.variants.find(
        (v) => v.color.toLowerCase() === color.toLowerCase()
      );

      const sizeObj = matchedVariant.sizes.find((s) => s.size === size);
      if (!sizeObj || sizeObj.quantity < quantity) {
        return res
          .status(200)
          .json({ reply: `Số lượng sản phẩm không đủ trong kho 😢` });
      }

      const variantId = variant._id;
      const resultOrder = await autoCreateOrderFromChat({
        userId,
        productId: foundProduct._id,
        variantId,
        quantity,
        paymentMethod: "cod", // Hoặc lấy từ user nếu có chọn
        isGuest: !userId,
      });

      if (!resultOrder.success) {
        return res
          .status(200)
          .json({ reply: `Tạo đơn hàng thất bại: ${resultOrder.message}` });
      }

      const finalReply = `Tui đã tạo đơn hàng cho bạn: ${quantity} x ${product} (màu ${color}, size ${size}). Cảm ơn bạn nhiều lắm! 😘`;

      if (userId) {
        await saveChatHistory(userId, message, finalReply);
      }

      return res.status(200).json({ reply: finalReply });
    }
    if (isOrderConfirm) {
      const chat = await ChatHistory.findOne({ userId }).sort({
        updatedAt: -1,
      });
      if (!chat || !chat.messages || chat.messages.length < 2) {
        return res
          .status(200)
          .json({ reply: "Hiện tại không có đơn hàng nào để xác nhận." });
      }

      // Giả định tin nhắn gần nhất từ bot có chứa gợi ý đặt hàng (tùy cấu trúc bạn muốn)
      const lastBotMsg = [...chat.messages]
        .reverse()
        .find((m) => m.role === "bot" && m.content.includes("Tổng cộng"));
      if (!lastBotMsg) {
        return res.status(200).json({
          reply: "Tui không thấy thông tin đơn hàng để xác nhận nha 😅",
        });
      }

      // Tạm thời bạn có thể phân tích lại từ nội dung bot gửi trước (nếu muốn lưu đơn tạm thì chuẩn hơn)
      const prompt = `
Đoạn văn sau là phản hồi của bot khi khách đặt hàng: "${lastBotMsg.content}"

Hãy trích xuất thông tin đặt hàng dạng JSON với các trường sau:
- "product": tên sản phẩm
- "quantity": số lượng
- "color": màu
- "size": size

Chỉ trả về JSON, không thêm văn bản.
`;

      const result = await model.generateContent({
        contents: [{ parts: [{ text: prompt }] }],
      });

      let extracted = {};
      try {
        extracted = JSON.parse(result.response.text());
      } catch (e) {
        return res
          .status(200)
          .json({ reply: "Tui không hiểu rõ đơn hàng bạn muốn xác nhận 😥" });
      }

      const { product, quantity, color, size } = extracted;

      if (!product || !quantity || !color || !size) {
        return res.status(200).json({
          reply: `Thiếu thông tin rồi, tui chưa xác nhận được đơn 😓`,
        });
      }

      // Tìm và tạo đơn như phần xử lý trong isOrder
      const foundProduct = await Product.findOne({
        name: new RegExp(product, "i"),
      });
      if (!foundProduct) {
        return res
          .status(200)
          .json({ reply: `Tui không tìm thấy sản phẩm "${product}" rồi 🥲` });
      }

      const variant = await ProductVariant.findOne({
        product_id: foundProduct._id,
        "variants.color": { $regex: color, $options: "i" },
        "variants.sizes.size": size,
      });

      if (!variant) {
        return res.status(200).json({
          reply: `Không tìm thấy phiên bản phù hợp với màu "${color}" và size "${size}".`,
        });
      }

      const matchedVariant = variant.variants.find(
        (v) => v.color.toLowerCase() === color.toLowerCase()
      );

      const sizeObj = matchedVariant.sizes.find((s) => s.size === size);
      if (!sizeObj || sizeObj.quantity < quantity) {
        return res
          .status(200)
          .json({ reply: `Số lượng không đủ trong kho để đặt hàng.` });
      }

      const variantId = variant._id;

      const resultOrder = await autoCreateOrderFromChat({
        userId,
        productId: foundProduct._id,
        variantId,
        quantity,
        paymentMethod: "cod",
        isGuest: !userId,
      });

      if (!resultOrder.success) {
        return res
          .status(200)
          .json({ reply: `Tạo đơn hàng thất bại: ${resultOrder.message}` });
      }

      const replyConfirm = `Tui đã xác nhận và tạo đơn hàng cho bạn: ${quantity} x ${product} (màu ${color}, size ${size}). Cảm ơn bạn nhiều nha! 🛍️`;

      await saveChatHistory(userId, message, replyConfirm);

      return res.status(200).json({ reply: replyConfirm });
    }
if (isAddToCart) {
  const product = await Product.findOne({ name: { $regex: message, $options: "i" } });

  if (!product) {
    return res.status(200).json({
      type: "message",
      reply: "Xin lỗi, mình không tìm thấy sản phẩm bạn muốn thêm vào giỏ hàng."
    });
  }

  return res.status(200).json({
    type: "add_to_cart",
    products: [
      {
        id: product._id,
        name: product.name,
        image: product.image || "", // Thêm ảnh để FE render
        price: product.price,
        quantity: 1
      }
    ],
    reply: `Mình đã thêm ${product.name} vào giỏ hàng giúp bạn!`
  });
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
      "Hiện tại shop mình chưa có sản phẩm bạn cần tìm chỉ có các danh mục như: Áo phông, Áo sơ mi, Áo thun, Áo polo,... cho Nam, Nữ và Trẻ em. Bạn có thể tham khảo các mặt hàng như trên để mình tư vấn rõ cho bạn nhé!";
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

async function autoCreateOrderFromChat({
  userId,
  productId,
  variantId,
  quantity = 1,
  paymentMethod = "cod",
  isGuest = false,
  guestAddress,
}) {
  try {
    const variant = await ProductVariant.findById(variantId);
    if (!variant) throw new Error("Không tìm thấy phiên bản sản phẩm");

    const total_price = variant.price * quantity;

    // Địa chỉ (user hoặc guest)
    let address_id = null;
    let address_guess = null;

    if (isGuest && guestAddress) {
      address_guess = guestAddress;
    } else {
      // Lấy địa chỉ mặc định của user (nếu cần)
      const userAddress = await AddressModel.findOne({
        user_id: userId,
        is_default: true,
      });
      if (!userAddress) throw new Error("Không tìm thấy địa chỉ người dùng");
      address_id = userAddress._id;
    }

    // Tạo đơn hàng
    const newOrder = await OrderModel.create({
      total_price,
      status_order: "pending",
      transaction_status: "unpaid",
      payment_method: paymentMethod,
      user_id: isGuest ? null : userId,
      address_id,
      address_guess,
      status_history: [{ status: "pending" }],
    });

    // Tạo chi tiết đơn hàng
    await OrderDetailModel.create({
      order_id: newOrder._id,
      product_id: productId,
      variant_id: variantId,
      quantity,
      price: variant.price,
    });

    return { success: true, orderId: newOrder._id };
  } catch (err) {
    console.error("Lỗi tạo đơn hàng:", err.message);
    return { success: false, message: err.message };
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

module.exports = { chatWithBot, welcomeMessage, autoCreateOrderFromChat };
