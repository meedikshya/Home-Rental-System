import express from "express";
import dotenv from "dotenv";
import db from "./db/connection.js";
import routes from "./routes/index.js";
import authRoutes from "./routes/authRoutes.js"; // Import authRoutes
import verifyFirebaseToken from "./middlewares/verifyFirebaseToken.js"; // Import Firebase auth middleware

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the MySQL database");
});

// Middleware to parse JSON bodies
app.use(express.json());

// Mount other routes
app.use("/", routes);

// Mount authRoutes under '/api' base URL with Firebase token verification
app.use("/api", verifyFirebaseToken, authRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
