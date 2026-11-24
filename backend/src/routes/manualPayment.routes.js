const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { authenticate } = require("../middleware/auth.middleware");
const { uploadPaymentReceipt } = require("../middleware/upload.middleware");
const {
  submitPaymentReceipt,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  updatePaymentStatus,
  deletePayment,
} = require("../controllers/manualPayment.controller");

// Optional authenticate helper for submission (supports both logged in users and guest checkout)
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

// 1. Submit Payment Receipt Screenshot (User)
router.post("/submit", optionalAuth, uploadPaymentReceipt.single("screenshot"), submitPaymentReceipt);

// 2. Get User's Own Payment Submissions (User)
router.get("/my-payments", authenticate, getMyPayments);

// 3. Get All Payments List (Admin / Astrologer)
router.get("/", getAllPayments);

// 4. Get Single Payment Details
router.get("/:id", getPaymentById);

// 5. Update Status (Approve / Reject) (Admin / Astrologer)
router.patch("/:id/status", optionalAuth, updatePaymentStatus);
router.put("/:id/status", optionalAuth, updatePaymentStatus);

// 6. Delete Payment Record
router.delete("/:id", deletePayment);

module.exports = router;
