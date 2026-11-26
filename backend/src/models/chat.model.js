const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema(
  {
    // User who initiated the chat
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Astrologer's User ID (not profile ID) for easy lookup
    astrologerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Both participants for quick query
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Chat session status
    status: {
      type: String,
      enum: ["active", "closed", "pending"],
      default: "active",
    },
    // Preview of last message
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    // Typing indicators
    isUserTyping: {
      type: Boolean,
      default: false,
    },
    isAstrologerTyping: {
      type: Boolean,
      default: false,
    },
    // Unread message counters
    unreadCountUser: {
      type: Number,
      default: 0,
    },
    unreadCountAstrologer: {
      type: Number,
      default: 0,
    },
    // Who closed the chat
    closedBy: {
      type: String,
      enum: ["user", "astrologer", "admin", null],
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookup
chatSchema.index({ userId: 1, astrologerId: 1 });
chatSchema.index({ participants: 1 });
chatSchema.index({ status: 1 });

module.exports = mongoose.model("Chat", chatSchema);
