const Chat = require("../models/chat.model");
const Message = require("../models/message.model");
const User = require("../models/user.model");
const AstrologerProfile = require("../models/astrologerProfile.model");
const Person = require("../models/person.model");

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/chat/start  →  User requests chat with an astrologer
//    personId optional → consultation for another person (spouse etc.)
// ─────────────────────────────────────────────────────────────────────────────
const startChat = async (req, res) => {
  try {
    const userId = req.user._id;
    const { astrologerId, personId } = req.body;

    if (!astrologerId) {
      return res.status(400).json({
        success: false,
        message: "astrologerId is required.",
      });
    }

    // Verify the astrologer exists
    const astrologer = await User.findById(astrologerId);
    if (!astrologer || astrologer.role !== "astrologer") {
      return res.status(404).json({
        success: false,
        message: "Astrologer not found.",
      });
    }

    // Prevent user from chatting with themselves
    if (userId.toString() === astrologerId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot start a chat with yourself.",
      });
    }

    // Validate personId if provided
    let person = null;
    if (personId) {
      person = await Person.findOne({ _id: personId, userId });
      if (!person) {
        return res.status(404).json({
          success: false,
          message: "Person not found or does not belong to you.",
        });
      }
    }

    // Check for existing active/pending chat for same user+astrologer+person combo
    const existingQuery = {
      userId,
      astrologerId,
      personId: personId || null,
      status: { $in: ["active", "pending"] },
    };
    let chat = await Chat.findOne(existingQuery);

    if (!chat) {
      // Create new chat in PENDING state → astrologer must accept
      chat = await Chat.create({
        userId,
        astrologerId,
        personId: personId || null,
        participants: [userId, astrologerId],
        status: "pending",
        astrologerResponse: "pending",
      });

      // System message
      const forWhom = person
        ? `for ${person.fullName} (${person.relation})`
        : "for self";
      await Message.create({
        chatId: chat._id,
        senderId: userId,
        senderRole: req.user.role,
        content: `Chat request sent ${forWhom}. Waiting for astrologer to accept.`,
        messageType: "system",
      });
    }

    // Populate for response
    await chat.populate([
      { path: "userId", select: "fullName mobile profileImage role" },
      { path: "astrologerId", select: "fullName mobile profileImage role" },
      { path: "personId", select: "fullName relation gender dob tob pob" },
    ]);

    return res.status(200).json({
      success: true,
      message: chat.astrologerResponse === "pending"
        ? "Chat request sent. Waiting for astrologer to accept."
        : "Chat session ready.",
      data: chat,
    });
  } catch (error) {
    console.error("startChat error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start chat.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/chat/my-chats  →  All chats for current user or astrologer
// ─────────────────────────────────────────────────────────────────────────────
const getMyChats = async (req, res) => {
  try {
    const userId = req.user._id;
    const role = req.user.role;

    let query = {};
    if (role === "astrologer") {
      query = { astrologerId: userId };
    } else {
      query = { userId };
    }

    const chats = await Chat.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .populate("userId", "fullName mobile profileImage")
      .populate("astrologerId", "fullName mobile profileImage");

    return res.status(200).json({
      success: true,
      count: chats.length,
      data: chats,
    });
  } catch (error) {
    console.error("getMyChats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chats.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/chat/admin/all  →  Admin views ALL conversations
// ─────────────────────────────────────────────────────────────────────────────
const getAllChats = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (status) filter.status = status;

    const [chats, total] = await Promise.all([
      Chat.find(filter)
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate("userId", "fullName mobile profileImage role")
        .populate("astrologerId", "fullName mobile profileImage role"),
      Chat.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: chats,
    });
  } catch (error) {
    console.error("getAllChats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch all chats.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/chat/:chatId  →  Get single chat details
// ─────────────────────────────────────────────────────────────────────────────
const getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const role = req.user.role;

    const chat = await Chat.findById(chatId)
      .populate("userId", "fullName mobile profileImage role")
      .populate("astrologerId", "fullName mobile profileImage role");

    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    // Authorization: only participants or admin can view
    const isParticipant =
      chat.userId._id.toString() === userId.toString() ||
      chat.astrologerId._id.toString() === userId.toString();

    if (!isParticipant && role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. You are not part of this chat.",
      });
    }

    return res.status(200).json({ success: true, data: chat });
  } catch (error) {
    console.error("getChatById error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch chat.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/chat/:chatId/messages  →  Paginated message history
// ─────────────────────────────────────────────────────────────────────────────
const getChatHistory = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user._id;
    const role = req.user.role;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    // Authorization
    const isParticipant =
      chat.userId.toString() === userId.toString() ||
      chat.astrologerId.toString() === userId.toString();

    if (!isParticipant && role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied.",
      });
    }

    const [messages, total] = await Promise.all([
      Message.find({ chatId, isDeleted: false })
        .sort({ createdAt: -1 }) // newest first, frontend reverses
        .skip(skip)
        .limit(parseInt(limit))
        .populate("senderId", "fullName profileImage role"),
      Message.countDocuments({ chatId, isDeleted: false }),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: messages.reverse(), // oldest first for display
    });
  } catch (error) {
    console.error("getChatHistory error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch messages.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /api/chat/:chatId/message  →  Send message (REST fallback)
// ─────────────────────────────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content, messageType = "text" } = req.body;
    const senderId = req.user._id;
    const senderRole = req.user.role;

    if (!content && messageType === "text") {
      return res.status(400).json({ success: false, message: "Message content is required." });
    }

    // Admin cannot send messages
    if (senderRole === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Admin can only view chats, not send messages.",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    if (chat.status === "closed") {
      return res.status(400).json({ success: false, message: "This chat session is closed." });
    }

    // Verify sender is a participant
    const isParticipant =
      chat.userId.toString() === senderId.toString() ||
      chat.astrologerId.toString() === senderId.toString();

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Create message
    const message = await Message.create({
      chatId,
      senderId,
      senderRole,
      content,
      messageType,
    });

    // Update chat's last message preview & unread counters
    const isUserSending = chat.userId.toString() === senderId.toString();
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: messageType === "text" ? content : "📷 Image",
      lastMessageAt: new Date(),
      $inc: isUserSending
        ? { unreadCountAstrologer: 1 }
        : { unreadCountUser: 1 },
    });

    await message.populate("senderId", "fullName profileImage role");

    return res.status(201).json({
      success: true,
      message: "Message sent.",
      data: message,
    });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. PATCH /api/chat/:chatId/read  →  Mark messages as read
// ─────────────────────────────────────────────────────────────────────────────
const markAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const role = req.user.role;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    const isUser = chat.userId.toString() === userId.toString();
    const isAstrologer = chat.astrologerId.toString() === userId.toString();

    if (!isUser && !isAstrologer) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Mark all messages sent by the OTHER party as read
    const otherPartyId = isUser ? chat.astrologerId : chat.userId;

    await Message.updateMany(
      { chatId, senderId: otherPartyId, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Reset unread counter for current reader
    const updateField = isUser ? { unreadCountUser: 0 } : { unreadCountAstrologer: 0 };
    await Chat.findByIdAndUpdate(chatId, updateField);

    return res.status(200).json({
      success: true,
      message: "Messages marked as read.",
    });
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to mark messages as read.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. PATCH /api/chat/:chatId/close  →  Close a chat session
// ─────────────────────────────────────────────────────────────────────────────
const closeChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;
    const role = req.user.role;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    const isParticipant =
      chat.userId.toString() === userId.toString() ||
      chat.astrologerId.toString() === userId.toString();

    if (!isParticipant && role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    if (chat.status === "closed") {
      return res.status(400).json({ success: false, message: "Chat is already closed." });
    }

    const closeRole =
      role === "super_admin"
        ? "admin"
        : chat.userId.toString() === userId.toString()
        ? "user"
        : "astrologer";

    await Chat.findByIdAndUpdate(chatId, {
      status: "closed",
      closedBy: closeRole,
      closedAt: new Date(),
    });

    // System message to mark close
    await Message.create({
      chatId,
      senderId: userId,
      senderRole: role,
      content: `Chat session closed by ${closeRole}.`,
      messageType: "system",
    });

    return res.status(200).json({
      success: true,
      message: "Chat session closed successfully.",
    });
  } catch (error) {
    console.error("closeChat error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to close chat.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. POST /api/chat/:chatId/image  →  Upload image in chat
// ─────────────────────────────────────────────────────────────────────────────
const uploadChatImage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const senderId = req.user._id;
    const senderRole = req.user.role;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded." });
    }

    if (senderRole === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Admin cannot send images.",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    if (chat.status === "closed") {
      return res.status(400).json({ success: false, message: "This chat session is closed." });
    }

    const isParticipant =
      chat.userId.toString() === senderId.toString() ||
      chat.astrologerId.toString() === senderId.toString();

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const imageUrl = `/uploads/chats/${req.file.filename}`;

    const message = await Message.create({
      chatId,
      senderId,
      senderRole,
      content: "📷 Image",
      messageType: "image",
      imageUrl,
    });

    // Update chat last message
    const isUserSending = chat.userId.toString() === senderId.toString();
    await Chat.findByIdAndUpdate(chatId, {
      lastMessage: "📷 Image",
      lastMessageAt: new Date(),
      $inc: isUserSending
        ? { unreadCountAstrologer: 1 }
        : { unreadCountUser: 1 },
    });

    await message.populate("senderId", "fullName profileImage role");

    return res.status(201).json({
      success: true,
      message: "Image sent in chat.",
      data: message,
    });
  } catch (error) {
    console.error("uploadChatImage error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload chat image.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. PATCH /api/chat/:chatId/accept  →  Astrologer accepts chat request
// ─────────────────────────────────────────────────────────────────────────────
const acceptChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const astrologerId = req.user._id;
    const role = req.user.role;

    if (role !== "astrologer") {
      return res.status(403).json({
        success: false,
        message: "Only astrologers can accept chat requests.",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    if (chat.astrologerId.toString() !== astrologerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "This chat request is not for you.",
      });
    }

    if (chat.astrologerResponse !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Chat is already ${chat.astrologerResponse}.`,
      });
    }

    // Accept: status → active
    chat.astrologerResponse = "accepted";
    chat.status = "active";
    chat.respondedAt = new Date();
    await chat.save();

    // System message
    await Message.create({
      chatId,
      senderId: astrologerId,
      senderRole: "astrologer",
      content: "Astrologer has accepted your chat request. You can now send messages.",
      messageType: "system",
    });

    await chat.populate([
      { path: "userId", select: "fullName mobile profileImage" },
      { path: "astrologerId", select: "fullName mobile profileImage" },
      { path: "personId", select: "fullName relation gender dob tob pob" },
    ]);

    return res.status(200).json({
      success: true,
      message: "Chat request accepted. Session is now active.",
      data: chat,
    });
  } catch (error) {
    console.error("acceptChat error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to accept chat.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. PATCH /api/chat/:chatId/reject  →  Astrologer rejects chat request
// ─────────────────────────────────────────────────────────────────────────────
const rejectChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const astrologerId = req.user._id;
    const role = req.user.role;
    const { reason } = req.body;

    if (role !== "astrologer") {
      return res.status(403).json({
        success: false,
        message: "Only astrologers can reject chat requests.",
      });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: "Chat not found." });
    }

    if (chat.astrologerId.toString() !== astrologerId.toString()) {
      return res.status(403).json({
        success: false,
        message: "This chat request is not for you.",
      });
    }

    if (chat.astrologerResponse !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Chat is already ${chat.astrologerResponse}.`,
      });
    }

    // Reject: status → rejected
    chat.astrologerResponse = "rejected";
    chat.status = "rejected";
    chat.rejectionReason = reason || "Astrologer is currently unavailable.";
    chat.respondedAt = new Date();
    await chat.save();

    // System message
    await Message.create({
      chatId,
      senderId: astrologerId,
      senderRole: "astrologer",
      content: `Chat request declined. Reason: ${chat.rejectionReason}`,
      messageType: "system",
    });

    return res.status(200).json({
      success: true,
      message: "Chat request rejected.",
      data: {
        chatId,
        status: chat.status,
        reason: chat.rejectionReason,
      },
    });
  } catch (error) {
    console.error("rejectChat error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject chat.",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 12. GET /api/chat/pending-requests  →  Astrologer sees pending chat requests
// ─────────────────────────────────────────────────────────────────────────────
const getPendingRequests = async (req, res) => {
  try {
    const astrologerId = req.user._id;
    const role = req.user.role;

    if (role !== "astrologer" && role !== "super_admin") {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const query = role === "astrologer"
      ? { astrologerId, astrologerResponse: "pending" }
      : { astrologerResponse: "pending" };

    const requests = await Chat.find(query)
      .sort({ createdAt: -1 })
      .populate("userId", "fullName mobile profileImage")
      .populate("astrologerId", "fullName mobile profileImage")
      .populate("personId", "fullName relation gender dob tob pob");

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("getPendingRequests error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch pending requests.",
      error: error.message,
    });
  }
};

module.exports = {
  startChat,
  getMyChats,
  getAllChats,
  getChatById,
  getChatHistory,
  sendMessage,
  markAsRead,
  closeChat,
  uploadChatImage,
  acceptChat,
  rejectChat,
  getPendingRequests,
};
