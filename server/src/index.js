import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const port = process.env.PORT || 5001;

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.get("/api/random", (req, res) => {
  const random = [
    {
      id: 1,
      title: "Random",
      content: "bjskskdhwdio",
    },
    {
      id: 2,
      title: "Random",
      content: "bjskskdhwdio",
    },
  ];
  res.json(random);
});

app.get("/login", (req, res) => {
  res.send("<h2> Login </h2>");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
