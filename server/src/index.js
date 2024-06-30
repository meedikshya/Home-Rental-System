import express from "express";
import dotenv from "dotenv";
import db from "./db/connection.js";
import routes from "./routes/index.js";

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

app.use("/", routes);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
