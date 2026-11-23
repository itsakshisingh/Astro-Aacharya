const express = require("express");
const router = express.Router();

const {
  getPendingAstrologers,
  getAllAstrologers,
  getAstrologerDetails,
  updateAstrologerStatus,
  getAdminProfile,
  updateAdminProfile,
} = require("../controllers/admin.controller");

// Admin Routes
router.get("/astrologers/pending", getPendingAstrologers);
router.get("/astrologers", getAllAstrologers);
router.get("/astrologers/:id", getAstrologerDetails);
router.patch("/astrologers/:id/status", updateAstrologerStatus);
router.put("/astrologers/:id/status", updateAstrologerStatus); // Support PUT as well

// Admin Profile Routes
router.get("/profile/:userId", getAdminProfile);
router.put("/profile/:userId", updateAdminProfile);
router.patch("/profile/:userId", updateAdminProfile);

module.exports = router;
