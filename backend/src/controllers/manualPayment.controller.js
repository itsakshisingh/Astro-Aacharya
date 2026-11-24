const ManualPayment = require("../models/manualPayment.model");
const PaymentQr = require("../models/paymentQr.model");

// Helper to format full URL
const getFullUrl = (req, relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  const host = req.get("host");
  const protocol = req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  return `${protocol}://${host}${relativePath}`;
};

// 1. Submit Payment Receipt Screenshot (User)
const submitPaymentReceipt = async (req, res) => {
  try {
    const {
      amount,
      utrNumber,
      paymentMethod = "UPI",
      qrId,
      astrologerId,
      orderId,
      appointmentId,
      purpose = "consultation",
      notes,
      senderName,
      senderMobile,
    } = req.body;

    // Check screenshot file
    if (!req.file && !req.body.screenshotImage) {
      return res.status(400).json({
        success: false,
        message: "Payment receipt screenshot is required (form-data field: 'screenshot')",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "A valid payment amount is required",
      });
    }

    const screenshotUrl = req.file
      ? `/uploads/payments/${req.file.filename}`
      : req.body.screenshotImage;

    // Extract user info if authenticated
    const userId = req.user ? req.user._id : req.body.userId || null;
    const effectiveSenderName = senderName || (req.user ? req.user.fullName : "User");
    const effectiveSenderMobile = senderMobile || (req.user ? req.user.mobile : null);

    const payment = await ManualPayment.create({
      userId,
      senderName: effectiveSenderName,
      senderMobile: effectiveSenderMobile,
      qrId: qrId || null,
      astrologerId: astrologerId || null,
      orderId: orderId || null,
      appointmentId: appointmentId || null,
      amount: Number(amount),
      utrNumber: utrNumber ? utrNumber.trim() : null,
      paymentMethod: paymentMethod.trim(),
      screenshotImage: screenshotUrl,
      purpose,
      notes: notes ? notes.trim() : null,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Payment screenshot submitted successfully. Admin/Astrologer will verify shortly.",
      data: {
        ...payment.toObject(),
        fullScreenshotUrl: getFullUrl(req, payment.screenshotImage),
      },
    });
  } catch (error) {
    console.error("Submit Payment Receipt Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit payment receipt",
      error: error.message,
    });
  }
};

// 2. Get My Submitted Payments (User)
const getMyPayments = async (req, res) => {
  try {
    const userId = req.user._id;

    const payments = await ManualPayment.find({ userId })
      .populate("qrId", "title upiId accountHolderName qrCodeImage")
      .populate("astrologerId", "displayName professionalTitle profileImage")
      .sort({ createdAt: -1 });

    const formatted = payments.map((p) => ({
      ...p.toObject(),
      fullScreenshotUrl: getFullUrl(req, p.screenshotImage),
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get My Payments Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve your payments",
      error: error.message,
    });
  }
};

// 3. Get All Payments (Admin / Astrologer Review List)
const getAllPayments = async (req, res) => {
  try {
    const { status, astrologerId, purpose, userId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (astrologerId) filter.astrologerId = astrologerId;
    if (purpose) filter.purpose = purpose;
    if (userId) filter.userId = userId;

    const payments = await ManualPayment.find(filter)
      .populate("userId", "fullName mobile email profileImage")
      .populate("qrId", "title upiId accountHolderName")
      .populate("astrologerId", "displayName professionalTitle profileImage")
      .populate("verifiedBy", "fullName role")
      .sort({ createdAt: -1 });

    const formatted = payments.map((p) => ({
      ...p.toObject(),
      fullScreenshotUrl: getFullUrl(req, p.screenshotImage),
    }));

    return res.status(200).json({
      success: true,
      count: formatted.length,
      data: formatted,
    });
  } catch (error) {
    console.error("Get All Payments Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payments list",
      error: error.message,
    });
  }
};

// 4. Get Payment By ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await ManualPayment.findById(id)
      .populate("userId", "fullName mobile email profileImage")
      .populate("qrId", "title upiId accountHolderName qrCodeImage")
      .populate("astrologerId", "displayName professionalTitle profileImage")
      .populate("verifiedBy", "fullName role");

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment submission not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...payment.toObject(),
        fullScreenshotUrl: getFullUrl(req, payment.screenshotImage),
      },
    });
  } catch (error) {
    console.error("Get Payment By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payment details",
      error: error.message,
    });
  }
};

// 5. Update Payment Status (Admin / Astrologer Verify / Approve / Reject)
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminRemarks } = req.body;

    if (!status || !["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status ('approved', 'rejected', or 'pending') is required",
      });
    }

    const payment = await ManualPayment.findById(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    payment.status = status;
    if (adminRemarks !== undefined) payment.adminRemarks = adminRemarks;
    if (req.user) payment.verifiedBy = req.user._id;
    payment.verifiedAt = new Date();

    await payment.save();

    return res.status(200).json({
      success: true,
      message: `Payment has been ${status} successfully`,
      data: {
        ...payment.toObject(),
        fullScreenshotUrl: getFullUrl(req, payment.screenshotImage),
      },
    });
  } catch (error) {
    console.error("Update Payment Status Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message,
    });
  }
};

// 6. Delete Payment Submission
const deletePayment = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await ManualPayment.findByIdAndDelete(id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment record deleted successfully",
    });
  } catch (error) {
    console.error("Delete Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete payment record",
      error: error.message,
    });
  }
};

module.exports = {
  submitPaymentReceipt,
  getMyPayments,
  getAllPayments,
  getPaymentById,
  updatePaymentStatus,
  deletePayment,
};
