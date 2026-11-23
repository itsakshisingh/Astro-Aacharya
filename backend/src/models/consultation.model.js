const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      default: "User",
    },
    astrologerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    astrologerName: {
      type: String,
      default: "Astrologer",
    },
    type: {
      type: String,
      enum: ["chat", "audio_call", "video_call"],
      default: "chat",
    },
    status: {
      type: String,
      enum: ["requested", "active", "completed", "rejected", "cancelled"],
      default: "requested",
    },
    startTime: {
      type: Date,
      default: null,
    },
    endTime: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    // User birth details (optional, for astrology consultation)
    birthDetails: {
      dob: { type: String, default: null },
      tob: { type: String, default: null },
      pob: { type: String, default: null },
      gender: { type: String, default: null },
    },
    messages: [
      {
        sender: {
          type: String,
          enum: ["user", "astrologer"],
          required: true,
        },
        message: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Consultation", consultationSchema);
