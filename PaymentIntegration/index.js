const express = require("express");
const bodyParser = require("body-parser");
const { db } = require("./db");
const cors = require("cors");
const app = express();

if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const Payment = require("./models/Payment");
const Agreement = require("./models/Agreement");

const routes = require("./routes/Routes");

app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/test.html");
});

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

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Backend listening at http://localhost:${PORT}`);
});
