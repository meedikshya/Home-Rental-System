import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../auth-config.js";

export const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "1h",
    algorithm: "HS256",
  });
};
