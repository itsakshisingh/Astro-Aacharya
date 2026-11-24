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

// 1. Create Payment QR (Admin or Astrologer)
const createPaymentQr = async (req, res) => {
  try {
    const {
      title,
      upiId,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      role = "admin",
      astrologerId,
      description,
      isActive = true,
      isDefault = false,
    } = req.body;

    if (!req.file && !req.body.qrCodeImage) {
      return res.status(400).json({
        success: false,
        message: "QR code image file is required (form-data field: 'qrImage')",
      });
    }

    if (!upiId || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message: "UPI ID and Account Holder Name are required",
      });
    }

    const qrImageUrl = req.file
      ? `/uploads/qr/${req.file.filename}`
      : req.body.qrCodeImage;

    const shouldBeDefault = Boolean(isDefault === true || isDefault === "true");

    // If marked as default, unset other defaults in the same scope
    if (shouldBeDefault) {
      const scopeQuery = role === "astrologer" && astrologerId
        ? { astrologerId }
        : { role: "admin" };
      await PaymentQr.updateMany(scopeQuery, { isDefault: false });
    }

    const newQr = await PaymentQr.create({
      title: title || (role === "astrologer" ? "Astrologer UPI QR" : "Official Jyotara UPI QR"),
      upiId: upiId.trim(),
      accountHolderName: accountHolderName.trim(),
      bankName: bankName ? bankName.trim() : null,
      accountNumber: accountNumber ? accountNumber.trim() : null,
      ifscCode: ifscCode ? ifscCode.trim() : null,
      qrCodeImage: qrImageUrl,
      role: role === "astrologer" ? "astrologer" : "admin",
      createdBy: req.user ? req.user._id : null,
      astrologerId: astrologerId || null,
      description: description || undefined,
      isActive: Boolean(isActive === true || isActive === "true" || isActive === undefined),
      isDefault: shouldBeDefault,
    });

    return res.status(201).json({
      success: true,
      message: "Payment QR code created successfully",
      data: {
        ...newQr.toObject(),
        fullQrImageUrl: getFullUrl(req, newQr.qrCodeImage),
      },
    });
  } catch (error) {
    console.error("Create Payment QR Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create payment QR code",
      error: error.message,
    });
  }
};

// 2. Get Active Payment QR (Public for Users to scan and pay)
const getActivePaymentQr = async (req, res) => {
  try {
    const { astrologerId, role } = req.query;

    let qr = null;

    // 1. If astrologerId is passed, try finding astrologer's active QR
    if (astrologerId) {
      qr = await PaymentQr.findOne({
        astrologerId,
        isActive: true,
      }).sort({ isDefault: -1, createdAt: -1 });
    }

    // 2. If no astrologer QR found or role is admin, get default admin QR
    if (!qr) {
      qr = await PaymentQr.findOne({
        role: "admin",
        isActive: true,
        isDefault: true,
      });
    }

    // 3. Fallback to any active admin QR
    if (!qr) {
      qr = await PaymentQr.findOne({
        role: "admin",
        isActive: true,
      }).sort({ createdAt: -1 });
    }

    // 4. Fallback to any active QR in system
    if (!qr) {
      qr = await PaymentQr.findOne({
        isActive: true,
      }).sort({ createdAt: -1 });
    }

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: "No active payment QR code found. Please contact admin.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Active payment QR retrieved successfully",
      data: {
        ...qr.toObject(),
        fullQrImageUrl: getFullUrl(req, qr.qrCodeImage),
      },
    });
  } catch (error) {
    console.error("Get Active Payment QR Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to get active payment QR",
      error: error.message,
    });
  }
};

// 3. Get All Payment QRs (Admin / Astrologer list)
const getAllPaymentQrs = async (req, res) => {
  try {
    const { role, astrologerId, isActive } = req.query;
    const filter = {};

    if (role) filter.role = role;
    if (astrologerId) filter.astrologerId = astrologerId;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const qrs = await PaymentQr.find(filter)
      .populate("astrologerId", "displayName professionalTitle profileImage")
      .sort({ isDefault: -1, createdAt: -1 });

    const formattedQrs = qrs.map((qr) => ({
      ...qr.toObject(),
      fullQrImageUrl: getFullUrl(req, qr.qrCodeImage),
    }));

    return res.status(200).json({
      success: true,
      count: formattedQrs.length,
      data: formattedQrs,
    });
  } catch (error) {
    console.error("Get All Payment QRs Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payment QRs",
      error: error.message,
    });
  }
};

// 4. Get Payment QR by ID
const getPaymentQrById = async (req, res) => {
  try {
    const { id } = req.params;
    const qr = await PaymentQr.findById(id).populate(
      "astrologerId",
      "displayName professionalTitle profileImage"
    );

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: "Payment QR code not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...qr.toObject(),
        fullQrImageUrl: getFullUrl(req, qr.qrCodeImage),
      },
    });
  } catch (error) {
    console.error("Get Payment QR By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve payment QR",
      error: error.message,
    });
  }
};

// 5. Update Payment QR
const updatePaymentQr = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      upiId,
      accountHolderName,
      bankName,
      accountNumber,
      ifscCode,
      description,
      isActive,
      isDefault,
    } = req.body;

    const qr = await PaymentQr.findById(id);
    if (!qr) {
      return res.status(404).json({
        success: false,
        message: "Payment QR code not found",
      });
    }

    if (title !== undefined) qr.title = title.trim();
    if (upiId !== undefined) qr.upiId = upiId.trim();
    if (accountHolderName !== undefined) qr.accountHolderName = accountHolderName.trim();
    if (bankName !== undefined) qr.bankName = bankName ? bankName.trim() : null;
    if (accountNumber !== undefined) qr.accountNumber = accountNumber ? accountNumber.trim() : null;
    if (ifscCode !== undefined) qr.ifscCode = ifscCode ? ifscCode.trim() : null;
    if (description !== undefined) qr.description = description.trim();
    if (isActive !== undefined) qr.isActive = Boolean(isActive === true || isActive === "true");

    if (isDefault !== undefined) {
      const shouldBeDefault = Boolean(isDefault === true || isDefault === "true");
      qr.isDefault = shouldBeDefault;
      if (shouldBeDefault) {
        const scopeQuery = qr.role === "astrologer" && qr.astrologerId
          ? { astrologerId: qr.astrologerId, _id: { $ne: qr._id } }
          : { role: "admin", _id: { $ne: qr._id } };
        await PaymentQr.updateMany(scopeQuery, { isDefault: false });
      }
    }

    if (req.file) {
      qr.qrCodeImage = `/uploads/qr/${req.file.filename}`;
    } else if (req.body.qrCodeImage) {
      qr.qrCodeImage = req.body.qrCodeImage;
    }

    await qr.save();

    return res.status(200).json({
      success: true,
      message: "Payment QR code updated successfully",
      data: {
        ...qr.toObject(),
        fullQrImageUrl: getFullUrl(req, qr.qrCodeImage),
      },
    });
  } catch (error) {
    console.error("Update Payment QR Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update payment QR code",
      error: error.message,
    });
  }
};

// 6. Delete Payment QR
const deletePaymentQr = async (req, res) => {
  try {
    const { id } = req.params;
    const qr = await PaymentQr.findByIdAndDelete(id);

    if (!qr) {
      return res.status(404).json({
        success: false,
        message: "Payment QR code not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment QR code deleted successfully",
    });
  } catch (error) {
    console.error("Delete Payment QR Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete payment QR code",
      error: error.message,
    });
  }
};

module.exports = {
  createPaymentQr,
  getActivePaymentQr,
  getAllPaymentQrs,
  getPaymentQrById,
  updatePaymentQr,
  deletePaymentQr,
};
