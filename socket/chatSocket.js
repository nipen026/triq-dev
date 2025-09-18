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

    socket.on("joinRoom", async (payload) => {
      let roomId;
      if (typeof payload === 'object' && payload.roomId) {
        roomId = payload.roomId;
      } else {
        roomId = payload;
      }

      const room = await ChatRoom.findById(roomId);
      if (!room) return;  // <-- nothing happens if no room found

      if (
        room.organisation.toString() !== socket.userId &&
        room.processor.toString() !== socket.userId
      ) return;           // <-- nothing happens if userId not in room

      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);
    });


    socket.on("sendMessage", async (payload) => {
      console.log(payload);
      // const { roomId, content,attachments } = payload;
      // if (!socket.userId || !roomId) return;

      // const room = await ChatRoom.findById(roomId);
      // console.log(room);

      // if (!room) return;

      // const message = await Message.create({
      //   room: roomId,
      //   sender: socket.userId,
      //   content,
      //   attachments,
      // });
      // console.log('newMessage to room', roomId, message);
      // io.to(roomId).emit("newMessage", message);
      const { roomId, content, name, type, data } = payload;
      if (!socket.userId || !roomId) return;

      const room = await ChatRoom.findById(roomId);
      if (!room) return;

      // 1️⃣ save buffer to disk (or S3)
      const buffer = Buffer.from(new Uint8Array(data));
      const uploadDir = path.join(__dirname, "../uploads/chat");
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

      const fileName = Date.now() + "-" + name;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, buffer);

      // 2️⃣ create message with URL to saved file
      const attachmentUrl = "/uploads/chat/" + fileName; // you must serve this folder as static
      const message = await Message.create({
        room: roomId,
        sender: socket.userId,
        content,
        attachments: [{ url: attachmentUrl, type }]
      });

      // 3️⃣ broadcast
      io.to(roomId).emit("newMessage", message);
    });


    socket.on("disconnect", () => {
      console.log("Socket disconnected", socket.id);
    });
  });
};
