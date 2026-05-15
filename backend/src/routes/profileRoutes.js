const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middleware/auth");

router.get("/stats", requireAuth, profileController.getStats);

module.exports = router;
