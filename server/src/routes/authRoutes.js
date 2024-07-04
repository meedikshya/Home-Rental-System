// routes.js
import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js";
import verifyToken from "../middlewares/verifyFirebaseToken.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/register", verifyToken, registerUser);

export default router;
