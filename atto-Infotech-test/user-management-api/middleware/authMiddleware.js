const jwt = require("jsonwebtoken");

/**
 * Middleware to authenticate a JWT token.
 * This function checks for a valid token in the Authorization header,
 * verifies it, and attaches the decoded user information to the request object.
 * If the token is missing or invalid, it returns an appropriate error response.
 */
const authenticateToken = (req, res, next) => {
  // Extract the token from the Authorization header
  const token = req.header("Authorization")?.split(" ")[1];
  console.log("Token extracted from Authorization header:", token);

  // If no token is found, deny access
  if (!token) {
    console.error("Access denied: No token provided");
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    // Verify the token using the JWT secret
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Token verified successfully. Decoded user:", verified);

    // Attach the decoded user information to the request object
    req.user = verified;

    // Proceed to the next middleware or route handler
    next();
  } catch (err) {
    console.error("Invalid token:", err.message);

    // Handle invalid or expired tokens
    res.status(400).json({ message: "Invalid or expired token." });
  }
};

module.exports = authenticateToken;
