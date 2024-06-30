import express from "express";
import randomRoutes from "./randomRoutes.js";
import loginRoutes from "./loginRoutes.js";

const router = express.Router();

router.use("/api/random", randomRoutes);
router.use("/login", loginRoutes);

router.get("/", (req, res) => {
  res.send("Hello World!");
});

export default router;
