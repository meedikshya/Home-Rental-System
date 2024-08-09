import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import db from "./db/connection.js";
import routes from "./routes/index.js";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();
const port = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: parseInt(process.env.SESSION_TIMEOUT, 10),
    },
  })
);

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the MySQL database");
});

// Mount routes
app.use("/api", routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
