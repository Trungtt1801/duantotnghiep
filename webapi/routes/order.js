const express = require("express");
const router = express.Router();
const orderController = require("../mongo/controllers/orderController");
const { createVnpayPayment } = require("../mongo/untils/vnpay");
const orderModel = require("../mongo/models/orderModel");
// [GET] Lấy tất cả đơn hàng
// URL: http://localhost:3000/orders
router.get("/", async (req, res) => {
  try {
    const result = await orderController.getAllOrders();
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy danh sách đơn hàng" });
  }
});

// [POST] Tạo đơn hàng
// URL: http://localhost:3000/orders
router.post("/", async (req, res) => {
  try {
    const result = await orderController.addOrder(req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi tạo đơn hàng" });
  }
});
router.post("/guess", async (req, res) => {
  try {
    const result = await orderController.addOrderForGuest(req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi tạo đơn hàng" });
  }
});

router.get("/confirm-order/:id", async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await orderModel.findById(orderId);

    if (!order) return res.status(404).send("Không tìm thấy đơn hàng");

    if (order.status_order !== "pending") {
      return res.send("✅ Đơn hàng đã được xác nhận hoặc xử lý trước đó");
    }

    order.status_order = "confirmed";
    order.status_history.push({
      status: "confirmed",
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

// [patch] Xác nhận đơn hàng
// URL: http://localhost:3000/orders/:id/confirm

// [patch] Cập nhật trạng thái đơn hàng
// URL: http://localhost:3000/orders/:id/status
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const result = await orderController.updateOrderStatus(
      req.params.id,
      status
    );
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [patch] Cập nhật thanh toán
// URL: http://localhost:3000/orders/:id/payment
router.patch("/:id/payment", async (req, res) => {
  try {
    const result = await orderController.updatePayment(req.params.id, req.body);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [patch] Hủy đơn hàng
// URL: http://localhost:3000/orders/:id/cancel?admin=true
router.patch("/:id/cancel", async (req, res) => {
  try {
    const isAdmin = req.query.admin === "true";
    const result = await orderController.cancelOrder(req.params.id, isAdmin);
    return res.status(200).json({ status: true, result });
  } catch (err) {
    return res.status(400).json({ status: false, message: err.message });
  }
});

// [GET] Lọc đơn hàng
// URL: http://localhost:3000/orders/filter?status=delivered&customerId=abc123
router.get("/filter", async (req, res) => {
  try {
    const result = await orderController.filterOrders(req.query);
    return res.status(200).json({ status: true, result });
  } catch (error) {
    return res.status(500).json({ status: false, message: "Lỗi lọc đơn hàng" });
  }
});
router.get("/test-point", async (req, res) => {
  try {
    // Thay userId và số điểm tùy bạn
    await orderController.updateUserPoint("686f6d68be04b218525ff55f", 200000);
    res.json({ status: true, message: "Cộng điểm thành công" });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

router.post("/zalopay-callback", async (req, res) => {
  try {
    const result = await orderController.zaloCallback(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// localhost:3000/orders/zalopay
router.post("/zalopay", async (req, res) => {
  try {
    const result = await orderController.createOrderWithZaloPay(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// localhost:3000/orders/vnpay
router.post("/vnpay", async (req, res) => {
  try {
    const { user_id, total_price, products, locale, address_id, voucher_id } = req.body;

    const ipAddr =
      req.headers["x-forwarded-for"] ||
      req.connection.remoteAddress ||
      req.socket?.remoteAddress ||
      req.connection?.socket?.remoteAddress ||
      "127.0.0.1";

    // Gọi đúng hàm tạo thanh toán VNPAY
    const vnpayRes = await createVnpayPayment(
      total_price,
      user_id,
      ipAddr,
      locale,
      address_id,
      voucher_id
    );

    // ✅ Bạn cần truyền address_id và voucher_id ở đây
    const newOrder = await orderController.addOrder({
      user_id,
      total_price,
      payment_method: "vnpay",
      products,
      transaction_code: vnpayRes.transaction_code,
      ip: ipAddr,
      address_id, 
      voucher_id, 
    });

    res.status(200).json({
      status: true,
      message: "Tạo đơn hàng thành công",
      payment_url: vnpayRes.payment_url,
      order: newOrder.order,
    });
  } catch (err) {
    console.error("🔥 Lỗi chi tiết khi tạo đơn hàng VNPAY:", err);
    res.status(500).json({
      status: false,
      message: "Lỗi tạo đơn hàng VNPAY",
      error: err.message,
    });
  }
});

router.get("/vnpay_return", async (req, res) => {
  try {
    await orderController.vnpayCallback(req.query);
    res.redirect("/thanh-toan-thanh-cong"); // FE xử lý URL này
  } catch (err) {
    res.redirect("/thanh-toan-that-bai");
  }
});

// IPN từ VNPAY
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
// localhost:3000/orders/user/:userId
router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await orderController.getOrdersByUserId(req.params.userId);
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// [GET] Lấy đơn hàng theo ID
// URL: http://localhost:3000/orders/:id
router.get("/:id", async (req, res) => {
  try {
    const result = await orderController.getOrderById(req.params.id);
    if (!result) {
      return res
        .status(404)
        .json({ status: false, message: "Không tìm thấy đơn hàng" });
    }
    return res.status(200).json({ status: true, result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi lấy đơn hàng" });
  }
});

// [DELETE] Xóa đơn hàng
// URL: http://localhost:3000/orders/:id
router.delete("/:id", async (req, res) => {
  try {
    const result = await orderController.deleteOrder(req.params.id);
    return res
      .status(200)
      .json({ status: true, message: "Xoá đơn hàng thành công", result });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, message: "Lỗi xoá đơn hàng" });
  }
});


// Route GET cho link xác nhận qua email
router.get("/confirm-guess/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const updated = await orderModel.findByIdAndUpdate(
      orderId,
      {
        confirmed: true,
        $push: {
          status_history: {
            status: "confirmed",
            updatedAt: new Date(),
            note: "Khách xác nhận đơn hàng qua email",
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).send("Không tìm thấy đơn hàng");
    }

    // Gửi giao diện xác nhận đơn hàng thành công
    return res.send(`
      <h2>✅ Đơn hàng đã được xác nhận thành công!</h2>
      <p>Cảm ơn bạn đã xác nhận đơn hàng. Chúng tôi sẽ tiến hành xử lý sớm nhất.</p>
    `);
  } catch (err) {
    console.error("Lỗi xác nhận đơn:", err);
    return res.status(500).send("Đã xảy ra lỗi khi xác nhận đơn hàng.");
  }
});

router.put("/confirm-guess/:orderId", async (req, res) => {
  const { orderId } = req.params;

  try {
    const updated = await orderModel.findByIdAndUpdate(
      orderId,
      {
        confirmed: true,
        $push: {
          status_history: {
            status: "confirmed",
            updatedAt: new Date(),
            note: "Khách xác nhận đơn hàng",
          },
        },
      },
      { new: true } // Trả về bản ghi đã cập nhật
    );

    if (!updated) {
      return res.status(404).json({
        status: false,
        message: "Không tìm thấy đơn hàng",
      });
    }

    return res.json({
      status: true,
      message: "Xác nhận đơn hàng thành công",
      order: updated,
    });
  } catch (err) {
    console.error("Lỗi xác nhận đơn:", err);
    return res.status(500).json({
      status: false,
      message: "Lỗi xác nhận đơn hàng",
    });
  }
});

module.exports = router;
