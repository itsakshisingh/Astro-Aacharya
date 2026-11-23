const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");

dotenv.config();

const app = require("./src/app");
const connectDB = require("./src/config/db");
const { initConsultationSocket } = require("./src/socket/consultation.socket");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  },
});

// Setup Real-Time Consultation WebSocket handlers
initConsultationSocket(io);

const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`Astrology Server & WebSocket running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server Error:", error.message);
    process.exit(1);
  }
};

startServer();
