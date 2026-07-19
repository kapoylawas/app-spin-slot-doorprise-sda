import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let currentState = {
  selectedPrizeId: "",
  prizeName: "",
  rolling: false,
  winner: false,
  winnerData: null,
  isTimerRunning: false,
  countdown: 5,
  isDisqualified: false,
  lastUpdated: Date.now(),
};

const getClientCounts = () => {
  let controllerCount = 0;
  let displayCount = 0;
  for (const [_, socket] of io.sockets.sockets) {
    if (socket.data?.role === "controller") controllerCount++;
    else if (socket.data?.role === "display") displayCount++;
  }
  return {
    total: io.sockets.sockets.size,
    controller: controllerCount,
    display: displayCount
  };
};

io.on("connection", (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Client identifies role (controller | display | single)
  socket.on("identify", (role) => {
    socket.data.role = role || "unknown";
    console.log(`[Socket] Client ${socket.id} registered as role: ${socket.data.role}`);
    io.emit("clients:status", getClientCounts());
    // Send latest cached state to newly connected client
    socket.emit("state:update", currentState);
  });

  // Relay action from controller (or display) to all other connected clients
  socket.on("remote:action", (actionData) => {
    console.log(`[Socket] Remote action received from ${socket.id}:`, actionData);
    
    // Update local cache if relevant
    if (actionData.type === "SELECT_PRIZE") {
      currentState.selectedPrizeId = actionData.prizeId;
      currentState.prizeName = actionData.prizeName;
    } else if (actionData.type === "SPIN_START") {
      currentState.rolling = true;
      currentState.winner = false;
      currentState.winnerData = null;
    } else if (actionData.type === "SPIN_WIN") {
      currentState.rolling = false;
      currentState.winner = true;
      currentState.winnerData = actionData.winnerData;
    } else if (actionData.type === "CLOSE_WINNER") {
      currentState.winner = false;
      currentState.winnerData = null;
      currentState.isTimerRunning = false;
    } else if (actionData.type === "UPDATE_TIMER") {
      currentState.isTimerRunning = actionData.isTimerRunning;
      if (actionData.countdown !== undefined) currentState.countdown = actionData.countdown;
    }

    currentState.lastUpdated = Date.now();

    // Broadcast to all other connected clients
    socket.broadcast.emit("remote:event", actionData);
  });

  // Full state sync from active client (e.g. when state changes or on request)
  socket.on("state:sync", (state) => {
    currentState = { ...currentState, ...state, lastUpdated: Date.now() };
    socket.broadcast.emit("state:update", currentState);
  });

  // Request sync from any active client
  socket.on("request:sync", () => {
    socket.broadcast.emit("request:sync");
  });

  socket.on("disconnect", () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
    io.emit("clients:status", getClientCounts());
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", clients: getClientCounts(), state: currentState });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`====================================================`);
  console.log(`🚀 Doorprise Socket.IO LAN Server is running!`);
  console.log(`📡 Local Port: http://localhost:${PORT}`);
  console.log(`🌐 Accessible on local network (LAN) on port ${PORT}`);
  console.log(`====================================================`);
});
