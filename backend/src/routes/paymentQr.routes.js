const express = require("express");
const router = express.Router();
const { uploadPaymentQr } = require("../middleware/upload.middleware");
const {
  createPaymentQr,
  getActivePaymentQr,
  getAllPaymentQrs,
  getPaymentQrById,
  updatePaymentQr,
  deletePaymentQr,
} = require("../controllers/paymentQr.controller");

// 1. Get Active QR (Public for Users to scan and pay)
router.get("/active", getActivePaymentQr);

// 2. Get All QRs
router.get("/", getAllPaymentQrs);

// 3. Get Single QR by ID
router.get("/:id", getPaymentQrById);

// 4. Create New QR (Admin or Astrologer)
router.post("/", uploadPaymentQr.single("qrImage"), createPaymentQr);

// 5. Update QR
router.put("/:id", uploadPaymentQr.single("qrImage"), updatePaymentQr);
router.patch("/:id", uploadPaymentQr.single("qrImage"), updatePaymentQr);

// 6. Delete QR
router.delete("/:id", deletePaymentQr);

module.exports = router;
