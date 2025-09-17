// socket/socketInstance.js
let io;

exports.init = (server) => {
  io = require("socket.io")(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });
  return io;
};

exports.getIO = () => {
  if (!io) throw new Error("Socket.IO not initialized!");
  return io;
};
