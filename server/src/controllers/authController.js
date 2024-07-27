import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import db from "../db/connection.js";
import { generateToken } from "../utils/authUtils.js"; // Function to generate JWT token
import admin from "../firebase-config.js"; // Import Firebase Admin SDK

const saltRounds = 10;
const JWT_SECRET = process.env.JWT_SECRET || "fjhfkhdk";

// Function to handle user login
export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    db.query(
      "SELECT * FROM users WHERE email = ?",
      [email],
      async (error, results) => {
        if (error) {
          console.error("Database query error:", error);
          return res.status(500).json({ error: "Login failed" });
        }

        if (results.length === 0) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = results[0];
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate custom JWT token
        const token = generateToken(user.id);

        // Set JWT token in HttpOnly cookie
        res.cookie("JWTToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // Secure cookies in production
          sameSite: "Strict", // Cookie only sent to same site
        });

        res.status(200).json({ message: "Login successful" });
      }
    );
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// Function to handle user registration
export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = { email: email, password: hashedPassword };

    // Insert user into your database
    db.query(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [newUser.email, newUser.password],
      async (error) => {
        if (error) {
          console.error("Error inserting user into database:", error);
          return res.status(500).json({ error: "Registration failed" });
        }

        try {
          // Create user in Firebase
          await admin.auth().createUser({
            email: newUser.email,
            password: password,
          });

          // Generate custom JWT token
          const token = generateToken(newUser.email);

          // Set JWT token in HttpOnly cookie
          res.cookie("JWTToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Secure cookies in production
            sameSite: "Strict", // Cookie only sent to same site
          });

          res.status(201).json({ message: "Registration successful" });
        } catch (firebaseError) {
          console.error("Error creating user in Firebase:", firebaseError);
          res.status(500).json({ error: "Registration failed in Firebase" });
        }
      }
    );
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};
