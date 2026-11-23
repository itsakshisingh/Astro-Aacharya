const express = require("express");
const router = express.Router();

const {
  getAstrologerProfile,
  updateAstrologerProfile,
  getPublicAstrologers,
  submitKYC,
  updateBankDetails,
  verifyKYCStatus,
} = require("../controllers/astrologer.controller");

// Public API: Get all active & verified astrologers
router.get("/public", getPublicAstrologers);

// Get Profile by Astrologer User ID
router.get("/profile/:userId", getAstrologerProfile);

// Update / Complete Astrologer Profile
router.put("/profile/:userId", updateAstrologerProfile);
router.patch("/profile/:userId", updateAstrologerProfile);

// Submit / Update KYC Details (Aadhaar & PAN)
router.put("/kyc/:userId", submitKYC);
router.patch("/kyc/:userId", submitKYC);

// Update Bank & Payout Details
router.put("/bank-details/:userId", updateBankDetails);
router.patch("/bank-details/:userId", updateBankDetails);

// Admin KYC Verification (Approve / Reject KYC)
router.patch("/kyc-status/:userId", verifyKYCStatus);
router.put("/kyc-status/:userId", verifyKYCStatus);

module.exports = router;
