// socket/chatSocket.js
const ChatRoom = require("../models/chatRoom.model");
const Message = require("../models/message.model");
const admin = require('../config/firebase');
const fs = require("fs");
const path = require("path");
const User = require("../models/user.model");
const mongoose = require("mongoose");
module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log("Socket connected", socket.id);

    socket.on("registerUser", ({ userId }) => {
      socket.userId = userId;
      console.log("Registered user:", userId);
    });



    socket.on("joinRoom", async (payload) => {
      try {
        // 1️⃣ Get roomId out of payload
        const roomId = typeof payload === "object" ? payload.roomId : payload;

        // 2️⃣ Validate roomId
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          return socket.emit("error", { message: "Invalid or missing roomId" });
        }

        // 3️⃣ Find the room
        const room = await ChatRoom.findById(roomId);
        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        // 4️⃣ Check user belongs to room
        if (
          room.organisation.toString() !== socket.userId &&
          room.processor.toString() !== socket.userId
        ) {
          return socket.emit("error", { message: "Not authorised for this room" });
        }

        // 5️⃣ Join the room
        socket.join(roomId);
        console.log(`User ${socket.userId} joined room ${roomId}`);

        // 6️⃣ Mark all unread messages as read
        await Message.updateMany(
          { room: roomId, readBy: { $ne: socket.userId } },
          { $push: { readBy: socket.userId } }
        );

        // 7️⃣ Send the current unread count back to this socket
        const unreadCount = await Message.countDocuments({
          room: roomId,
          readBy: { $ne: socket.userId },
        });

        socket.emit("unreadCount", { roomId, unreadCount });
      } catch (err) {
        console.error("joinRoom error:", err);
        socket.emit("error", { message: "Server error" });
      }
    });


    socket.on("sendMessage", async (payload) => {
      console.log(payload, socket.userId);
      const { roomId, content, attachments } = payload;
      if (!socket.userId || !roomId) return;
      console.log(socket.userId, "!socket.userId || !roomId", roomId);

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
      // const chatWith =
      //   socket.userId === room.organisation.id ? room.processor : room.organisation;
      const UserData = await User.findById(chatWith);


      const notificationPayload = {
        notification: {
          title: `New message from ${socket.userId === room.organisation.id ? room.organisation.fullName : room.processor.fullName}`,
          body: content || 'Attachment'
        },
        data: {
          type: 'chat_message',
          chatWithName: UserData.fullName,
          chatRoomId: room.id,
          screenName: 'chat'
        }
      };

      // 🟢 send FCM to the *other* user
      if (UserData.fcmToken) {
        // await admin.messaging().sendToDevice(UserData.fcmToken, notificationPayload).then(response => {
        //   console.log('Notification sent:', response.successCount, 'success', response.failureCount, 'failures');
        //   if (response.failureCount > 0) {
        //     console.log('Errors:', response.results);
        //   }
        // })
        //   .catch(err => console.error('FCM error', err));

        await admin.messaging().sendEachForMulticast({
          tokens: [UserData.fcmToken],
          notification: notificationPayload.notification,
          data: notificationPayload.data,
        }).then(response => {
          console.log('Notification sent:', response.successCount, 'success', response.failureCount, 'failures');
          if (response.failureCount > 0) {
            console.log('Errors:', response.results);
          }
        })
          .catch(err => console.error('FCM error', err));
      }
    });


    socket.on("disconnect", () => {
      console.log("Socket disconnected", socket.id);
    });
  });
};
