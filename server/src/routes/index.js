import express from "express";
import randomRoutes from "./randomRoutes.js";
import loginRoutes from "./loginRoutes.js";
import authRoutes from "./authRoutes.js";
import adminRoutes from "./adminRoutes.js";

const router = express.Router();

router.use("/api/random", randomRoutes);
router.use("/login", loginRoutes);

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);

router.get("/", (req, res) => {
  res.send("Hello World!");
});

export default router;
