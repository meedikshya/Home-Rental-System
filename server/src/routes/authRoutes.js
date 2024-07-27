// authRoutes.js
import express from "express";
import { loginUser, registerUser } from "../controllers/authController.js"; // Import functions
import verifyJwtToken from "../middlewares/verifyFirebaseToken.js"; // Import middleware

const router = express.Router();

// Registration endpoint
router.post("/register", registerUser);

// Login endpoint
router.post("/login", loginUser);

// Logout endpoint
router.post("/logout", (req, res) => {
  // Clear the JWTToken cookie with matching attributes
  res.clearCookie("JWTToken", {
    path: "/", // Ensure this matches the path used when setting the cookie
    httpOnly: true, // Match attributes used when setting the cookie
    secure: process.env.NODE_ENV === "production", // Match secure attribute
    sameSite: "Strict", // Match sameSite attribute
  });

  // Destroy the session
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }
    res.status(200).json({ message: "Logout successful" });
  });
});

export default router;
