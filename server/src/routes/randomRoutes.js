import express from "express";
import { getRandomData } from "../controllers/randomController.js";

const router = express.Router();

router.get("/", getRandomData);

export default router;
