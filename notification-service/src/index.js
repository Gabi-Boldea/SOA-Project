const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

const { startTaskEventsConsumer } = require("./rabbitmq-consumer");


// 1) Authenticate WebSocket connections using JWT
io.use((socket, next) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.query?.token;

  if (!token) return next(new Error("Missing token"));

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    socket.join(`user:${decoded.userId}`); // user-specific room
    return next();
  } catch (err) {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  console.log("WebSocket connected for user:", socket.user.userId);

  socket.emit("notification", {
    type: "welcome",
    message: "Connected to notification service",
    at: new Date().toISOString(),
  });
});

// Start RabbitMQ consumer to listen for task events
startTaskEventsConsumer(io);

// 2) REST endpoint to send a notification to the current user
// This expects x-user-id (added by the gateway)
app.post("/notify/me", (req, res) => {
  const userId = req.headers["x-user-id"];
  const { message } = req.body;

  if (!userId) return res.status(401).json({ error: "Missing x-user-id" });
  if (!message) return res.status(400).json({ error: "Missing message" });

  io.to(`user:${userId}`).emit("notification", {
    type: "info",
    message,
    at: new Date().toISOString(),
  });

  return res.status(202).json({ status: "sent" });
});

app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3003;
server.listen(PORT, () => {
  console.log(`Notification service listening on port ${PORT}`);
});
