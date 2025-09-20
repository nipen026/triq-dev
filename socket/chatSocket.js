// socket/chatSocket.js
const ChatRoom = require("../models/chatRoom.model");
const Message = require("../models/message.model");
const fs = require("fs");
const path = require("path");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected", socket.id);

    socket.on("registerUser", ({ userId }) => {
      socket.userId = userId;
      console.log("Registered user:", userId);
    });

    // socket.on("joinRoom", async (payload) => {
    //   let roomId;
    //   if (typeof payload === 'object' && payload.roomId) {
    //     roomId = payload.roomId;
    //   } else {
    //     roomId = payload;
    //   }

    //   const room = await ChatRoom.findById(roomId);
    //   if (!room) return;  // <-- nothing happens if no room found

    //   if (
    //     room.organisation.toString() !== socket.userId &&
    //     room.processor.toString() !== socket.userId
    //   ) return;           // <-- nothing happens if userId not in room

    //   socket.join(roomId);
    //   console.log(`User ${socket.userId} joined room ${roomId}`);
    // });
    socket.on("joinRoom", async (payload) => {
      const roomId = typeof payload === "object" ? payload.roomId : payload;
      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      if (
        room.organisation.toString() !== socket.userId &&
        room.processor.toString() !== socket.userId
      ) return;

      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);

      // 👇 automatically mark unread as read for this user
      await Message.updateMany(
        { room: roomId, readBy: { $ne: socket.userId } },
        { $push: { readBy: socket.userId } }
      );

      // optionally send updated unread count to this socket
      const unreadCount = await Message.countDocuments({
        room: roomId,
        readBy: { $ne: socket.userId }
      });
      socket.emit("unreadCount", { roomId, unreadCount });
    });

    socket.on("sendMessage", async (payload) => {
      console.log(payload,socket.userId);
      const { roomId, content, attachments } = payload;
      if (!socket.userId || !roomId) return;
      console.log(socket.userId,"!socket.userId || !roomId",roomId);
      
      const room = await ChatRoom.findById(roomId);
      console.log(room);

      if (!room) return;

      const message = await Message.create({
        room: roomId,
        sender: socket.userId,
        content,
        attachments,
        readBy: [socket.userId]
      });
      console.log('newMessage to room', roomId, message);
      io.to(roomId).emit("newMessage", message);

    });


    socket.on("disconnect", () => {
      console.log("Socket disconnected", socket.id);
    });
  });
};
