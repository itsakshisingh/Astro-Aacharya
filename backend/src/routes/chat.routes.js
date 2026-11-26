const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth.middleware");
const {
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
} = require("../controllers/chat.controller");

const { uploadChatImage: uploadChatImageMiddleware } = require("../middleware/upload.middleware");

// ─── Authorization Helpers ───────────────────────────────────────────────────
const isAdmin = (req, res, next) => {
  if (req.user.role !== "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Admin access required.",
    });
  }
  next();
};

// ─── Chat Routes ─────────────────────────────────────────────────────────────

// POST   /api/chat/start          → User starts chat with astrologer
router.post("/start", authenticate, startChat);

// GET    /api/chat/my-chats                 → Get all conversations (user or astrologer)
router.get("/my-chats", authenticate, getMyChats);

// GET    /api/chat/pending-requests         → Astrologer sees pending chat requests
router.get("/pending-requests", authenticate, getPendingRequests);

// GET    /api/chat/admin/all                → Admin views all chats (read-only)
router.get("/admin/all", authenticate, isAdmin, getAllChats);

// GET    /api/chat/:chatId        → Get single chat details
router.get("/:chatId", authenticate, getChatById);

// GET    /api/chat/:chatId/messages → Paginated message history
router.get("/:chatId/messages", authenticate, getChatHistory);

// POST   /api/chat/:chatId/message  → Send text message (REST fallback)
router.post("/:chatId/message", authenticate, sendMessage);

// PATCH  /api/chat/:chatId/read     → Mark messages as read
router.patch("/:chatId/read", authenticate, markAsRead);

// PATCH  /api/chat/:chatId/accept   → Astrologer accepts chat request
router.patch("/:chatId/accept", authenticate, acceptChat);

// PATCH  /api/chat/:chatId/reject   → Astrologer rejects chat request
router.patch("/:chatId/reject", authenticate, rejectChat);

// PATCH  /api/chat/:chatId/close    → Close chat session
router.patch("/:chatId/close", authenticate, closeChat);

// POST   /api/chat/:chatId/image    → Upload image in chat
router.post(
  "/:chatId/image",
  authenticate,
  uploadChatImageMiddleware.single("image"),
  uploadChatImage
);

module.exports = router;
