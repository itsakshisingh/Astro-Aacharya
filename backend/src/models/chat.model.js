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
    // ─── Person this consultation is FOR ──────────────────────────────────────
    // null = for the user themselves | ObjectId = for another added person
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      default: null,
    },

    // Chat session status
    // pending = user requested, waiting for astrologer accept/reject
    // active  = astrologer accepted, chat is live
    // rejected= astrologer rejected this request
    // closed  = session ended
    status: {
      type: String,
      enum: ["pending", "active", "rejected", "closed"],
      default: "pending",
    },

    // Astrologer's response to the chat request
    astrologerResponse: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    // Reason if astrologer rejects
    rejectionReason: {
      type: String,
      default: null,
    },

    // When astrologer responded
    respondedAt: {
      type: Date,
      default: null,
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
