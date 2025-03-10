const express = require("express");
const bodyParser = require("body-parser");
const { db } = require("./db");
const cors = require("cors");
const app = express();

// Load environment variables first
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// Import models
const Payment = require("./models/Payment");
const Agreement = require("./models/Agreement");

// Import routes
const routes = require("./routes/Routes");

// Middleware



app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
db.authenticate()
  .then(() => {
    console.log("✅ Database connected successfully");
    return Payment.sync({ alter: false });
  })
  .then(() => console.log("✅ Payment model synchronized"))
  .catch((err) => console.error("❌ Database error:", err));

// Routes
app.get("/", (req, res) => {
  res.send("Payment Integration API is running");
});

// API routes
app.use("/api", routes);

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend listening at http://localhost:${PORT}`);
});
