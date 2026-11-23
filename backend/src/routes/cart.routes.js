const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} = require("../controllers/cart.controller");

// Optional Auth Middleware (Supports both Token and direct userId)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_secret"
      );
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (e) {
    // Ignore invalid token and fall back to body/query userId
  }
  next();
};

// 1. Get Cart
router.get("/", optionalAuth, getCart);
router.get("/:userId", optionalAuth, getCart);

// 2. Add to Cart
router.post("/add", optionalAuth, addToCart);

// 3. Update Item Quantity in Cart
router.put("/update", optionalAuth, updateCartItem);
router.patch("/update", optionalAuth, updateCartItem);

// 4. Remove Item from Cart
router.delete("/remove/:productId", optionalAuth, removeFromCart);
router.delete("/remove", optionalAuth, removeFromCart);

// 5. Clear Entire Cart
router.delete("/clear", optionalAuth, clearCart);

module.exports = router;
