const mongoose = require("mongoose");

// ─────────────────────────────────────────────────────────────────────────────
// Person Model — User adds family members / other people for consultation
// (e.g. Spouse, Mother, Father, Child, Friend)
// ─────────────────────────────────────────────────────────────────────────────
const personSchema = new mongoose.Schema(
  {
    // Owner: the User who added this person
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    // Relation with the user
    relation: {
      type: String,
      enum: ["self", "spouse", "mother", "father", "son", "daughter", "brother", "sister", "friend", "other"],
      default: "other",
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },

    // Birth Details for Horoscope
    dob: {
      type: String, // "1996-05-20"
      default: null,
    },

    tob: {
      type: String, // "14:15" (24hr) or "2:15 PM"
      default: null,
    },

    pob: {
      type: String, // "City, State, Country"
      default: null,
    },

    // Notes about this person
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

personSchema.index({ userId: 1 });

module.exports = mongoose.model("Person", personSchema);
