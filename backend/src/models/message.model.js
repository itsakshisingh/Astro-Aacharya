const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    // Reference to the Chat session
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    // Who sent this message
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    senderRole: {
      type: String,
      enum: ["user", "astrologer", "super_admin"],
      required: true,
    },
    // Message content
    content: {
      type: String,
      default: "",
    },
    // Type of message
    messageType: {
      type: String,
      enum: ["text", "image", "system"],
      default: "text",
    },
    // For image messages
    imageUrl: {
      type: String,
      default: null,
    },
    // Read receipt
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt = message sent time
  }
);

// Indexes for performance
messageSchema.index({ chatId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ isRead: 1 });

module.exports = mongoose.model("Message", messageSchema);
