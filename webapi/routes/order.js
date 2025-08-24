const express = require("express");
const router = express.Router();
const orderController = require("../mongo/controllers/orderController");
const orderModel = require("../mongo/models/orderModel");

// ---- helpers: IPv4 + locale ----
function toIPv4(ip) {
  if (!ip) return "127.0.0.1";
  const first = String(ip).split(",")[0].trim();
  return first.includes(":") ? "127.0.0.1" : first; // IPv6 -> IPv4
}
function normalizeLocale(loc) {
  const l = String(loc || "vn").toLowerCase();
  return l === "en" ? "en" : "vn";
}

// [GET] Lấy tất cả đơn hàng
router.get("/", async (req, res) => {
  try {
    const result = await orderController.getAllOrders();
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi lấy danh sách đơn hàng" });
  }
});

// [POST] Tạo đơn hàng (tổng quát: COD/ZaloPay/VNPAY tuỳ body)
router.post("/", async (req, res) => {
  console.log("[ROUTER] POST /api/orders hit");
  try {
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      "127.0.0.1";

    const result = await orderController.addOrder({
      ...req.body,
      ip: toIPv4(ipAddr),
      locale: normalizeLocale(req.body?.locale),
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi tạo đơn hàng" });
  }
});

// [POST] Tạo đơn hàng guest 
router.post("/guess", async (req, res) => {
  try {
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      "127.0.0.1";

    const result = await orderController.addOrderForGuest({
      ...req.body,
      ip: toIPv4(ipAddr),
      locale: normalizeLocale(req.body?.locale),
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi tạo đơn hàng" });
  }
});

// [GET] Xác nhận đơn hàng guest qua link email
router.get("/confirm-order/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await orderModel.findById(orderId);
    if (!order) return res.status(404).send("Không tìm thấy đơn hàng");

    if (order.status_order === "pending") {
      return res.send("✅ Đơn hàng đã được xác nhận hoặc xử lý trước đó");
    }

    order.status_order = "pending";
    if (!Array.isArray(order.status_history)) order.status_history = [];
    order.status_history.push({
      status: "pending",
      updatedAt: new Date(),
      note: "Khách vãng lai xác nhận đơn qua email",
    });

    await order.save();
    return res.send("✅ Đơn hàng đã được xác nhận thành công. Cảm ơn bạn!");
  } catch (err) {
    console.error(err);
    return res.status(500).send("❌ Lỗi xác nhận đơn hàng");
  }
});

// [PATCH] Xác nhận đơn hàng (admin)
router.patch("/:id/confirm", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedOrder = await orderController.confirmOrder(id);
    res.status(200).json({
      message: "Xác nhận đơn hàng thành công và cập nhật tồn kho",
      data: updatedOrder,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// [PATCH] Cập nhật trạng thái đơn hàng
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const result = await orderController.updateOrderStatus(req.params.id, status);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [PATCH] Cập nhật thanh toán
router.patch("/:id/payment", async (req, res) => {
  try {
    const result = await orderController.updatePayment(req.params.id, req.body);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [PATCH] Hủy đơn hàng
router.patch("/:id/cancel", async (req, res) => {
  try {
    const isAdmin = req.query.admin === "true";
    const { reason } = req.body; // có thể undefined

    const result = await orderController.cancelOrder(req.params.id, isAdmin, reason || "");
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [GET] Lọc đơn hàng
router.get("/filter", async (req, res) => {
  try {
    const result = await orderController.filterOrders(req.query);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Lỗi lọc đơn hàng" });
  }
});

// Test cộng điểm
router.get("/test-point", async (req, res) => {
  try {
    await orderController.updateUserPoint("686f6d68be04b218525ff55f", 200000);
    res.json({ status: true, message: "Cộng điểm thành công" });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

// [POST] ZaloPay
router.post("/zalopay", async (req, res) => {
  try {
    const result = await orderController.createOrderWithZaloPay(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// [GET] ZaloPay return
router.get("/zalopay_return", async (req, res) => {
  try {
    await orderController.zaloCallback(req.query);
    const returnUrl = req.query.return_url || "/order";
    res.redirect(returnUrl);
  } catch (err) {
    res.redirect("/thanh-toan-that-bai");
  }
});

// [POST] ZaloPay callback (server to server)
router.post("/zalopay-callback", async (req, res) => {
  try {
    await orderController.zaloCallback(req.body);
    res.json({ return_code: 1, return_message: "success" });
  } catch (error) {
    res.json({ return_code: 0, return_message: "error" });
  }
});

// [POST] VNPAY (user login) — truyền locale và IPv4 xuống controller
router.post("/vnpay", async (req, res) => {
  try {
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      "127.0.0.1";

    const result = await orderController.addOrder({
      user_id: req.body.user_id,
      total_price: req.body.total_price,
      payment_method: "vnpay",
      products: req.body.products,
      ip: toIPv4(ipAddr),
      address_id: req.body.address_id,
      voucher_id: req.body.voucher_id,
      locale: normalizeLocale(req.body?.locale),
    });

    return res.status(200).json({
      status: true,
      message: "Tạo đơn hàng thành công",
      payment_url: result.payment_url,
      order: result.order,
    });
  } catch (err) {
    console.error("🔥 Lỗi tạo đơn hàng VNPAY:", err);
    return res.status(500).json({
      status: false,
      message: "Lỗi tạo đơn hàng VNPAY",
      error: err.message,
    });
  }
});

// [POST] VNPAY guest — truyền locale và IPv4 xuống controller
router.post("/vnpay-guest", async (req, res) => {
  try {
    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      "127.0.0.1";

    const { total_price, payment_method, locale, customer_info, products } = req.body;

    const address_guess = {
      name: customer_info.name,
      phone: customer_info.phone,
      email: customer_info.email,
      address: customer_info.address,
      type: customer_info.type,
      detail: "",
    };

    const newOrder = await orderController.addOrderForGuest({
      address_guess,
      total_price,
      payment_method, // nên là "vnpay"
      products,
      ip: toIPv4(ipAddr),
      locale: normalizeLocale(locale),
    });

    res.status(200).json({
      status: true,
      message: "Tạo đơn hàng vãng lai thành công",
      payment_url: newOrder.payment_url,
      order: newOrder.order,
    });
  } catch (err) {
    console.error("🔥 Lỗi tạo đơn hàng guest:", err.message);
    res.status(500).json({
      status: false,
      message: "Lỗi tạo đơn hàng guest",
      error: err.message,
    });
  }
});

// [GET] VNPAY return (user)
router.get("/vnpay_return", async (req, res) => {
  try {
    console.log("📥 VNPay return query:", req.query); // ✅ Log query
    await orderController.vnpayCallback(req.query);
    return res.redirect(`${process.env.CLIENT_URL}/page/payment/success/${req.query.vnp_TxnRef}`);
  } catch (err) {
    console.error("❌ VNPay Callback Lỗi:", err.message); // ✅ Log lỗi rõ hơn
    return res.redirect("/page/payment/fail");
  }
});

// [GET] VNPAY return (guest)  ❗️/vnpay_return_guest (đổi từ _guess)
router.get("/vnpay_return_guest", async (req, res) => {
  try {
    console.log("📥 VNPay return query:", req.query);
    await orderController.vnpayCallbackForGuest(req.query);
      return res.redirect(`thanh toán thành công`);
  } catch (err) {
    console.error("❌ VNPay Callback Lỗi:", err.message);
    return res.redirect(`thanh toán thất bại`);
  }
});

// [GET] VNPAY IPN
router.get("/vnpay_ipn", async (req, res) => {
  try {
    await orderController.vnpayCallback(req.query);
    res.status(200).json({ RspCode: "00", Message: "IPN Success" });
  } catch (err) {
    res.status(200).json({
      RspCode: "97",
      Message: err.message || "Checksum failed",
    });
  }
});

// [GET] Lấy đơn hàng theo user
router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await orderController.getOrdersByUserId(req.params.userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// [GET] Lấy đơn hàng theo ID
router.get("/:id", async (req, res) => {
  try {
    const result = await orderController.getOrderById(req.params.id);
    if (!result) {
      return res.status(404).json({ status: false, message: "Không tìm thấy đơn hàng" });
    }
    return res.status(200).json({ status: true, order: result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi lấy đơn hàng" });
  }
});

// [DELETE] Xóa đơn hàng
router.delete("/:id", async (req, res) => {
  try {
    const result = await orderController.deleteOrder(req.params.id);
    return res.status(200).json({ status: true, message: "Xoá đơn hàng thành công", result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi xoá đơn hàng" });
  }
});

// [GET] Confirm guest (GUI)  ❗️/confirm-guest (đổi từ /confirm-guess)
router.get("/confirm-guest/:orderId", async (req, res) => {
  const { orderId } = req.params;
  try {
    const updated = await orderModel.findByIdAndUpdate(
      orderId,
      {
        confirmed: true,
        $push: {
          status_history: {
            status: "pending",
            updatedAt: new Date(),
            note: "Khách xác nhận đơn hàng qua email",
          },
        },
      },
      { new: true }
    );
    if (!updated) return res.status(404).send("Không tìm thấy đơn hàng");

    return res.send(`
      <h2>✅ Đơn hàng đã được xác nhận thành công!</h2>
      <p>Cảm ơn bạn đã xác nhận đơn hàng. Chúng tôi sẽ tiến hành xử lý sớm nhất.</p>
    `);
  } catch (err) {
    console.error("Lỗi xác nhận đơn:", err);
    return res.status(500).send("Đã xảy ra lỗi khi xác nhận đơn hàng.");
  }
});

// [PUT] Confirm guest (API)  ❗️/confirm-guest (đổi từ /confirm-guess)
router.put("/confirm-guest/:orderId", async (req, res) => {
  const { orderId } = req.params;
  try {
    const updated = await orderModel.findByIdAndUpdate(
      orderId,
      {
        confirmed: true,
        $push: {
          status_history: {
            status: "pending",
            updatedAt: new Date(),
            note: "Khách xác nhận đơn hàng",
          },
        },
      },
      { new: true }
    );
    if (!updated) {
      return res.status(404).json({ status: false, message: "Không tìm thấy đơn hàng" });
    }
    return res.json({ status: true, message: "Xác nhận đơn hàng thành công", order: updated });
  } catch (err) {
    console.error("Lỗi xác nhận đơn:", err);
    return res.status(500).json({ status: false, message: "Lỗi xác nhận đơn hàng" });
  }
});

module.exports = router;
