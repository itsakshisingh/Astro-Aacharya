const express = require("express");
const router = express.Router();
const { uploadAstrologerDocs } = require("../middleware/upload.middleware");

const {
  getAstrologerProfile,
  updateAstrologerProfile,
  getPublicAstrologers,
  submitKYC,
  updateBankDetails,
  verifyKYCStatus,
  toggleOnlineStatus,
  getOnlineAstrologers,
} = require("../controllers/astrologer.controller");

const { authenticate } = require("../middleware/auth.middleware");

// Public API: Get all active & verified astrologers
router.get("/public", getPublicAstrologers);

// Public API: Get ONLY online astrologers (for user panel)
router.get("/online", getOnlineAstrologers);

// Toggle Online/Offline (Astrologer only - requires auth)
router.patch("/toggle-online/:userId", authenticate, toggleOnlineStatus);
router.put("/toggle-online/:userId", authenticate, toggleOnlineStatus);

// Get Profile by Astrologer User ID
router.get("/profile/:userId", getAstrologerProfile);

// Update / Complete Astrologer Profile (Supports Direct Multipart File Uploads!)
router.put("/profile/:userId", uploadAstrologerDocs.any(), updateAstrologerProfile);
router.patch("/profile/:userId", uploadAstrologerDocs.any(), updateAstrologerProfile);

// Submit / Update KYC Details (Supports Direct Multipart File Uploads!)
router.put("/kyc/:userId", uploadAstrologerDocs.any(), submitKYC);
router.patch("/kyc/:userId", uploadAstrologerDocs.any(), submitKYC);

// Update Bank & Payout Details
router.put("/bank-details/:userId", updateBankDetails);
router.patch("/bank-details/:userId", updateBankDetails);

// Admin KYC Verification (Approve / Reject KYC)
router.patch("/kyc-status/:userId", verifyKYCStatus);
router.put("/kyc-status/:userId", verifyKYCStatus);

module.exports = router;
