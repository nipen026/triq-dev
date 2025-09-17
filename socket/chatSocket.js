// socket/chatSocket.js
const ChatRoom = require("../models/chatRoom.model");
const Message = require("../models/message.model");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected", socket.id);

    socket.on("registerUser", ({ userId }) => {
      socket.userId = userId;
      console.log("Registered user:", userId);
    });

    socket.on("joinRoom", async (payload) => {
      console.log(payload);
      
      // payload could be either a string or an object
      let roomId;

      // handle if client sent { roomId: '...' }
      if (typeof payload === 'object' && payload.roomId) {
        roomId = payload.roomId;
      } else {
        // handle if client sent just 'roomId' as string
        roomId = payload;
      }

      if (!roomId) return;

      // now you can safely call Mongoose
      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      if (
        room.organisation.toString() !== socket.userId &&
        room.processor.toString() !== socket.userId
      ) return;

      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);
    });


    socket.on("sendMessage", async (payload) => {
      const { roomId, content, attachments } = payload;
      if (!socket.userId || !roomId) return;

      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      const message = await Message.create({
        room: roomId,
        sender: socket.userId,
        content,
        attachments,
      });

      io.to(roomId).emit("newMessage", message);
    });


    socket.on("disconnect", () => {
      console.log("Socket disconnected", socket.id);
    });
  });
};
