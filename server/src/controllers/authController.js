// authController.js
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase-config.js";
import db from "../db/connection.js";
import bcrypt from "bcrypt";

const saltRounds = 10;

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Fetch user from the database
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

        // Compare password with hashed password stored in the database
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate Firebase token for the user
        const userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
        const token = await userCredential.user.getIdToken();

        res.status(200).json({ token });
      }
    );
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
      email: email,
      password: hashedPassword,
    };

    db.query(
      "INSERT INTO users (email, password) VALUES (?, ?)",
      [newUser.email, newUser.password],
      (error, results) => {
        if (error) {
          console.error("Error inserting user into database:", error);
          return res.status(500).json({ error: "Registration failed" });
        }
        console.log("User inserted into database:", results);
        res.status(201).json({ user: newUser });
      }
    );
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};
