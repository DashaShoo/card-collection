const express = require("express");
const router = express.Router();
const dailyCardController = require("../controllers/dailyCardController");
const { requireAuth } = require("../middleware/auth");

router.get("/status", requireAuth, dailyCardController.getStatus);
router.post("/claim", requireAuth, dailyCardController.claim);

module.exports = router;
