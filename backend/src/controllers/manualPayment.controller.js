const ManualPayment = require("../models/manualPayment.model");
const PaymentQr = require("../models/paymentQr.model");

// Helper to format full URL
const getFullUrl = (req, relativePath) => {
  if (!relativePath) return null;
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) {
    return relativePath;
  }
  const host = req.get("host");
  const protocol =
    req.protocol === "https" || req.secure || req.headers["x-forwarded-proto"] === "https"
      ? "https"
      : "http";
  return `${protocol}://${host}${relativePath}`;
};

// Helper to format consistent payment object with full URLs
const formatPayment = (req, payment) => {
  if (!payment) return null;
  const obj = payment.toObject ? payment.toObject() : payment;
  const primaryScreenshot = obj.screenshotImage || (obj.screenshots && obj.screenshots[0]) || null;
  const screenshots =
    obj.screenshots && obj.screenshots.length > 0
      ? obj.screenshots
      : primaryScreenshot
      ? [primaryScreenshot]
      : [];

  return {
    ...obj,
    screenshotImage: primaryScreenshot,
    screenshots,
    fullScreenshotUrl: getFullUrl(req, primaryScreenshot),
    fullScreenshotUrls: screenshots.map((s) => getFullUrl(req, s)),
  };
};

// 1. Submit Payment Receipt Screenshot (User - Token Required, Only Images Required)
const submitPaymentReceipt = async (req, res) => {
  try {
    const {
      amount,
      utrNumber,
      paymentMethod = "UPI",
      qrId,
      productId,
      astrologerId,
      orderId,
      appointmentId,
      purpose,
      notes,
    } = req.body;

    // Collect all uploaded screenshot files (supports single or multiple images)
    let uploadedUrls = [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      uploadedUrls = req.files.map((f) => `/uploads/payments/${f.filename}`);
    } else if (req.file) {
      uploadedUrls.push(`/uploads/payments/${req.file.filename}`);
    } else if (req.body.screenshotImage) {
      uploadedUrls.push(req.body.screenshotImage);
    } else if (req.body.screenshots) {
      const parsed = Array.isArray(req.body.screenshots) ? req.body.screenshots : [req.body.screenshots];
      uploadedUrls.push(...parsed);
    }

    if (uploadedUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Payment receipt screenshot image is required in form-data (field: 'screenshot' or 'screenshots')",
      });
    }

    // Must be authenticated user from Token
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required to submit payment receipt",
      });
    }

    // Auto-populate all user details from the token
    const userId = req.user._id;
    const effectiveSenderName = req.user.fullName || "User";
    const effectiveSenderMobile = req.user.mobile || null;
    const effectiveSenderEmail = req.user.email || null;

    const payment = await ManualPayment.create({
      userId,
      senderName: effectiveSenderName,
      senderMobile: effectiveSenderMobile,
      senderEmail: effectiveSenderEmail,
      qrId: qrId || null,
      productId: productId || null,
      astrologerId: astrologerId || null,
      orderId: orderId || null,
      appointmentId: appointmentId || null,
      amount: amount !== undefined && !isNaN(Number(amount)) ? Number(amount) : 0,
      utrNumber: utrNumber ? utrNumber.trim() : null,
      paymentMethod: (paymentMethod || "UPI").trim(),
      screenshotImage: uploadedUrls[0],
      screenshots: uploadedUrls,
      purpose: purpose || (productId ? "product_order" : "consultation"),
      notes: notes ? notes.trim() : null,
      status: "pending",
    });

    const populatedPayment = await ManualPayment.findById(payment._id)
      .populate("productId", "title name price images category")
      .populate("qrId", "title upiId accountHolderName qrCodeImage");

    return res.status(201).json({
      success: true,
      message: "Payment screenshot(s) submitted successfully. Admin/Astrologer will verify shortly.",
      data: formatPayment(req, populatedPayment || payment),
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
      .populate("productId", "title name price images category")
      .populate("qrId", "title upiId accountHolderName qrCodeImage")
      .populate("astrologerId", "displayName professionalTitle profileImage")
      .sort({ createdAt: -1 });

    const formatted = payments.map((p) => formatPayment(req, p));

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
    const { status, astrologerId, purpose, userId, productId } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (astrologerId) filter.astrologerId = astrologerId;
    if (productId) filter.productId = productId;
    if (purpose) filter.purpose = purpose;
    if (userId) filter.userId = userId;

    const payments = await ManualPayment.find(filter)
      .populate("userId", "fullName mobile email profileImage")
      .populate("productId", "title name price images category")
      .populate("qrId", "title upiId accountHolderName")
      .populate("astrologerId", "displayName professionalTitle profileImage")
      .populate("verifiedBy", "fullName role")
      .sort({ createdAt: -1 });

    const formatted = payments.map((p) => formatPayment(req, p));

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
      .populate("productId", "title name price images category")
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
      data: formatPayment(req, payment),
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
      data: formatPayment(req, payment),
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
