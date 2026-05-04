import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  
  // Initialize Socket.io
  const io = new Server(httpServer);

  let waitingPlayer = null;

  io.on("connection", (socket) => {
    console.log("Player connected:", socket.id);

    // 1. Matchmaking
    socket.on("join_matchmaking", (data) => {
      const playerName = data.name || "Player";
      
      if (waitingPlayer && waitingPlayer.id !== socket.id) {
        // Match found! Create a room.
        const room = `room_${waitingPlayer.id}_${socket.id}`;
        socket.join(room);
        waitingPlayer.socket.join(room);
        
        const players = {
          p1: { id: waitingPlayer.id, name: waitingPlayer.name },
          p2: { id: socket.id, name: playerName }
        };
        
        io.to(room).emit("match_found", { room, players });
        waitingPlayer = null; // Reset for next players
      } else {
        // Wait for an opponent
        waitingPlayer = { id: socket.id, socket, name: playerName };
      }
    });

    // 2. Disconnect
    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);
      if (waitingPlayer && waitingPlayer.id === socket.id) {
        waitingPlayer = null;
      }
      // Inform opponent if they were in a match
      socket.broadcast.emit("opponent_disconnected");
    });
    
    // 3. In-Game Sync Events
    // Sync newly generated questions (P1 acts as host and generates it)
    socket.on("sync_question", ({ room, question, answer }) => {
       socket.to(room).emit("new_question", { question, answer });
    });

    // Sync answer submissions
    socket.on("submit_answer", ({ room, player, isCorrect, timer, combo }) => {
      io.to(room).emit("answer_submitted", { player, isCorrect, timer, combo });
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log(`> Custom Socket.io Server Running!`);
    });
});
