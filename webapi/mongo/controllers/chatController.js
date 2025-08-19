// controllers/chatController.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const Product = require("../models/productsModel");
const Category = require("../models/categoryModel");
const Keyword = require("../models/keywordModel");
const ProductVariant = require("../models/productVariantModel");
const ChatHistory = require("../models/historychatModel");
const AddressModel = require("../models/addressModel");
const OrderModel = require("../models/orderModel");
const OrderDetailModel = require("../models/orderDetailModel");
const { normalizeImageUrl } = require("../untils/url");

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

function toVND(n) {
  try {
    return new Intl.NumberFormat("vi-VN").format(Number(n || 0)) + "đ";
  } catch {
    return `${n}đ`;
  }
}

function buildProductCards(products, variantsByProduct = {}) {
  return products.map((p) => {
    const rawImg =
      Array.isArray(p.images) && p.images.length ? p.images[0] : p.image || "";
    const img = normalizeImageUrl(rawImg);

    const vdoc = variantsByProduct[p._id?.toString()] || null;

    const variantOptions = [];
    if (vdoc && Array.isArray(vdoc.variants)) {
      for (const v of vdoc.variants) {
        variantOptions.push({
          color: v.color,
          sizes: (v.sizes || []).map((s) => ({
            size: s.size,
            quantity: s.quantity,
            in_stock: (s.quantity || 0) > 0,
          })),
        });
      }
    }

    return {
      id: p._id,
      name: p.name,
      price: p.price,
      price_text: toVND(p.price),
      image: img,
      description_short: (p.description || "").slice(0, 120),
      url: p.slug ? `/product/${p.slug}` : `/product/${p._id}`,
      variants: variantOptions,
      actions: [
        { type: "add_to_cart", label: "Thêm vào giỏ", productId: p._id, quantity: 1 },
        { type: "buy_now", label: "Mua ngay", productId: p._id },
      ],
    };
  });
}

/* ========== AI intent ========== */
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
  const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });
  return result.response.text().trim().toLowerCase();
};


const chatWithBot = async (req, res) => {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ error: "Thiếu message" });

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

    /* === 1. General === */
    if (isGeneral) {
      const categories = await Category.find().select("name");
      const categoryList = categories.map((cat) => cat.name).join(", ");
      prompt = `
Khách hỏi: "${message}".
Bạn là trợ lý tư vấn sản phẩm thân thiện. Danh mục hiện có gồm: ${categoryList}.
Viết câu trả lời ngắn gọn, tự nhiên, không sử dụng dấu sao.
`;
      const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });
      reply = result.response.text().trim();
      if (userId) await saveChatHistory(userId, message, reply);
      return res.status(200).json({ reply, type: "message" });
    }

    /* === 2. Shipping === */
    if (isShipping) {
      prompt = `
Khách hỏi: "${message}".
Chính sách giao hàng: miễn phí nội thành nếu mua từ 3 sản phẩm trở lên. Ngoại thành tính phí 30.000 VNĐ.
Viết câu trả lời rõ ràng, thân thiện, không dùng định dạng Markdown.
`;
      const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });
      reply = result.response.text().trim();
      if (userId) await saveChatHistory(userId, message, reply);
      return res.status(200).json({ reply, type: "message" });
    }

    /* === 3. Return === */
    if (isReturn) {
      prompt = `
Khách hỏi: "${message}".
Chính sách đổi trả: hỗ trợ trong 7 ngày nếu sản phẩm còn tem mác, chưa sử dụng. Không áp dụng với đồ lót hoặc hàng giảm giá.
Viết câu trả lời thân thiện, dễ hiểu, không dùng dấu ** hoặc đặc biệt.
`;
      const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });
      reply = result.response.text().trim();
      if (userId) await saveChatHistory(userId, message, reply);
      return res.status(200).json({ reply, type: "message" });
    }

    /* === 4. Greeting === */
    if (isGreeting) {
      const gPrompt = `
Người dùng vừa chào: "${message}".
Bạn là trợ lý bán hàng thân thiện. Hãy chào lại khách và hỏi xem khách muốn tìm sản phẩm gì.
Không dùng dấu ** hoặc *.
`;
      const result = await model.generateContent({ contents: [{ parts: [{ text: gPrompt }] }] });
      reply = result.response.text().trim();
      if (userId) await saveChatHistory(userId, message, reply);
      return res.status(200).json({ reply, type: "message" });
    }

    /* === 5. Product === */
    if (isProduct) {
      // --- 5.1 bắt giới tính/đối tượng từ câu hỏi ---
      const hasFemale = /(nữ|phụ nữ|women|woman|girl|con gái|bé gái)/i.test(message);
      const hasMale   = /(nam|đàn ông|men|man|boy|con trai|bé trai)/i.test(message);
      const hasKids   = /(trẻ em|kid|kids|thiếu nhi|nhi đồng|bé trai|bé gái)/i.test(message);

      // --- 5.2 cố gắng nhận diện category từ DB (ví dụ "áo sơ mi") ---
      const allCats = await Category.find().select("_id name").lean();
      const matchedCat = allCats.find(c => new RegExp(c.name, "i").test(message));

      // --- 5.3 điều kiện tìm kiếm: giữ keyword như cũ + siết thêm AND theo gender & category ---
      const orKeywordConds = matched
        .filter((k) => k.intent === "product")
        .map((kw) => ({ name: { $regex: kw.word, $options: "i" } }));

      if (!orKeywordConds.length) {
        orKeywordConds.push(
          { name: { $regex: message, $options: "i" } },
          { description: { $regex: message, $options: "i" } }
        );
      }

      const andConds = [{ $or: orKeywordConds }];

      // siết theo category nếu bắt được
      if (matchedCat) {
        andConds.push({
          $or: [
            // tuỳ schema của bạn, giữ nhiều khả năng để không phá logic cũ
            { category_id: matchedCat._id },
            { category: matchedCat._id },
            { categories: matchedCat._id },
            { categoryName: { $regex: matchedCat.name, $options: "i" } },
            { name: { $regex: matchedCat.name, $options: "i" } },
            { description: { $regex: matchedCat.name, $options: "i" } },
          ],
        });
      }

      if (hasFemale) {
        andConds.push({
          $or: [
            { gender: /female|nữ/i },
            { target: /female|nữ|women|girl|phụ nữ|con gái|bé gái/i },
            { name: { $regex: /(nữ|women|girl|phụ nữ|con gái|bé gái)/i } },
            { description: { $regex: /(nữ|women|girl|phụ nữ|con gái|bé gái)/i } },
          ],
        });
      }
      if (hasMale) {
        andConds.push({
          $or: [
            { gender: /male|nam/i },
            { target: /male|nam|men|boy|đàn ông|con trai|bé trai/i },
            { name: { $regex: /(nam|men|boy|đàn ông|con trai|bé trai)/i } },
            { description: { $regex: /(nam|men|boy|đàn ông|con trai|bé trai)/i } },
          ],
        });
      }
      if (hasKids) {
        andConds.push({
          $or: [
            { gender: /kids|child|children|trẻ em/i },
            { target: /kids|child|children|trẻ em|thiếu nhi|nhi đồng/i },
            { name: { $regex: /(trẻ em|kid|kids|thiếu nhi|nhi đồng)/i } },
            { description: { $regex: /(trẻ em|kid|kids|thiếu nhi|nhi đồng)/i } },
          ],
        });
      }

      const products = await Product.find({ $and: andConds })
        .select("_id name price images image slug description")
        .limit(4)
        .lean();

      const ids = products.map((p) => p._id);
      const pvs = await ProductVariant.find({ product_id: { $in: ids } })
        .select("product_id variants")
        .lean();

      const vmap = {};
      for (const doc of pvs) vmap[doc.product_id.toString()] = doc;

      const cards = buildProductCards(products, vmap);

      if (!cards.length) {
        const rep = "Mình chưa thấy sản phẩm phù hợp. Bạn mô tả rõ hơn mẫu, màu, size, đối tượng (nam/nữ/trẻ em) hoặc tầm giá giúp mình nha?";
        if (userId) await saveChatHistory(userId, message, rep);
        return res.status(200).json({ type: "message", reply: rep });
      }

      const rep = "Mình gợi ý vài mẫu phù hợp nè, bạn xem thử nhé!";
      if (userId) await saveChatHistory(userId, message, rep);

      return res.status(200).json({
        type: "product_cards",
        reply: rep,
        cards,
      });
    }

    /* === 6. Order === */
    if (isOrder) {
      prompt = `
Người dùng: "${message}"

Trích xuất dưới dạng JSON với các trường:
- "product": tên sản phẩm
- "quantity": số lượng (số)
- "color": màu (nếu có)
- "size": size (nếu có)

Nếu thiếu thông tin, để trống chuỗi. KHÔNG trả lời văn bản, chỉ trả JSON.
`;
      const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });

      let extracted = {};
      try {
        extracted = JSON.parse(result.response.text());
      } catch {
        return res.status(200).json({ reply: "Tui chưa hiểu rõ bạn muốn đặt gì, bạn có thể nói rõ hơn không?" });
      }

      const { product, quantity, color, size } = extracted;
      if (!product || !quantity || !color || !size) {
        return res.status(200).json({
          reply: "Bạn vui lòng cung cấp đầy đủ thông tin: tên sản phẩm, số lượng, màu sắc, và size nhé.",
        });
      }

      const foundProduct = await Product.findOne({ name: new RegExp(product, "i") });
      if (!foundProduct) return res.status(200).json({ reply: `Tui không tìm thấy sản phẩm "${product}" rồi 🥲` });

      const variant = await ProductVariant.findOne({
        product_id: foundProduct._id,
        "variants.color": { $regex: color, $options: "i" },
        "variants.sizes.size": size,
      });
      if (!variant) {
        return res.status(200).json({ reply: `Không tìm thấy phiên bản phù hợp với màu "${color}" và size "${size}".` });
      }

      const matchedVariant = variant.variants.find((v) => v.color.toLowerCase() === color.toLowerCase());
      const sizeObj = matchedVariant.sizes.find((s) => s.size === size);
      if (!sizeObj || sizeObj.quantity < quantity) {
        return res.status(200).json({ reply: "Số lượng sản phẩm không đủ trong kho 😢" });
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

      if (!resultOrder.success) return res.status(200).json({ reply: `Tạo đơn hàng thất bại: ${resultOrder.message}` });

      const finalReply = `Tui đã tạo đơn hàng cho bạn: ${quantity} x ${product} (màu ${color}, size ${size}). Cảm ơn bạn nhiều lắm! 😘`;
      if (userId) await saveChatHistory(userId, message, finalReply);
      return res.status(200).json({ reply: finalReply, type: "message" });
    }

    /* === 7. Order confirm === */
    if (isOrderConfirm) {
      const chat = await ChatHistory.findOne({ userId }).sort({ updatedAt: -1 });
      if (!chat || !chat.messages || chat.messages.length < 2) {
        return res.status(200).json({ reply: "Hiện tại không có đơn hàng nào để xác nhận." });
      }

      const lastBotMsg = [...chat.messages].reverse().find((m) => m.role === "bot" && m.content.includes("Tổng cộng"));
      if (!lastBotMsg) return res.status(200).json({ reply: "Tui không thấy thông tin đơn hàng để xác nhận nha 😅" });

      const p2 = `
Đoạn văn sau là phản hồi của bot khi khách đặt hàng: "${lastBotMsg.content}"
Hãy trích xuất thông tin đặt hàng dạng JSON với các trường: "product","quantity","color","size"
Chỉ trả JSON.
`;
      const result = await model.generateContent({ contents: [{ parts: [{ text: p2 }] }] });

      let extracted = {};
      try {
        extracted = JSON.parse(result.response.text());
      } catch {
        return res.status(200).json({ reply: "Tui không hiểu rõ đơn hàng bạn muốn xác nhận 😥" });
      }

      const { product, quantity, color, size } = extracted;
      if (!product || !quantity || !color || !size) return res.status(200).json({ reply: "Thiếu thông tin rồi, tui chưa xác nhận được đơn 😓" });

      const foundProduct = await Product.findOne({ name: new RegExp(product, "i") });
      if (!foundProduct) return res.status(200).json({ reply: `Tui không tìm thấy sản phẩm "${product}" rồi 🥲` });

      const variant = await ProductVariant.findOne({
        product_id: foundProduct._id,
        "variants.color": { $regex: color, $options: "i" },
        "variants.sizes.size": size,
      });
      if (!variant) return res.status(200).json({ reply: `Không tìm thấy phiên bản phù hợp với màu "${color}" và size "${size}".` });

      const matchedVariant = variant.variants.find((v) => v.color.toLowerCase() === color.toLowerCase());
      const sizeObj = matchedVariant.sizes.find((s) => s.size === size);
      if (!sizeObj || sizeObj.quantity < quantity) return res.status(200).json({ reply: "Số lượng không đủ trong kho để đặt hàng." });

      const variantId = variant._id;
      const resultOrder = await autoCreateOrderFromChat({
        userId,
        productId: foundProduct._id,
        variantId,
        quantity,
        paymentMethod: "cod",
        isGuest: !userId,
      });
      if (!resultOrder.success) return res.status(200).json({ reply: `Tạo đơn hàng thất bại: ${resultOrder.message}` });

      const replyConfirm = `Tui đã xác nhận và tạo đơn: ${quantity} x ${product} (màu ${color}, size ${size}). Cảm ơn bạn nha! 🛍️`;
      await saveChatHistory(userId, message, replyConfirm);
      return res.status(200).json({ reply: replyConfirm, type: "message" });
    }

    /* === 8. Add to cart === */
    if (isAddToCart) {
      const product = await Product.findOne({ name: { $regex: message, $options: "i" } });
      if (!product) {
        return res.status(200).json({
          type: "message",
          reply: "Xin lỗi, mình không tìm thấy sản phẩm bạn muốn thêm vào giỏ hàng.",
        });
      }
      const raw = Array.isArray(product.images) && product.images.length ? product.images[0] : product.image || "";
      const image = normalizeImageUrl(raw);

      return res.status(200).json({
        type: "add_to_cart",
        products: [{ id: product._id, name: product.name, image, price: product.price, quantity: 1 }],
        reply: `Mình đã thêm ${product.name} vào giỏ hàng giúp bạn!`,
      });
    }

    /* === 9. Fallback học từ mới === */
    const existing = await Keyword.findOne({ word: messageLower });
    if (!existing) {
      const aiIntent = await detectIntentByAI(messageLower);
      const intent = knownIntents.includes(aiIntent) ? aiIntent : "unknown";
      await Keyword.create({ word: messageLower, intent });
      console.log(`🧠 Bot học từ mới: "${messageLower}" với intent "${intent}"`);
    }

    reply =
      "Hiện tại shop mình chưa có sản phẩm bạn cần tìm chỉ có các danh mục như: Áo phông, Áo sơ mi, Áo thun, Áo polo,... cho Nam, Nữ và Trẻ em. Bạn có thể tham khảo các mặt hàng như trên để mình tư vấn rõ cho bạn nhé!";
    await saveChatHistory(userId, message, reply);
    return res.status(200).json({ reply, type: "message" });
  } catch (err) {
    console.error("❌ ChatBot Error:", err);
    return res.status(500).json({ error: "Lỗi xử lý yêu cầu", detail: err.message || "Không rõ lỗi" });
  }
};

/* ========== helpers phụ ========== */
async function saveChatHistory(userId, userMsg, botReply) {
  try {
    if (!userId) return;
    const existingChat = await ChatHistory.findOne({ userId });
    if (existingChat) {
      existingChat.messages.push({ role: "user", content: userMsg });
      existingChat.messages.push({ role: "bot", content: botReply });
      existingChat.updatedAt = Date.now();
      await existingChat.save();
    } else {
      await new ChatHistory({
        userId,
        messages: [
          { role: "user", content: userMsg },
          { role: "bot", content: botReply },
        ],
      }).save();
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

    let address_id = null;
    let address_guess = null;

    if (isGuest && guestAddress) {
      address_guess = guestAddress;
    } else {
      const userAddress = await AddressModel.findOne({ user_id: userId, is_default: true });
      if (!userAddress) throw new Error("Không tìm thấy địa chỉ người dùng");
      address_id = userAddress._id;
    }

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

const welcomeMessage = async (req, res) => {
  try {
    const categories = await Category.find().select("name");
    const categoryList = categories.map((cat) => cat.name).join(", ");
    const prompt = `
Bạn là trợ lý bán hàng của shop quần áo. Hãy chào hỏi thân thiện khách mới và giới thiệu các danh mục hiện có gồm: ${categoryList}.
Viết câu trả lời tự nhiên, KHÔNG dùng định dạng Markdown (** hoặc *).
`;
    const result = await model.generateContent({ contents: [{ parts: [{ text: prompt }] }] });
    const reply = result.response.text().trim();
    await saveChatHistory(req.body.userId, "", reply);
    return res.status(200).json({ reply, type: "message" });
  } catch (err) {
    console.error("❌ Welcome Error:", err);
    return res.status(500).json({ error: "Lỗi tạo lời chào", detail: err.message || "Không rõ lỗi" });
  }
};

module.exports = { chatWithBot, welcomeMessage, autoCreateOrderFromChat };
