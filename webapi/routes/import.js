// routes/import.js
const express = require("express");
const router = express.Router();
const ImportController = require("../mongo/controllers/importController");

// POST /import
router.post("/", ImportController.importProducts);

module.exports = router;
