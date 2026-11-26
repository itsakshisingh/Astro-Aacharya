const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const Chat = require("../models/chat.model");
const Message = require("../models/message.model");

// In-Memory: Track online users for chat presence
const chatOnlineUsers = new Map(); // userId -> Set of socketIds (can be in multiple tabs)

const initChatSocket = (io) => {
  // Create a dedicated namespace for chat to avoid conflicts with consultation socket
  const chatNamespace = io.of("/chat");

  // ── JWT Auth Middleware for Socket ─────────────────────────────────────────
  chatNamespace.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication token is required."));
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "default_secret"
      );

      const user = await User.findById(decoded.id).select(
        "fullName mobile profileImage role status"
      );

      if (!user) {
        return next(new Error("User not found."));
      }

      if (user.status === "blocked" || user.status === "rejected") {
        return next(new Error(`Account is ${user.status}.`));
      }

      // Attach user info to socket
      socket.user = user;
      socket.userId = user._id.toString();
      socket.userRole = user.role;

      next();
    } catch (err) {
      console.error("[Chat Socket Auth Error]:", err.message);
      next(new Error("Invalid or expired token. Please login again."));
    }
  });

  // ── Connection Handler ─────────────────────────────────────────────────────
  chatNamespace.on("connection", (socket) => {
    const userId = socket.userId;
    const userRole = socket.userRole;

    console.log(
      `[Chat Socket Connected] User: ${userId} (${userRole}) | Socket: ${socket.id}`
    );

    // Track online presence
    if (!chatOnlineUsers.has(userId)) {
      chatOnlineUsers.set(userId, new Set());
    }
    chatOnlineUsers.get(userId).add(socket.id);

    // Broadcast online status to all connected clients
    chatNamespace.emit("user_online", { userId, isOnline: true });

    // ── 1. Join a specific chat room ───────────────────────────────────────
    socket.on("join_chat", async ({ chatId }) => {
      try {
        if (!chatId) {
          return socket.emit("chat_error", { message: "chatId is required." });
        }

        // Verify chat exists and user is a participant
        const chat = await Chat.findById(chatId);
        if (!chat) {
          return socket.emit("chat_error", { message: "Chat not found." });
        }

        const isParticipant =
          chat.userId.toString() === userId ||
          chat.astrologerId.toString() === userId;

        // Admin can also join to monitor
        if (!isParticipant && userRole !== "super_admin") {
          return socket.emit("chat_error", {
            message: "Access denied. You are not part of this chat.",
          });
        }

        const room = `chat_${chatId}`;
        socket.join(room);

        console.log(
          `[Chat Socket] User ${userId} joined room ${room}`
        );

        socket.emit("joined_chat", {
          chatId,
          message: `Joined chat room successfully.`,
        });
      } catch (err) {
        console.error("[join_chat error]:", err);
        socket.emit("chat_error", { message: err.message });
      }
    });

    // ── 2. Send Message ────────────────────────────────────────────────────
    socket.on("send_message", async ({ chatId, content, messageType = "text" }) => {
      try {
        // Admin cannot send messages
        if (userRole === "super_admin") {
          return socket.emit("chat_error", {
            message: "Admin can only monitor chats, not send messages.",
          });
        }

        if (!chatId || !content) {
          return socket.emit("chat_error", {
            message: "chatId and content are required.",
          });
        }

        const chat = await Chat.findById(chatId);
        if (!chat) {
          return socket.emit("chat_error", { message: "Chat not found." });
        }

        if (chat.status === "closed") {
          return socket.emit("chat_error", {
            message: "This chat session is closed.",
          });
        }

        const isParticipant =
          chat.userId.toString() === userId ||
          chat.astrologerId.toString() === userId;

        if (!isParticipant) {
          return socket.emit("chat_error", { message: "Access denied." });
        }

        // Save message to DB
        const message = await Message.create({
          chatId,
          senderId: userId,
          senderRole: userRole,
          content,
          messageType,
        });

        // Update chat metadata
        const isUserSending = chat.userId.toString() === userId;
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: messageType === "text" ? content : "📷 Image",
          lastMessageAt: new Date(),
          $inc: isUserSending
            ? { unreadCountAstrologer: 1 }
            : { unreadCountUser: 1 },
        });

        // Populate sender info
        await message.populate("senderId", "fullName profileImage role");

        const room = `chat_${chatId}`;

        // Broadcast to all in room
        chatNamespace.to(room).emit("new_message", {
          chatId,
          message: {
            _id: message._id,
            chatId: message.chatId,
            senderId: message.senderId,
            senderRole: message.senderRole,
            content: message.content,
            messageType: message.messageType,
            imageUrl: message.imageUrl,
            isRead: message.isRead,
            createdAt: message.createdAt,
          },
        });

        console.log(
          `[Chat Socket] Message sent in room ${room} by ${userId}`
        );
      } catch (err) {
        console.error("[send_message error]:", err);
        socket.emit("chat_error", { message: err.message });
      }
    });

    // ── 3. Typing Indicator: Start ─────────────────────────────────────────
    socket.on("typing_start", ({ chatId }) => {
      if (!chatId) return;

      const room = `chat_${chatId}`;
      const eventName =
        userRole === "astrologer" ? "astrologer_typing" : "user_typing";

      // Broadcast to others in room (not to self)
      socket.to(room).emit(eventName, {
        chatId,
        userId,
        isTyping: true,
      });
    });

    // ── 4. Typing Indicator: Stop ──────────────────────────────────────────
    socket.on("typing_stop", ({ chatId }) => {
      if (!chatId) return;

      const room = `chat_${chatId}`;
      const eventName =
        userRole === "astrologer" ? "astrologer_typing" : "user_typing";

      socket.to(room).emit(eventName, {
        chatId,
        userId,
        isTyping: false,
      });
    });

    // ── 5. Mark Messages as Read ───────────────────────────────────────────
    socket.on("mark_read", async ({ chatId }) => {
      try {
        if (!chatId) return;

        const chat = await Chat.findById(chatId);
        if (!chat) return;

        const isUser = chat.userId.toString() === userId;
        const isAstrologer = chat.astrologerId.toString() === userId;

        if (!isUser && !isAstrologer) return;

        // Mark messages from OTHER party as read
        const otherPartyId = isUser ? chat.astrologerId : chat.userId;

        await Message.updateMany(
          { chatId, senderId: otherPartyId, isRead: false },
          { isRead: true, readAt: new Date() }
        );

        // Reset unread counter
        const updateField = isUser
          ? { unreadCountUser: 0 }
          : { unreadCountAstrologer: 0 };
        await Chat.findByIdAndUpdate(chatId, updateField);

        // Notify the sender that their messages were read
        const room = `chat_${chatId}`;
        chatNamespace.to(room).emit("messages_read", {
          chatId,
          readBy: userId,
          readAt: new Date(),
        });
      } catch (err) {
        console.error("[mark_read error]:", err);
      }
    });

    // ── 6. Leave Room ──────────────────────────────────────────────────────
    socket.on("leave_chat", ({ chatId }) => {
      if (!chatId) return;
      const room = `chat_${chatId}`;
      socket.leave(room);
      console.log(`[Chat Socket] User ${userId} left room ${room}`);
    });

    // ── 7. Disconnect ──────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(
        `[Chat Socket Disconnected] User: ${userId} | Socket: ${socket.id}`
      );

      // Remove this socket from online tracking
      if (chatOnlineUsers.has(userId)) {
        chatOnlineUsers.get(userId).delete(socket.id);

        // If no more sockets for this user → they are offline
        if (chatOnlineUsers.get(userId).size === 0) {
          chatOnlineUsers.delete(userId);
          chatNamespace.emit("user_online", { userId, isOnline: false });
        }
      }
    });

    // ── 8. Check if user is online ─────────────────────────────────────────
    socket.on("check_online", ({ targetUserId }) => {
      const isOnline = chatOnlineUsers.has(targetUserId);
      socket.emit("online_status", {
        userId: targetUserId,
        isOnline,
      });
    });
  });

  console.log("[Chat Socket] Chat namespace /chat initialized.");

  return {
    getOnlineUsers: () => Array.from(chatOnlineUsers.keys()),
    isUserOnline: (userId) => chatOnlineUsers.has(userId),
  };
};

module.exports = { initChatSocket };
