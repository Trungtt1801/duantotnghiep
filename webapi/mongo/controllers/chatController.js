require("dotenv").config();
const OpenAI = require("openai");
const Product = require("../models/productsModel");
const Category = require("../models/categoryModel");
const Keyword = require("../models/keywordModel");
const ProductVariant = require("../models/productVariantModel");
const ChatHistory = require("../models/historychatModel");
const AddressModel = require("../models/addressModel");
const OrderModel = require("../models/orderModel");
const OrderDetailModel = require("../models/orderDetailModel");
const { normalizeImageUrl } = require("../untils/url");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function isQuota429(err) {
  return (
    err &&
    (err.status === 429 ||
      err.code === "insufficient_quota" ||
      err?.error?.code === "insufficient_quota")
  );
}

// Chuẩn hóa tiếng Việt: bỏ dấu, thường hóa, non-alnum -> space (để \b hoạt động đúng)
function normalizeVN(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Helper: gọi ChatGPT thường (trả về string)
async function askChatGPT(
  prompt,
  { system, temperature = 0.7, model = "gpt-4o-mini" } = {}
) {
  try {
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
    });
    return (completion.choices?.[0]?.message?.content || "").trim();
  } catch (err) {
    if (isQuota429(err)) {
      const e = new Error("AI_QUOTA");
      e.code = "AI_QUOTA";
      throw e;
    }
    throw err;
  }
}

async function askChatGPTJSON(
  prompt,
  { system, temperature = 0.2, model = "gpt-4o-mini" } = {}
) {
  try {
    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({
      role: "user",
      content:
        prompt +
        `

YÊU CẦU QUAN TRỌNG:
- Chỉ trả về JSON hợp lệ, không thêm văn bản trước/sau.
- Không dùng markdown, không dùng \`\`\`.
`,
    });

    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature,
    });

    let text = (completion.choices?.[0]?.message?.content || "").trim();

    // Cắt khối JSON nếu có kèm chữ
    text = text
      .replace(/^```json/i, "")
      .replace(/```$/i, "")
      .trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      const jsonStr = text.slice(start, end + 1);
      return JSON.parse(jsonStr);
    }
    return JSON.parse(text);
  } catch (err) {
    if (isQuota429(err)) {
      const e = new Error("AI_QUOTA");
      e.code = "AI_QUOTA";
      throw e;
    }
    throw new Error("Không parse được JSON từ phản hồi AI.");
  }
}

// ── INTENTS
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
        {
          type: "add_to_cart",
          label: "Thêm vào giỏ",
          productId: p._id,
          quantity: 1,
        },
        { type: "buy_now", label: "Mua ngay", productId: p._id },
      ],
    };
  });
}

// Nhận diện câu hỏi tư vấn size (không dùng AI)
function isSizeInquiry(text) {
  const t = (text || "").toLowerCase();
  return /size|mặc size|tư vấn size|chon size|chọn size|form|co giãn|nặng|cân nặng|chiều cao|cao|nặng bao nhiêu/.test(
    t
  );
}

// Bắt gender sơ bộ từ câu
function detectGenderFromText(text) {
  if (/(nữ|phụ nữ|women|girl|con gái|bé gái)/i.test(text)) return "female";
  if (/(nam|đàn ông|men|boy|con trai|bé trai)/i.test(text)) return "male";
  return "unisex";
}

// ===== Bắt chiều cao/cân nặng tiếng Việt (1m7, 170cm, 40 cân/ký/kg) =====
function extractMetrics(text) {
  const t = String(text || "")
    .toLowerCase()
    .replace(",", ".")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  let height = null;
  let weight = null;

  // Chiều cao:
  // 1) "1m70", "1m7", "1 m 72", "1.7m"
  const mForm = t.match(/(\d+(?:[\.,]\d+)?)(?:\s*)m(?:\s*(\d{1,2}))?/);
  if (mForm) {
    const meter = parseFloat(mForm[1].replace(",", "."));
    const extra = mForm[2] ? parseInt(mForm[2], 10) : 0; // "1m7" -> 170
    if (!isNaN(meter) && meter < 3) {
      height = Math.round(
        meter * 100 + (extra >= 0 && extra < 10 ? extra * 10 : 0)
      );
    }
  }
  // 2) "170cm"
  if (height == null) {
    const cmForm = t.match(/(\d{2,3})\s*cm/);
    if (cmForm) height = parseInt(cmForm[1], 10);
  }
  // 3) "cao 170"
  if (height == null) {
    const caoForm = t.match(/cao[^0-9]{0,6}(\d{2,3})/);
    if (caoForm) height = parseInt(caoForm[1], 10);
  }

  // Cân nặng:
  // 1) "40kg"
  const kgForm = t.match(/(\d{2,3})\s*kg/);
  if (kgForm) weight = parseInt(kgForm[1], 10);
  // 2) "40 can/ky/ki/kilo/kilogram"
  if (weight == null) {
    const canKyForm = t.match(/(\d{2,3})\s*(can|ky|ki|kilo|kilogam|kilogram)/);
    if (canKyForm) weight = parseInt(canKyForm[1], 10);
  }
  // 3) "nang 40"
  if (weight == null) {
    const nangForm = t.match(/nang[^0-9]{0,6}(\d{2,3})/);
    if (nangForm) weight = parseInt(nangForm[1], 10);
  }
  // 4) Trần sau từ "nang" (tránh nhầm cm)
  if (weight == null) {
    const quick = t.match(/nang[^0-9]{0,3}(\d{2,3})(?!\s*(cm|m))/);
    if (quick) weight = parseInt(quick[1], 10);
  }

  // Lọc biên
  if (height != null) {
    if (height < 120) height = Math.max(height, 120);
    if (height > 210) height = Math.min(height, 210);
  }
  if (weight != null) {
    if (weight < 30) weight = Math.max(weight, 30);
    if (weight > 200) weight = Math.min(weight, 200);
  }

  return { height, weight };
}

// Bảng size đơn giản (tuỳ chỉnh theo brand nếu cần)
function recommendSize({ height, weight, gender = "unisex" }) {
  if (!height || !weight) return null;
  const tableMale = [
    { size: "S", h: [160, 168], w: [48, 57] },
    { size: "M", h: [168, 175], w: [57, 66] },
    { size: "L", h: [172, 180], w: [65, 74] },
    { size: "XL", h: [175, 185], w: [73, 85] },
    { size: "2XL", h: [180, 190], w: [84, 95] },
  ];
  const tableFemale = [
    { size: "S", h: [150, 158], w: [40, 48] },
    { size: "M", h: [156, 164], w: [47, 55] },
    { size: "L", h: [160, 168], w: [54, 62] },
    { size: "XL", h: [165, 172], w: [61, 70] },
    { size: "2XL", h: [170, 178], w: [68, 78] },
  ];
  const table = gender === "female" ? tableFemale : tableMale;
  for (const row of table) {
    const [h1, h2] = row.h;
    const [w1, w2] = row.w;
    if (height >= h1 && height <= h2 && weight >= w1 && weight <= w2)
      return row.size;
  }
  if (weight < 50) return "S";
  if (weight < 58) return "M";
  if (weight < 66) return "L";
  if (weight < 75) return "XL";
  return "2XL";
}

function buildSizeAdviceText({ products, vmap, message }) {
  const { height, weight } = extractMetrics(message);
  const gender = detectGenderFromText(message);
  const rec = recommendSize({ height, weight, gender });

  const lines = [];
  if (height || weight) {
    lines.push(
      `Thông tin của bạn${height ? `, cao ${height}cm` : ""}${
        weight ? `, nặng ${weight}kg` : ""
      }${gender !== "unisex" ? `, ${gender === "male" ? "nam" : "nữ"}` : ""}.`
    );
    if (rec) lines.push(`Size đề xuất: ${rec}.`);
  } else {
    lines.push(
      "Để tư vấn chuẩn hơn, bạn cho mình xin chiều cao (cm) và cân nặng (kg) nhé."
    );
  }

  for (const p of products) {
    const pv = vmap[p._id.toString()];
    if (!pv || !Array.isArray(pv.variants) || pv.variants.length === 0)
      continue;
    lines.push(`\n• ${p.name}:`);
    for (const v of pv.variants) {
      const inStockSizes = (v.sizes || [])
        .filter((s) => (s.quantity || 0) > 0)
        .map((s) => s.size);
      if (inStockSizes.length)
        lines.push(
          `  - Màu ${v.color}: còn các size ${inStockSizes.join(", ")}`
        );
      else lines.push(`  - Màu ${v.color}: tạm hết hàng`);
    }
  }
  return lines.join("\n");
}

// ===== AI intent detect (có fallback keyword khi hết quota) =====
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
  try {
    const result = await askChatGPT(prompt, { temperature: 0.0 });
    return result.trim().toLowerCase();
  } catch (err) {
    if (err.code === "AI_QUOTA") {
      const t = normalizeVN(message || "");
      if (/\b(xin )?chao\b|\bhello\b|\bhi\b/.test(t)) return "greeting";
      if (
        /\b(giao hang|phi ship|van chuyen|ship|tien ship|phi van chuyen)\b/.test(
          t
        )
      )
        return "shipping";
      if (/\b(doi tra|hoan hang|tra hang|doi size)\b/.test(t)) return "return";
      if (/\b(dat|mua|order)\b/.test(t)) return "order";
      if (/\b(xac nhan)\b/.test(t)) return "order_confirm";
      if (/\b(them vao gio|add to cart|gio hang)\b/.test(t))
        return "add_to_cart";
      if (
        /\b(ao|quan|vay|so mi|polo|dam|hoodie|quan jean|quan tay|ao thun|jacket|cardigan)\b/.test(
          t
        )
      )
        return "product";
      if (/\b(danh muc|ban gi|co gi)\b/.test(t)) return "general";
      return "other";
    }
    throw err;
  }
};

// =============================
// 3) CONTROLLER CHÍNH
// =============================
// ===== Keyword matching helpers (ưu tiên DB) =====
function buildKeywordMatchers(kwDoc) {
  const items = new Set();
  const add = (s) => {
    const v = normalizeVN(s || "");
    if (v) items.add(v);
  };

  add(kwDoc.word);
  (kwDoc.synonyms || []).forEach(add);

  const patterns = [];

  // 1) Nếu có pattern custom -> dùng thẳng (pattern nên viết theo normalizeVN)
  if (kwDoc.pattern) {
    try {
      patterns.push(new RegExp(kwDoc.pattern, "i"));
    } catch (e) {
      console.warn("Keyword pattern invalid:", kwDoc.pattern, e?.message);
    }
  }

  // 2) Tự sinh regex từ word/synonyms đã normalize
  for (const token of items) {
    if (!token) continue;
    const re = token.trim().split(/\s+/).join("\\s+"); // "phi ship" -> "phi\\s+ship"
    try {
      patterns.push(new RegExp(`\\b${re}\\b`, "i"));
    } catch {}
  }

  return patterns;
}

function scoreMatch({ messageNorm, kwDoc, patterns }) {
  let hits = 0;
  for (const r of patterns) {
    if (r.test(messageNorm)) hits += 1;
  }
  if (!hits) return 0;

  const w = Number(kwDoc.weight || 0);
  const len = (kwDoc.word || "").length;
  return hits * 10 + w * 5 + Math.min(len, 30) / 10;
}

const chatWithBot = async (req, res) => {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ error: "Thiếu message" });

  const msgNorm = normalizeVN(message);

  try {
    // ===== 1) Match keyword đã học trong DB (ưu tiên tuyệt đối) =====
    const allKeywords = await Keyword.find({}).lean();
    const activeKeywords = allKeywords.filter((k) => k?.active !== false);

    let best = { score: 0, intent: null, kw: null };
    for (const kw of activeKeywords) {
      const patterns = buildKeywordMatchers(kw);
      const s = scoreMatch({ messageNorm: msgNorm, kwDoc: kw, patterns });
      if (s > best.score) {
        best = {
          score: s,
          intent: (kw.intent || "").toLowerCase().trim(),
          kw,
        };
      }
    }

    // intent: ƯU TIÊN DB
    let intent = best.intent || null;

    // 👉 Nếu câu có nội dung hỏi size → ép intent = 'product'
    if (isSizeInquiry(message)) {
      intent = "product";
    }

    // Nếu vẫn chưa có intent → mới hỏi AI (fallback)
    if (!intent) {
      intent = (await detectIntentByAI(message))?.trim()?.toLowerCase();
    }

    // (debug log để check)
    console.log("[BOT DEBUG]", {
      msg: message,
      msgNorm,
      bestKeyword: best.kw?.word,
      bestIntentFromDB: best.intent,
      finalIntent: intent,
    });

    // ===== 1.1) Khôi phục danh sách keyword đã khớp để reuse bên dưới (FIX matched) =====
    const keywordHits = activeKeywords
      .map((k) => ({ kw: k, patterns: buildKeywordMatchers(k) }))
      .filter((x) => x.patterns.some((r) => r.test(msgNorm)));
    const matched = keywordHits.map((x) => x.kw); // << dùng như code cũ

    // ===== 2) Cờ intent =====
    const isProduct = intent === "product";
    const isShipping = intent === "shipping";
    const isReturn = intent === "return";
    const isGeneral = intent === "general";
    const isOrder = intent === "order";
    const isOrderConfirm = intent === "order_confirm";
    const isGreeting = intent === "greeting";
    const isAddToCart = intent === "add_to_cart";

    let prompt = "";
    let reply = "";

    // ===== 3) General (danh mục)
    if (isGeneral) {
      try {
        const categories = await Category.find().select("name");
        const categoryList = categories.map((cat) => cat.name).join(", ");
        prompt = `
Khách hỏi: "${message}".
Bạn là trợ lý tư vấn sản phẩm thân thiện. Danh mục hiện có gồm: ${categoryList}.
Viết câu trả lời ngắn gọn, tự nhiên, KHÔNG dùng Markdown và ký tự đặc biệt.
`;
        reply = await askChatGPT(prompt);
      } catch {
        const categories = await Category.find().select("name");
        const categoryList = categories.map((cat) => cat.name).join(", ");
        reply = `Shop hiện có các danh mục: ${categoryList}. Bạn muốn tham khảo dòng nào để mình tư vấn kỹ hơn nha?`;
      }
      if (userId) await saveChatHistory(userId, message, reply);
      return res.status(200).json({ reply, type: "message" });
    }

    // ===== 4) Shipping
    if (isShipping) {
      try {
        prompt = `
Khách hỏi: "${message}".
Chính sách giao hàng: miễn phí nội thành nếu mua từ 3 sản phẩm trở lên. Ngoại thành tính phí 30.000 VNĐ.
Viết câu trả lời rõ ràng, thân thiện, KHÔNG dùng Markdown.
`;
        reply = await askChatGPT(prompt);
      } catch {
        reply =
          "Bên mình miễn phí nội thành khi mua từ 3 sản phẩm trở lên. Khu vực ngoại thành phí ship 30.000đ bạn nhé.";
      }
      if (userId) await saveChatHistory(userId, message, reply);
      return res.status(200).json({ reply, type: "message" });
    }

    // ===== 5) Return
    if (isReturn) {
      try {
        prompt = `
Khách hỏi: "${message}".
Chính sách đổi trả: hỗ trợ trong 7 ngày nếu sản phẩm còn tem mác, chưa sử dụng. Không áp dụng với đồ lót hoặc hàng giảm giá.
Viết câu trả lời thân thiện, dễ hiểu, KHÔNG dùng ký tự ** hoặc đặc biệt.
`;
        reply = await askChatGPT(prompt);
      } catch {
        reply =
          "Shop hỗ trợ đổi trả trong 7 ngày nếu còn tem mác và chưa sử dụng (không áp dụng cho đồ lót/hàng giảm giá) nhé bạn.";
      }
      if (userId) await saveChatHistory(userId, message, reply);
      return res.status(200).json({ reply, type: "message" });
    }

    // ===== 6) Greeting
    if (isGreeting) {
      try {
        prompt = `
Người dùng vừa chào: "${message}".
Bạn là trợ lý bán hàng thân thiện. Hãy chào lại khách và hỏi xem khách muốn tìm sản phẩm gì.
KHÔNG dùng dấu ** hoặc *.
`;
        reply = await askChatGPT(prompt);
      } catch {
        reply = "Chào bạn 👋 Bạn đang tìm mẫu nào để mình hỗ trợ nhanh nhé?";
      }
      if (userId) await saveChatHistory(userId, message, reply);
      return res.status(200).json({ reply, type: "message" });
    }

    // ===== 7) Product (+ tư vấn size không cần AI)
    if (isProduct) {
      const hasFemale = /(nữ|phụ nữ|women|woman|girl|con gái|bé gái)/i.test(message);
      const hasMale = /(nam|đàn ông|men|man|boy|con trai|bé trai)/i.test(message);
      const hasKids = /(trẻ em|kid|kids|thiếu nhi|nhi đồng|bé trai|bé gái)/i.test(message);

      const allCats = await Category.find().select("_id name").lean();
      const matchedCat = allCats.find((c) => new RegExp(c.name, "i").test(message));

      const orKeywordConds = matched
        .filter((k) => String(k.intent).toLowerCase() === "product")
        .flatMap((kw) => ([
          { name:        { $regex: kw.word, $options: "i" } },
          { description: { $regex: kw.word, $options: "i" } },
          { categoryName:{ $regex: kw.word, $options: "i" } },
        ]));

      if (!orKeywordConds.length) {
        orKeywordConds.push(
          { name: { $regex: message, $options: "i" } },
          { description: { $regex: message, $options: "i" } }
        );
      }

      const andConds = [{ $or: orKeywordConds }];

      if (matchedCat) {
        andConds.push({
          $or: [
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

      // Nếu là câu hỏi về size → không gọi AI, trả lời từ DB
      if (isSizeInquiry(message)) {
        if (!products.length) {
          const rep =
            "Mình chưa thấy sản phẩm phù hợp. Bạn mô tả rõ hơn mẫu, màu, size hoặc tầm giá để mình tư vấn size chính xác nha?";
        if (userId) await saveChatHistory(userId, message, rep);
          return res.status(200).json({ type: "message", reply: rep });
        }

        const advise = buildSizeAdviceText({ products, vmap, message });
        const rep =
          advise ||
          "Bạn cho mình xin chiều cao (cm) và cân nặng (kg) để mình tư vấn size chuẩn theo từng màu/size còn hàng nhé!";
        if (userId) await saveChatHistory(userId, message, rep);

        const cards = buildProductCards(products, vmap);
        return res.status(200).json({ type: "product_cards", reply: rep, cards });
      }

      const cards = buildProductCards(products, vmap);
      if (!cards.length) {
        const rep =
          "Mình chưa thấy sản phẩm phù hợp. Bạn mô tả rõ hơn mẫu, màu, size, đối tượng (nam/nữ/trẻ em) hoặc tầm giá giúp mình nha?";
        if (userId) await saveChatHistory(userId, message, rep);
        return res.status(200).json({ type: "message", reply: rep });
      }

      const rep = "Mình gợi ý vài mẫu phù hợp nè, bạn xem thử nhé!";
      if (userId) await saveChatHistory(userId, message, rep);
      return res.status(200).json({ type: "product_cards", reply: rep, cards });
    }

    // ===== 8) Order (trích JSON, có fallback text)
    if (isOrder) {
      let extracted = {};
      try {
        const jsonPrompt = `
Người dùng: "${message}"

Trích xuất dưới dạng JSON với các trường:
- "product": tên sản phẩm
- "quantity": số lượng (số)
- "color": màu (nếu có)
- "size": size (nếu có)

Nếu thiếu thông tin, để trống chuỗi. CHỈ TRẢ JSON hợp lệ.
`;
        extracted = await askChatGPTJSON(jsonPrompt);
      } catch {
        return res.status(200).json({
          reply:
            "Bạn cho mình biết rõ tên sản phẩm, số lượng, màu và size để mình tạo đơn liền nhé.",
          type: "message",
        });
      }

      const { product, quantity, color, size } = extracted;
      if (!product || !quantity || !color || !size) {
        return res.status(200).json({
          reply:
            "Bạn vui lòng cung cấp đầy đủ: tên sản phẩm, số lượng, màu và size nhé.",
          type: "message",
        });
      }

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
        (v) => v.color?.toLowerCase?.() === color.toLowerCase()
      );
      const sizeObj = matchedVariant?.sizes?.find((s) => s.size === size);
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
        paymentMethod: "cod",
        isGuest: !userId,
      });
      if (!resultOrder.success) {
        return res
          .status(200)
          .json({ reply: `Tạo đơn hàng thất bại: ${resultOrder.message}` });
      }

      const finalReply = `Tui đã tạo đơn: ${quantity} x ${product} (màu ${color}, size ${size}). Cảm ơn bạn nha! 🛍️`;
      if (userId) await saveChatHistory(userId, message, finalReply);
      return res.status(200).json({ reply: finalReply, type: "message" });
    }

    // ===== 9) Order Confirm
    if (isOrderConfirm) {
      const chat = await ChatHistory.findOne({ userId }).sort({ updatedAt: -1 });
      if (!chat || !chat.messages || chat.messages.length < 2) {
        return res
          .status(200)
          .json({ reply: "Hiện tại không có đơn hàng nào để xác nhận." });
      }

      const lastBotMsg = [...chat.messages]
        .reverse()
        .find(
          (m) =>
            m.role === "bot" &&
            /Tổng cộng|đã tạo đơn|da tao don|đã xác nhận đơn|da xac nhan don/i.test(
              m.content || ""
            )
        );
      if (!lastBotMsg) {
        return res.status(200).json({
          reply: "Tui không thấy thông tin đơn hàng để xác nhận nha 😅",
        });
      }

      let extracted = {};
      try {
        const jsonPrompt = `
Đoạn văn sau là phản hồi của bot khi khách đặt hàng: "${lastBotMsg.content}"

Hãy trích xuất thông tin đặt hàng dạng JSON với các trường:
- "product": tên sản phẩm
- "quantity": số lượng
- "color": màu
- "size": size

Chỉ trả về JSON hợp lệ.
`;
        extracted = await askChatGPTJSON(jsonPrompt);
      } catch {
        return res
          .status(200)
          .json({ reply: "Tui không hiểu rõ đơn hàng bạn muốn xác nhận 😥" });
      }

      const { product, quantity, color, size } = extracted;
      if (!product || !quantity || !color || !size) {
        return res
          .status(200)
          .json({ reply: `Thiếu thông tin rồi, tui chưa xác nhận được đơn 😓` });
      }

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
        (v) => v.color?.toLowerCase?.() === color.toLowerCase()
      );
      const sizeObj = matchedVariant?.sizes?.find((s) => s.size === size);
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

      const replyConfirm = `Tui đã xác nhận đơn: ${quantity} x ${product} (màu ${color}, size ${size}). Cảm ơn bạn nha! 🛒`;
      await saveChatHistory(userId, message, replyConfirm);
      return res.status(200).json({ reply: replyConfirm, type: "message" });
    }

    // ===== 10) Add to cart (chuẩn hoá ảnh)
    if (isAddToCart) {
      const product = await Product.findOne({
        name: { $regex: message, $options: "i" },
      }).lean();
      if (!product) {
        return res.status(200).json({
          type: "message",
          reply:
            "Xin lỗi, mình không tìm thấy sản phẩm bạn muốn thêm vào giỏ hàng.",
        });
      }
      const raw =
        Array.isArray(product.images) && product.images.length
          ? product.images[0]
          : product.image || "";
      const image = normalizeImageUrl(raw);
      return res.status(200).json({
        type: "add_to_cart",
        products: [
          {
            id: product._id,
            name: product.name,
            image,
            price: product.price,
            quantity: 1,
          },
        ],
        reply: `Mình đã thêm ${product.name} vào giỏ hàng giúp bạn!`,
      });
    }

    // ===== 11) Không xác định => học từ mới (lưu keyword đã normalize)
    const existing = await Keyword.findOne({ word: msgNorm });
    if (!existing) {
      const aiIntent = await detectIntentByAI(message);
      const intentLearn = knownIntents.includes(aiIntent) ? aiIntent : "unknown";
      await Keyword.create({ word: msgNorm, intent: intentLearn });
      console.log(`🧠 Bot học từ mới: "${msgNorm}" với intent "${intentLearn}"`);
    }

    reply =
      "Hiện tại shop mình chưa có sản phẩm bạn cần tìm chỉ có các danh mục như: Áo phông, Áo sơ mi, Áo thun, Áo polo,... cho Nam, Nữ và Trẻ em. Bạn có thể tham khảo các mặt hàng như trên để mình tư vấn rõ cho bạn nhé!";
    await saveChatHistory(userId, message, reply);
    return res.status(200).json({ reply, type: "message" });
  } catch (err) {
    console.error("❌ ChatBot Error:", err);
    return res.status(500).json({
      error: "Lỗi xử lý yêu cầu",
      detail: err.message || "Không rõ lỗi",
    });
  }
};


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

    const total_price = variant.price * quantity; // giữ nguyên theo code cũ

    let address_id = null;
    let address_guess = null;

    if (isGuest && guestAddress) {
      address_guess = guestAddress;
    } else {
      const userAddress = await AddressModel.findOne({
        user_id: userId,
        is_default: true,
      });
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
    let reply;
    try {
      const prompt = `
Bạn là trợ lý bán hàng của shop quần áo. Hãy chào hỏi thân thiện khách mới và giới thiệu các danh mục hiện có gồm: ${categoryList}.
Viết câu trả lời tự nhiên, KHÔNG dùng Markdown (** hoặc *).
`;
      reply = await askChatGPT(prompt);
    } catch {
      reply = `Chào bạn 👋 Shop hiện có các danh mục: ${categoryList}. Bạn muốn xem áo, quần hay phụ kiện để mình hỗ trợ nhé!`;
    }
    await saveChatHistory(req.body.userId, "", reply);
    return res.status(200).json({ reply, type: "message" });
  } catch (err) {
    console.error("❌ Welcome Error:", err);
    return res.status(500).json({
      error: "Lỗi tạo lời chào",
      detail: err.message || "Không rõ lỗi",
    });
  }
};

module.exports = { chatWithBot, welcomeMessage, autoCreateOrderFromChat };
