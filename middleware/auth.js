import jwt from "jsonwebtoken";

const verifyUser = async (req, res, next) => {
  const authHeader = req.headers.authorization; 
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  
  if (!token) {
    return res.status(401).json({ success: false, message: "Not Authorized. Please log in again." });
  }

  try {
    const token_decode = jwt.verify(token, process.env.JWT_SECRET);
    req.body.userId = token_decode.id; 
    next(); 
  } catch (error) {
    console.error("Token verification error:", error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ success: false, message: "Token expired. Please log in again." });
    }

    return res.status(403).json({ success: false, message: "Invalid token. Access denied." });
  }
};

export default verifyUser;

