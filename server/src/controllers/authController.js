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

        // Include the role in the token payload
        const token = generateToken({ id: user.id, role: user.role });

        // Set JWT token in HttpOnly cookie
        res.cookie("JWTToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // Secure cookies in production
          sameSite: "Strict", // Cookie only sent to same site
        });

        // Return a success message
        res.status(200).json({ message: "Login successful", role: user.role });
      }
    );
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// Function to handle user registration
export const registerUser = async (req, res) => {
  const { email, password, role = "user" } = req.body; // Default role is 'user'

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const newUser = { email: email, password: hashedPassword, role };

    // Insert user into your database with a role
    db.query(
      "INSERT INTO users (email, password, role) VALUES (?, ?, ?)",
      [newUser.email, newUser.password, newUser.role],
      async (error) => {
        if (error) {
          console.error("Error inserting user into database:", error);
          return res.status(500).json({ error: "Registration failed" });
        }

        try {
          // Create user in Firebase
          const userRecord = await admin.auth().createUser({
            email: newUser.email,
            password: password,
          });

          // Set custom claims (e.g., role) for the user in Firebase
          await admin
            .auth()
            .setCustomUserClaims(userRecord.uid, { role: role });

          // Generate custom JWT token using newUser object
          const token = generateToken({
            id: userRecord.uid, // Use Firebase UID for the token
            email: newUser.email,
            role: newUser.role,
          });

          // Set JWT token in HttpOnly cookie
          res.cookie("JWTToken", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production", // Secure cookies in production
            sameSite: "Strict", // Cookie only sent to the same site
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
