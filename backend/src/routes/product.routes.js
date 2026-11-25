const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { uploadProduct } = require("../middleware/upload.middleware");

const {
  createProduct,
  getAllProducts,
  getProductByIdOrSlug,
  updateProduct,
  deleteProduct,
  getProductsByCreator,
} = require("../controllers/product.controller");

// Optional Auth Helper (extracts astrologer from Bearer token if provided)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret");
      const user = await User.findById(decoded.id);
      if (user) req.user = user;
    }
  } catch (e) {
    // ignore token error in optional auth
  }
  next();
};

// Product Routes

// 1. Create a new product (Supports direct image file upload in form-data & optional Token)
router.post("/", optionalAuth, uploadProduct.any(), createProduct);

// 2. Get all products (With filters)
router.get("/", getAllProducts);

// 3. Get products by creator User ID
router.get("/creator/:userId", getProductsByCreator);

// 4. Get product by ID or Slug
router.get("/:idOrSlug", getProductByIdOrSlug);

// 5. Update Product (Supports direct image file upload in form-data!)
router.put("/:id", optionalAuth, uploadProduct.any(), updateProduct);
router.patch("/:id", optionalAuth, uploadProduct.any(), updateProduct);

// 6. Delete Product
router.delete("/:id", optionalAuth, deleteProduct);

module.exports = router;
