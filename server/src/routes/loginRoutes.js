import express from "express";
import { loginPage } from "../controllers/loginController.js";

const router = express.Router();

router.get("/", loginPage);

export default router;
