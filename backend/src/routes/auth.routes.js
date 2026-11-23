const express = require("express");
const router = express.Router();

const {
  sendOtp,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getMe,
  logoutUser,
  registerUser,
  loginUser,
  updateUserProfile,
  getUserProfile,
} = require("../controllers/auth.controller");

const { authenticate } = require("../middleware/auth.middleware");

// ==========================================
// OTP AUTHENTICATION ROUTES
// ==========================================

// 1. Send OTP (Static OTP: 1234, Expiry: 5 mins)
router.post("/send-otp", sendOtp);

// 2. Verify OTP & Login
router.post("/verify-otp", verifyOtp);

// 3. Resend OTP
router.post("/resend-otp", resendOtp);

// ==========================================
// PASSWORD RECOVERY ROUTES
// ==========================================

// 4. Forgot Password (Sends OTP to Mobile)
router.post("/forgot-password", forgotPassword);

// 5. Reset Password (Verifies OTP & Sets New Password)
router.post("/reset-password", resetPassword);

// ==========================================
// SESSION & LOGOUT ROUTES
// ==========================================

// 6. Session Management / Get Logged-in User Profile (Token Protected)
router.get("/me", authenticate, getMe);

// 7. Logout (Token Protected / Optional)
router.post("/logout", logoutUser);

// ==========================================
// USER PROFILE MANAGEMENT (TOKEN PROTECTED)
// ==========================================

// 8. Update Profile (Token Protected)
router.put("/profile", authenticate, updateUserProfile);
router.patch("/profile", authenticate, updateUserProfile);
router.put("/profile/:userId", authenticate, updateUserProfile);
router.patch("/profile/:userId", authenticate, updateUserProfile);

// 9. Get Profile (Token Protected - with or without userId)
router.get("/profile", authenticate, getUserProfile);
router.get("/profile/:userId", authenticate, getUserProfile);

// ==========================================
// TRADITIONAL AUTH ROUTES
// ==========================================

// 10. Register
router.post("/register", registerUser);
router.post("/astrologer/register", registerUser);

// 11. Password-based Login
router.post("/login", loginUser);

module.exports = router;
