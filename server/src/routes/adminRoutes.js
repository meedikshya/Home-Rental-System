import express from "express";
import verifyJwtToken from "../middlewares/verifyFirebaseToken.js";

const router = express.Router();

// Admin panel route (protected for admin role)
router.get("/admin-panel", verifyJwtToken("admin"), (req, res) => {
  res.json({ message: "Welcome to the Admin Panel" });
});

export default router;
