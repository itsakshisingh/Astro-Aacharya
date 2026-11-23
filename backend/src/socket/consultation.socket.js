const AstrologerProfile = require("../models/astrologerProfile.model");
const Consultation = require("../models/consultation.model");
const User = require("../models/user.model");

// In-Memory Presence & Mapping
const astrologerSockets = new Map(); // astrologerUserId -> socketId
const userSockets = new Map(); // userId -> socketId
const socketMeta = new Map(); // socketId -> { userId, role, activeConsultationId }

const initConsultationSocket = (io) => {
  // Helper to update astrologer availability status in DB & broadcast
  const setAstrologerStatus = async (astrologerId, status) => {
    try {
      const isOnline = status !== "offline";
      await AstrologerProfile.findOneAndUpdate(
        { userId: astrologerId },
        {
          "availability.status": status, // "online" | "busy" | "offline"
          "availability.isOnline": isOnline,
        }
      );

      // Broadcast to ALL connected clients in real-time
      io.emit("astrologer_status_changed", {
        astrologerId: astrologerId.toString(),
        status, // "online" (Available) | "busy" (On Another Call) | "offline"
        label:
          status === "online"
            ? "Available"
            : status === "busy"
            ? "On Another Call"
            : "Offline",
        timestamp: new Date(),
      });

      console.log(`[Status Update] Astrologer ${astrologerId} is now ${status}`);
    } catch (err) {
      console.error("Error setting astrologer status:", err.message);
    }
  };

  io.on("connection", (socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // 1. User or Astrologer registers their socket upon connecting
    socket.on("register", async ({ userId, role }) => {
      if (!userId) return;

      socketMeta.set(socket.id, { userId, role, activeConsultationId: null });

      if (role === "astrologer") {
        astrologerSockets.set(userId.toString(), socket.id);
        // By default when astrologer connects/logs in, mark them as 'online' (Available)
        await setAstrologerStatus(userId, "online");
      } else {
        userSockets.set(userId.toString(), socket.id);
      }

      console.log(`[Register] User: ${userId} (${role}) mapped to socket ${socket.id}`);
    });

    // 2. Astrologer Manually Toggles Status (Online / Offline)
    socket.on("set_availability", async ({ astrologerId, status }) => {
      if (astrologerId && (status === "online" || status === "offline")) {
        await setAstrologerStatus(astrologerId, status);
      }
    });

    // 3. User requests a Free Consultation (Chat or Audio/Video Call)
    socket.on("request_consultation", async (data) => {
      try {
        const {
          userId,
          astrologerId,
          type = "chat",
          userName,
          birthDetails,
        } = data;

        if (!userId || !astrologerId) {
          return socket.emit("consultation_error", {
            message: "User ID and Astrologer ID are required.",
          });
        }

        // Check if astrologer is online and available
        const profile = await AstrologerProfile.findOne({
          userId: astrologerId,
        });

        if (!profile || profile.availability?.status === "offline") {
          return socket.emit("consultation_error", {
            message: "Pandit is currently offline. Please try again later.",
          });
        }

        if (profile.availability?.status === "busy") {
          return socket.emit("consultation_error", {
            message: "Pandit is currently on another call. Please wait.",
          });
        }

        // Create new Consultation in DB (100% Free Testing)
        const consultation = await Consultation.create({
          userId,
          userName: userName || "Client",
          astrologerId,
          astrologerName: profile.displayName || "Astrologer",
          type,
          status: "requested",
          birthDetails: birthDetails || {},
        });

        const astrologerSocketId = astrologerSockets.get(astrologerId.toString());

        if (!astrologerSocketId) {
          await setAstrologerStatus(astrologerId, "offline");
          return socket.emit("consultation_error", {
            message: "Pandit is currently unreachable.",
          });
        }

        // Ring the Astrologer's device
        io.to(astrologerSocketId).emit("incoming_consultation_request", {
          consultationId: consultation._id,
          userId,
          userName: consultation.userName,
          type: consultation.type,
          birthDetails: consultation.birthDetails,
        });

        // Let the user know the call/chat is ringing
        socket.emit("consultation_ringing", {
          consultationId: consultation._id,
          astrologerId,
          astrologerName: consultation.astrologerName,
          type,
          message: "Connecting to Pandit ji...",
        });

        console.log(`[Consultation Request] ${userId} requested ${type} with ${astrologerId}`);
      } catch (error) {
        console.error("Request Consultation Error:", error);
        socket.emit("consultation_error", { message: error.message });
      }
    });

    // 4. Astrologer Accepts Consultation
    socket.on("accept_consultation", async ({ consultationId }) => {
      try {
        const consultation = await Consultation.findById(consultationId);
        if (!consultation) {
          return socket.emit("consultation_error", {
            message: "Consultation not found.",
          });
        }

        consultation.status = "active";
        consultation.startTime = new Date();
        await consultation.save();

        const room = `consultation_${consultationId}`;
        socket.join(room);

        // Put user in the same room
        const userSocketId = userSockets.get(consultation.userId.toString());
        if (userSocketId) {
          const userSocket = io.sockets.sockets.get(userSocketId);
          if (userSocket) userSocket.join(room);
        }

        // Link active consultation to sockets for clean disconnect handling
        socketMeta.set(socket.id, {
          ...(socketMeta.get(socket.id) || {}),
          activeConsultationId: consultationId.toString(),
        });
        if (userSocketId) {
          socketMeta.set(userSocketId, {
            ...(socketMeta.get(userSocketId) || {}),
            activeConsultationId: consultationId.toString(),
          });
        }

        // 🌟 CHANGE STATUS TO BUSY ("On Another Call")
        await setAstrologerStatus(consultation.astrologerId, "busy");

        // Notify both parties that consultation has started
        io.to(room).emit("consultation_started", {
          consultationId: consultation._id,
          type: consultation.type,
          startTime: consultation.startTime,
          message: "Consultation started! You are now connected.",
        });

        console.log(`[Consultation Active] Room ${room} created between ${consultation.userId} and ${consultation.astrologerId}`);
      } catch (error) {
        console.error("Accept Consultation Error:", error);
        socket.emit("consultation_error", { message: error.message });
      }
    });

    // 5. Astrologer Rejects Consultation
    socket.on("reject_consultation", async ({ consultationId, reason }) => {
      try {
        const consultation = await Consultation.findById(consultationId);
        if (consultation) {
          consultation.status = "rejected";
          await consultation.save();

          const userSocketId = userSockets.get(consultation.userId.toString());
          if (userSocketId) {
            io.to(userSocketId).emit("consultation_rejected", {
              consultationId,
              message: reason || "Pandit ji is unable to take the call right now.",
            });
          }
        }
      } catch (error) {
        console.error("Reject Consultation Error:", error);
      }
    });

    // 6. Live Chat Messaging
    socket.on("send_message", async ({ consultationId, sender, message }) => {
      try {
        if (!consultationId || !message) return;

        const room = `consultation_${consultationId}`;
        const newMsg = {
          sender: sender || "user",
          message,
          timestamp: new Date(),
        };

        // Persist message to DB
        await Consultation.findByIdAndUpdate(consultationId, {
          $push: { messages: newMsg },
        });

        // Broadcast message to everyone in the consultation room
        io.to(room).emit("receive_message", {
          consultationId,
          ...newMsg,
        });
      } catch (error) {
        console.error("Send Message Error:", error);
      }
    });

    // 7. Audio / Video Call Signaling (WebRTC Relay)
    socket.on("call_signal", ({ consultationId, signalData, target }) => {
      const room = `consultation_${consultationId}`;
      socket.to(room).emit("call_signal", { signalData, target });
    });

    // 8. End Consultation (By User OR by Astrologer)
    socket.on("end_consultation", async ({ consultationId }) => {
      await endConsultationSession(consultationId, "Consultation ended by participant");
    });

    // Helper: Finalize and complete consultation & restore Available status
    const endConsultationSession = async (consultationId, endReason) => {
      try {
        const consultation = await Consultation.findById(consultationId);
        if (!consultation || consultation.status === "completed") return;

        const endTime = new Date();
        const durationSeconds = consultation.startTime
          ? Math.round((endTime - new Date(consultation.startTime)) / 1000)
          : 0;

        consultation.status = "completed";
        consultation.endTime = endTime;
        consultation.durationSeconds = durationSeconds;
        await consultation.save();

        const room = `consultation_${consultationId}`;

        // Notify both parties
        io.to(room).emit("consultation_ended", {
          consultationId,
          durationSeconds,
          message: endReason || "Consultation ended successfully",
        });

        // 🌟 RESTORE STATUS TO AVAILABLE ("online")
        if (astrologerSockets.has(consultation.astrologerId.toString())) {
          await setAstrologerStatus(consultation.astrologerId, "online");
        } else {
          await setAstrologerStatus(consultation.astrologerId, "offline");
        }

        console.log(`[Consultation Ended] ${consultationId} - Duration: ${durationSeconds}s. Astrologer is now Available again.`);
      } catch (error) {
        console.error("End Consultation Error:", error);
      }
    };

    // 9. Handle Disconnect (App Closed / Network Lost)
    socket.on("disconnect", async () => {
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
      const meta = socketMeta.get(socket.id);

      if (meta) {
        const { userId, role, activeConsultationId } = meta;

        // If in an ongoing consultation, end it gracefully
        if (activeConsultationId) {
          await endConsultationSession(
            activeConsultationId,
            `${role === "astrologer" ? "Pandit" : "User"} disconnected`
          );
        }

        if (role === "astrologer") {
          astrologerSockets.delete(userId.toString());
          await setAstrologerStatus(userId, "offline");
        } else {
          userSockets.delete(userId.toString());
        }

        socketMeta.delete(socket.id);
      }
    });
  });

  return {
    getLiveAstrologers: () => Array.from(astrologerSockets.keys()),
  };
};

module.exports = { initConsultationSocket };
