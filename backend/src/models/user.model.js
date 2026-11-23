const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    countryCode: {
      type: String,
      default: "+91",
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      default: null,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },

    // ==========================================
    // ASTROLOGY / KUNDLI BIRTH DETAILS
    // ==========================================
    dob: {
      type: String, // Date of Birth "YYYY-MM-DD" e.g., "1995-08-15"
      trim: true,
      default: null,
    },

    tob: {
      type: String, // Time of Birth "HH:MM" e.g., "14:30" or "02:30 PM"
      trim: true,
      default: null,
    },

    pob: {
      type: String, // Place of Birth e.g., "Varanasi, Uttar Pradesh, India"
      trim: true,
      default: null,
    },

    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed", "separated", "other", null],
      default: null,
    },

    occupation: {
      type: String, // e.g. "Software Engineer", "Business", "Student"
      trim: true,
      default: null,
    },

    topicOfConcern: {
      type: String, // e.g. "Career", "Marriage", "Health", "Kundli Dosha"
      trim: true,
      default: null,
    },

    // ==========================================
    // CURRENT ADDRESS (FOR PUJA / PRODUCT DELIVERY)
    // ==========================================
    address: {
      type: String,
      trim: true,
      default: null,
    },

    city: {
      type: String,
      trim: true,
      default: null,
    },

    state: {
      type: String,
      trim: true,
      default: null,
    },

    country: {
      type: String,
      trim: true,
      default: "India",
    },

    pincode: {
      type: String,
      trim: true,
      default: null,
    },

    // ==========================================
    // AUTH & SECURITY
    // ==========================================
    password: {
      type: String,
      select: false,
      default: null,
    },

    otp: {
      type: String,
      select: false,
      default: null,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },

    role: {
      type: String,
      enum: ["super_admin", "astrologer", "user"],
      default: "user",
    },

    status: {
      type: String,
      enum: ["pending", "active", "rejected", "blocked"],
      default: "active",
    },

    profileImage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
