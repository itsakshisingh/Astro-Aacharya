const mongoose = require("mongoose");

const paymentQrSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      default: "Scan & Pay UPI QR",
    },

    upiId: {
      type: String,
      required: true,
      trim: true,
    },

    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },

    bankName: {
      type: String,
      trim: true,
      default: null,
    },

    accountNumber: {
      type: String,
      trim: true,
      default: null,
    },

    ifscCode: {
      type: String,
      trim: true,
      default: null,
    },

    qrCodeImage: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "astrologer"],
      default: "admin",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    astrologerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AstrologerProfile",
      default: null,
    },

    description: {
      type: String,
      trim: true,
      default: "Please scan the QR code using any UPI app (GPay, PhonePe, Paytm) and upload the payment receipt screenshot with UTR number.",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PaymentQr", paymentQrSchema);
