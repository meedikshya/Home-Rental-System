import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../auth-config.js";

export const generateToken = (user) => {
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: "30min",
    algorithm: "HS256",
  });
};
