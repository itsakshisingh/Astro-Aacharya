const mongoose = require("mongoose");

const manualPaymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    senderName: {
      type: String,
      trim: true,
      default: null,
    },

    senderMobile: {
      type: String,
      trim: true,
      default: null,
    },

    senderEmail: {
      type: String,
      trim: true,
      default: null,
    },

    qrId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentQr",
      default: null,
    },

    astrologerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AstrologerProfile",
      default: null,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },

    amount: {
      type: Number,
      default: 0,
    },

    utrNumber: {
      type: String,
      trim: true,
      default: null, // Transaction Reference / UTR Number
    },

    paymentMethod: {
      type: String,
      trim: true,
      default: "UPI", // PhonePe, GooglePay, Paytm, BHIM, Bank Transfer
    },

    screenshotImage: {
      type: String,
      default: null, // Primary screenshot
    },

    screenshots: {
      type: [String],
      default: [], // Multiple screenshot images
    },

    purpose: {
      type: String,
      enum: ["consultation", "appointment", "product_order", "wallet_recharge", "puja", "other"],
      default: "consultation",
    },

    notes: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    adminRemarks: {
      type: String,
      trim: true,
      default: null,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ManualPayment", manualPaymentSchema);
