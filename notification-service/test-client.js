const { io } = require("socket.io-client");

const token = process.env.TOKEN;
if (!token) {
  console.error("Missing TOKEN env var. Run: TOKEN='paste_jwt_here' node test-client.js");
  process.exit(1);
}

const socket = io("http://localhost:3000", {
  path: "/api/notifications/socket.io",
  auth: { token },
});

socket.on("connect", () => {
  console.log("Connected! socket id =", socket.id);
});

socket.on("notification", (data) => {
  console.log("NOTIFICATION:", data);
});

socket.on("connect_error", (err) => {
  console.error("Connect error:", err.message);
});
