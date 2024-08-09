import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "gjhhchc";

// Middleware to verify JWT and check user role
const verifyJwtToken = (requiredRole) => {
  return (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Token not provided" });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({ error: "Token expired" });
        }
        return res.status(403).json({ error: "Invalid token" });
      }

      req.user = user; // The `user` object now contains `id` and `role`

      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      next();
    });
  };
};

export default verifyJwtToken;
