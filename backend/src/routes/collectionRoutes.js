const express = require("express");
const router = express.Router();
const collectionController = require("../controllers/collectionController");
const { requireAuth } = require("../middleware/auth");

router.get("/", requireAuth, collectionController.getCollections);

module.exports = router;
