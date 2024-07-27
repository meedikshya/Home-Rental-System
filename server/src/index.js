import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import db from "./db/connection.js";
import routes from "./routes/index.js";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js"; // Import authRoutes

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cookieParser());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }, // Set to true if using HTTPS
    maxAge: process.env.SESSION_TIMEOUT,
  })
);

// Sync database models
db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the MySQL database");
});

// Mount other routes
app.use("/", routes);

// Mount authRoutes under '/api' base URL
app.use("/api", authRoutes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
