import { auth } from "../firebase-config.js";

const verifyToken = async (req, res, next) => {
  const authorizationHeader = req.headers.authorization;
  let token;

  if (authorizationHeader && authorizationHeader.startsWith("Bearer ")) {
    token = authorizationHeader.split(" ")[1];
  } else {
    return res.status(403).json({ error: "No token provided" });
  }

  console.log("Received Token:", token); // Log the received token for debugging

  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return res.status(403).json({ error: "Unauthorized" });
  }
};

export default verifyToken;
