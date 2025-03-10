const express = require("express");
const router = express.Router();

// Import the eSewa controller router
const esewaController = require("../controllers/EsewaController");

// Mount the eSewa routes
router.use("/esewa", esewaController);

module.exports = router;
