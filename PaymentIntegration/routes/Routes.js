const express = require("express");
const router = express.Router();

const esewaController = require("../controllers/EsewaController");

router.use("/esewa", esewaController);

module.exports = router;
