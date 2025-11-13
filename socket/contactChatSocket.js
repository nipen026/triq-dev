const mongoose = require("mongoose");
const ContactChatRoom = require("../models/contactChatRoom.model");
const ContactChatMessage = require("../models/contactChatMessage.model");
const User = require("../models/user.model");
const Employee = require("../models/employee.model");

module.exports = (io) => {
  const userRooms = new Map(); // to track which user is in which room

  io.on("connection", (socket) => {
    console.log("✅ Contact Chat Socket connected:", socket.id);

    /**
     * REGISTER USER SOCKET
     * userId = logged in User ID (from token on frontend)
     */
    socket.on("ContactRegisterUser", ({ userId }) => {
      if (!userId) return;
      socket.userId = userId;
      socket.join(userId);
      console.log(`🟢 Registered user: ${userId}`);
    });

    /**
     * JOIN ROOM EVENT
     * roomId = ContactChatRoom ID
     */
    socket.on("joinContactRoom", async ({ roomId }) => {
      try {
        if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
          return socket.emit("error", { message: "Invalid roomId" });
        }

        const room = await ContactChatRoom.findById(roomId);
        if (!room) return socket.emit("error", { message: "Room not found" });

        // Authorization check
        if (
          room.employee_sender.toString() !== socket.userId &&
          room.employee_receiver.toString() !== socket.userId
        ) {
          return socket.emit("error", { message: "Not authorised for this room" });
        }

        socket.join(roomId);
        console.log(`👤 User ${socket.userId} joined room ${roomId}`);

        // Track active rooms per user
        if (!userRooms.has(socket.userId)) {
          userRooms.set(socket.userId, new Set());
        }
        userRooms.get(socket.userId).add(roomId);

        // Mark messages as read when joining
        await ContactChatMessage.updateMany(
          { room: roomId, readBy: { $ne: socket.userId } },
          { $push: { readBy: socket.userId } }
        );
      } catch (err) {
        console.error("joinRoom error:", err);
        socket.emit("error", { message: "Server error" });
      }
    });

    /**
     * SEND MESSAGE EVENT
     * payload: { roomId, content, attachments }
     */
    socket.on("ContactSendMessage", async ({ roomId, content, attachments }) => {
      try {
        if (!socket.userId || !roomId) return;

        const room = await ContactChatRoom.findById(roomId)
          .populate("employee_sender", "fullName email")
          .populate("employee_receiver", "fullName email");

        if (!room) return socket.emit("error", { message: "Room not found" });

        // Save new message
        const newMessage = await ContactChatMessage.create({
          chatRoom: roomId,
          sender: socket.userId,
          content : content,
          attachments,
          readBy: [socket.userId],
        });

        // Update room info
        await ContactChatRoom.findByIdAndUpdate(roomId, {
          lastMessage: content,
          lastMessageAt: new Date(),
          lastMessageBy: socket.userId,
        });

        // Broadcast message to room
        io.to(roomId).emit("ContactNewMessage", newMessage);

        // Identify participants
        const participants = [
          room.employee_sender._id.toString(),
          room.employee_receiver._id.toString(),
        ];

        // For each participant, send chat list updates
        for (const userId of participants) {
          const chatWith =
            userId === room.employee_sender._id.toString()
              ? room.employee_receiver
              : room.employee_sender;

          // Count unread messages for this user
          const unreadCount = await ContactChatMessage.countDocuments({
            room: roomId,
            sender: { $ne: userId },
            readBy: { $ne: userId },
          });

          const updatedChat = {
            _id: room._id,
            chatWith,
            lastMessage: newMessage,
            unreadCount,
            updatedAt: new Date(),
          };

          io.to(userId).emit("ContactUpdateChatList", updatedChat);
        }

        // (Optional) If you add push notification later, you can integrate here.

      } catch (err) {
        console.error("sendMessage error:", err);
      }
    });

    /**
     * MARK MESSAGES READ
     * when user opens chat
     */
    socket.on("markAsRead", async ({ roomId }) => {
      try {
        if (!socket.userId || !roomId) return;
        await ContactChatMessage.updateMany(
          { room: roomId, readBy: { $ne: socket.userId } },
          { $push: { readBy: socket.userId } }
        );
        console.log(`✅ Messages marked read for room ${roomId} by ${socket.userId}`);
      } catch (err) {
        console.error("markAsRead error:", err);
      }
    });

    /**
     * DISCONNECT HANDLER
     */
    socket.on("disconnect", () => {
      console.log("🔴 Contact Chat socket disconnected:", socket.id);
      if (socket.userId && userRooms.has(socket.userId)) {
        userRooms.delete(socket.userId);
      }
    });
  });
};
