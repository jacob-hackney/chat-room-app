import app from "./app.js";

import { createServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import jwt from "jsonwebtoken";
import { configDotenv } from "dotenv";
configDotenv({ debug: false, path: "./.env" });

const server = createServer(app);

// #region Socket Server
const io = new SocketServer(server);

io.use((socket, next) => {
  const username = socket.handshake.auth.username;
  const accessToken = socket.handshake.auth.accessToken;

  try {
    jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    socket.data.username = username;
    socket.data.currentRoom = null;
    next();
  } catch (err) {
    next(new jwt.JsonWebTokenError(`401 Unauthorized: ${err}`));
  }
});

io.on("connect", (socket) => {
  console.log(`User ${socket.data.username} connected`);

  socket.on("joinRoom", (room) => {
    socket.join(room);
    socket.data.currentRoom = room;
    socket.to(room).emit("userJoined", { username: socket.data.username });
  });

  socket.on("leaveRoom", () => {
    socket.leave(room);
    socket
      .to(socket.data.currentRoom)
      .emit("userLeft", { username: socket.data.username });
    socket.data.currentRoom = null;
  });

  socket.on("textChatMessage", (message) => {
    socket
      .to(socket.data.currentRoom)
      .emit("textChatMessage", { username: socket.data.username, message });
  });

  socket.on("disconnect", () => {
    console.log(`User ${socket.data.username} disconnected`);
    socket
      .to(socket.data.currentRoom)
      .emit("userLeft", { username: socket.data.username });
  });
});
// #endregion

// Firebase URL: https://3000-firebase-chat-room-app-1761158009896.cluster-a6fboot2vrctkwj6dpuoyj5s7y.cloudworkstations.dev/
server.listen(
  process.env.SERVER_PORT,
  /* process.env.SERVER_HOST, */ () => {
    console.log(`Server listening on port ${process.env.SERVER_PORT}`);
  }
);
