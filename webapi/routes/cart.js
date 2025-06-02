var express = require("express");
var router = express.Router();
const cartController = require("../mongo/controllers/cartController");

router.get("/", async (req, res) => {
  try {
    const result = await cartController.getAllCart();
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: false, message: "Lỗi lấy dữ liệu giỏ hàng" });
  }
});
router.post("/addcart", async (req, res) => {
  try {
    const newCart = await cartController.addCart(req.body);
    res.status(200).json(newCart);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.put('/update', async (req, res) => {
  try {
    const result = await cartController.updateCart(req.body);
    res.status(200).json({ message: 'Cập nhật thành công', cart: result });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});
router.delete('/delete/:id', async (req, res) =>{
  try {
    const {id} = req.params;
    const result = await cartController.deleteCart(id);
    return res.status(200).json({status: true, message: "Xóa thành công"})
  } catch (error) {
    console.log(error);
    return res.status(500).json({status: false, message: "Lỗi xóa giỏ hàng"});
  }
})
module.exports = router;
