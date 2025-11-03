const ChatRoom = require("../models/chatRoom.model");
const Message = require("../models/message.model");
const Ticket = require("../models/ticket.model");
const admin = require("../config/firebase");
const User = require("../models/user.model");
const Profile = require("../models/profile.model");
const mongoose = require("mongoose");
const { translate } = require("@vitalets/google-translate-api");
const { getFlagWithCountryCode } = require("../utils/flagHelper");

module.exports = (io) => {
  const userRooms = new Map();

  io.on("connection", (socket) => {
    console.log("✅ Socket connected:", socket.id);

    // Register user on connection
    socket.on("registerUser", ({ userId }) => {
      socket.userId = userId;
      console.log("Registered user:", userId);
    });

    // Join chat room
    socket.on("joinRoom", async ({ roomId }) => {
      try {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          return socket.emit("error", { message: "Invalid roomId" });
        }

        const room = await ChatRoom.findById(roomId);
        if (!room) return socket.emit("error", { message: "Room not found" });

        // Authorization
        if (
          room.organisation.toString() !== socket.userId &&
          room.processor.toString() !== socket.userId
        ) {
          return socket.emit("error", { message: "Not authorised for this room" });
        }

        socket.join(roomId);
        console.log(`👤 User ${socket.userId} joined room ${roomId}`);

        // Track active room for user
        if (!userRooms.has(socket.userId)) {
          userRooms.set(socket.userId, new Set());
        }
        userRooms.get(socket.userId).add(roomId);

        // Mark messages as read
        await Message.updateMany(
          { room: roomId, readBy: { $ne: socket.userId } },
          { $push: { readBy: socket.userId } }
        );
      } catch (err) {
        console.error("joinRoom error:", err);
        socket.emit("error", { message: "Server error" });
      }
    });

    // 🔥 Handle sending message with translation
    socket.on("sendMessage", async ({ roomId, content, attachments }) => {
      try {
        if (!socket.userId || !roomId) return;
        const room = await ChatRoom.findById(roomId).populate("organisation processor ticket");
        if (!room) return;

        // Save original message
        // const message = await Message.create({
        //   room: roomId,
        //   sender: socket.userId,
        //   content,
        //   attachments,
        //   readBy: [socket.userId],
        // });

        // Identify receiver
        const receiverId =
          socket.userId === room.organisation.id ? room.processor.id : room.organisation.id;

        const receiver = await User.findById(receiverId);
        const receiverProfile = await Profile.findOne({ user: receiverId });
        const targetLang = receiverProfile?.chatLanguage || "en"; // default English

        // 🌐 Translate the message only for receiver
        let translatedText = content;
        if (content && targetLang) {
          try {
            const result = await translate(content, { to: targetLang });
            translatedText = result.text;
          } catch (err) {
            console.warn("Translation failed, using original text:", err.message);
          }
        }
        const message = await Message.create({
          room: roomId,
          sender: socket.userId,
          content,
          attachments,
          readBy: [socket.userId],
          translatedContent: translatedText,
        });
        // 🟢 Send original to sender
        io.to(roomId).emit("newMessage", {
          ...message.toObject(),
          translatedContent: translatedText,
        });

        // 🟣 Optional: Push notification (if receiver offline)
        const isReceiverInRoom = userRooms.get(receiverId)?.has(roomId);
        if (!isReceiverInRoom && receiver?.fcmToken) {
        const chatData = {
          contactName: socket.userId === room.organisation.id
            ? room.organisation.fullName
            : room.processor.fullName,
          contactNumber: socket.userId === room.organisation.id
            ? room.organisation.phone
            : room.processor.phone,
          roomId: room.id,
          ticketId: room.ticket ? String(room.ticket._id) : "",
          ticketStatus: room.ticket ? room.ticket.status : "",
          userRole: socket.userId === room.organisation.id ? "organization" : "processor",
          flag: socket.userId === room.organisation.id
            ? getFlagWithCountryCode(room.organisation.countryCode)
            : getFlagWithCountryCode(room.processor.countryCode)
        }
        console.log("chatData for notification:", chatData);
        await admin.messaging().sendEachForMulticast({
          tokens: [receiver.fcmToken],
          notification: {
            title: `New message from ${socket.userId === room.organisation.id
              ? room.organisation.fullName
              : room.processor.fullName
              }`,
            body: translatedText,
          },
          data: {
            type: "chat_message",
            chatRoomId: room.id,
            screenName: "chatView",
            Route: '/chatView',
            // chatData: {
            contactName: socket.userId === room.organisation.id
              ? room.organisation.fullName
              : room.processor.fullName,
            contactNumber: socket.userId === room.organisation.id
              ? room.organisation.phone
              : room.processor.phone,
            roomId: room.id,
            ticketId: room.ticket ? String(room.ticket._id) : "",
            ticketStatus: room.ticket ? room.ticket.status : "",
            userRole: socket.userId === room.organisation.id ? "organization" : "processor",
            flag: socket.userId === room.organisation.id
              ? getFlagWithCountryCode(room.organisation.countryCode)
              : getFlagWithCountryCode(room.processor.countryCode),

            // }
          },
        }).then((response) => {
          console.log("Push notification sent:", response.successCount);
        }).catch((error) => {
          console.error("Error sending push notification:", error);
        });
        }
      } catch (err) {
        console.error("sendMessage error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id);
      if (socket.userId && userRooms.has(socket.userId)) {
        userRooms.delete(socket.userId);
      }
    });
  });
};
