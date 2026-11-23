const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access token is missing. Please login to continue.",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "default_secret"
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User session expired or user not found.",
      });
    }

    if (user.status === "blocked" || user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact support.`,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token. Please login again.",
      error: error.message,
    });
  }
};

module.exports = { authenticate };
