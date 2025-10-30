// socket/chatSocket.js
const ChatRoom = require("../models/chatRoom.model");
const Message = require("../models/message.model");
const Ticket = require('../models/ticket.model');
const admin = require('../config/firebase');
const fs = require("fs");
const path = require("path");
const User = require("../models/user.model");
const { translate } = require('libretranslate');
const mongoose = require("mongoose");


// async function translateText(text, targetLang = "en") {
//   try {
//     const res = await axios.get("https://api.mymemory.translated.net/get", {
//       params: { q: text, langpair: `auto|${targetLang}` },
//     });

//     return res.data?.responseData?.translatedText || text;
//   } catch (error) {
//     console.error("Translation error:", error.message);
//     return text; // fallback to original message if translation fails
//   }
// }
module.exports = (io) => {
  const userRooms = new Map(); 
  io.on("connection", (socket) => {
    console.log("Socket connected", socket.id);

    socket.on("registerUser", ({ userId }) => {
      socket.userId = userId;
      console.log("Registered user:", userId);
    });



    // socket.on("joinRoom", async (payload) => {
    //   try {
    //     // 1️⃣ Get roomId out of payload
    //     const roomId = typeof payload === "object" ? payload.roomId : payload;

    //     // 2️⃣ Validate roomId
    //     if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
    //       return socket.emit("error", { message: "Invalid or missing roomId" });
    //     }

    //     // 3️⃣ Find the room
    //     const room = await ChatRoom.findById(roomId);
    //     if (!room) {
    //       return socket.emit("error", { message: "Room not found" });
    //     }

    //     // 4️⃣ Check user belongs to room
    //     if (
    //       room.organisation.toString() !== socket.userId &&
    //       room.processor.toString() !== socket.userId
    //     ) {
    //       return socket.emit("error", { message: "Not authorised for this room" });
    //     }

    //     // 5️⃣ Join the room
    //     socket.join(roomId);
    //     console.log(`User ${socket.userId} joined room ${roomId}`);

    //     // 6️⃣ Mark all unread messages as read
    //     await Message.updateMany(
    //       { room: roomId, readBy: { $ne: socket.userId } },
    //       { $push: { readBy: socket.userId } }
    //     );

    //     // 7️⃣ Send the current unread count back to this socket
    //     const unreadCount = await Message.countDocuments({
    //       room: roomId,
    //       readBy: { $ne: socket.userId },
    //     });

    //     socket.emit("unreadCount", { roomId, unreadCount });
    //   } catch (err) {
    //     console.error("joinRoom error:", err);
    //     socket.emit("error", { message: "Server error" });
    //   }
    // });


    // socket.on("sendMessage", async (payload) => {
    //   console.log(payload, socket.userId);
    //   const { roomId, content, attachments } = payload;
    //   if (!socket.userId || !roomId) return;
    //   console.log(socket.userId, "!socket.userId || !roomId", roomId);

    //   const room = await ChatRoom.findById(roomId);
    //   console.log(room);

    //   if (!room) return;

    //   const message = await Message.create({
    //     room: roomId,
    //     sender: socket.userId,
    //     content,
    //     attachments,
    //     readBy: [socket.userId]
    //   });
    //   console.log('newMessage to room', roomId, message);
    //   io.to(roomId).emit("newMessage", message);
    //   // const chatWith =
    //   //   socket.userId === room.organisation.id ? room.processor : room.organisation;
    //   const UserData = await User.findById(socket.userId);


    //   const notificationPayload = {
    //     notification: {
    //       title: `New message from ${socket.userId === room.organisation.id ? room.organisation.fullName : room.processor.fullName}`,
    //       body: content || 'Attachment'
    //     },
    //     data: {
    //       type: 'chat_message',
    //       chatWithName: UserData.fullName,
    //       chatRoomId: room.id,
    //       screenName: 'chat'
    //     }
    //   };
    //   console.log(UserData.fcmToken, "UserData.fcmToken");

    //   // 🟢 send FCM to the *other* user
    //   if (UserData.fcmToken) {
    //     // await admin.messaging().sendToDevice(UserData.fcmToken, notificationPayload).then(response => {
    //     //   console.log('Notification sent:', response.successCount, 'success', response.failureCount, 'failures');
    //     //   if (response.failureCount > 0) {
    //     //     console.log('Errors:', response.results);
    //     //   }
    //     // })
    //     //   .catch(err => console.error('FCM error', err));

    //     await admin.messaging().sendEachForMulticast({
    //       tokens: [UserData.fcmToken],
    //       notification: notificationPayload.notification,
    //       data: notificationPayload.data,
    //     }).then(response => {
    //       console.log('Notification sent:', response.successCount, 'success', response.failureCount, 'failures');
    //       if (response.failureCount > 0) {
    //         console.log('Errors:', response.results);
    //       }
    //     })
    //       .catch(err => console.error('FCM error', err));
    //   }
    // });

    // const translate = require("@vitalets/google-translate-api");

    // inside sendMessage event
   socket.on("joinRoom", async (payload) => {
  try {
    const roomId = typeof payload === "object" ? payload.roomId : payload;
    if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
      return socket.emit("error", { message: "Invalid or missing roomId" });
    }

    const room = await ChatRoom.findById(roomId);
    if (!room) return socket.emit("error", { message: "Room not found" });

    if (
      room.organisation.toString() !== socket.userId &&
      room.processor.toString() !== socket.userId
    ) {
      return socket.emit("error", { message: "Not authorised for this room" });
    }

    socket.join(roomId);

    // ✅ Track that this user has joined this room
    if (!userRooms.has(socket.userId)) {
      userRooms.set(socket.userId, new Set());
    }
    userRooms.get(socket.userId).add(roomId);

    console.log(`✅ User ${socket.userId} joined room ${roomId}`);

    // Mark messages as read
    await Message.updateMany(
      { room: roomId, readBy: { $ne: socket.userId } },
      { $push: { readBy: socket.userId } }
    );

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

socket.on("disconnect", () => {
  console.log("Socket disconnected", socket.id);
  if (socket.userId && userRooms.has(socket.userId)) {
    userRooms.delete(socket.userId); // remove from active rooms
  }
});

   
    socket.on("sendMessage", async (payload) => {
  const { roomId, content, attachments } = payload;
  if (!socket.userId || !roomId) return;

  const room = await ChatRoom.findById(roomId).populate("organisation processor");
  if (!room) return;

  const message = await Message.create({
    room: roomId,
    sender: socket.userId,
    content,
    attachments,
    readBy: [socket.userId],
  });
const receiverId =
    socket.userId === room.organisation.id ? room.processor.id : room.organisation.id;
  const receiver = await User.findById(receiverId);
      

        // 🌐 Translate text using LibreTranslate (free API)
        // let translatedText = content;
        // if (content && targetLang) {
        //   const translatedContent = await translateText(content, targetLang);
        //     io.to(roomId).emit("newMessage", {
        //       ...message.toObject(),
        //       // translatedContent: translatedContent,
        //     });
        // }
  io.to(roomId).emit("newMessage", message);

  // 🧠 Identify receiver
  

  // 🚫 Skip FCM if receiver is already viewing the chat (joined the same room)
  const isReceiverInRoom = userRooms.get(receiverId)?.has(roomId);
  if (isReceiverInRoom) {
    console.log(`🔕 No FCM sent — ${receiverId} is active in room ${roomId}`);
    return;
  }

  // 🔔 Otherwise, send FCM notification
  if (receiver?.fcmToken) {
    await admin
      .messaging()
      .sendEachForMulticast({
        tokens: [receiver.fcmToken],
        notification: {
          title: `New message from ${
            socket.userId === room.organisation.id
              ? room.organisation.fullName
              : room.processor.fullName
          }`,
          body: content || "Attachment",
        },
        data: {
          type: "chat_message",
          chatRoomId: room.id,
          screenName: "chat",
        },
      })
      .then((response) =>
        console.log("📨 Notification sent:", response.successCount, "success")
      )
      .catch((err) => console.error("FCM error", err));
  }
});


    socket.on("updateTicketStatus", async ({ ticketId, status }) => {
      try {
        if (!ticketId || !status) {
          return socket.emit("error", { message: "Missing ticketId or status" });
        }

        // update in database
        const updatedTicket = await Ticket.findByIdAndUpdate(
          ticketId,
          { status },
          { new: true }
        );

        if (!updatedTicket) {
          return socket.emit("error", { message: "Ticket not found" });
        }

        // broadcast change to everyone
        io.emit("ticketStatusUpdated", updatedTicket);

        console.log(`Ticket ${ticketId} updated to ${status}`);

        // optional FCM notification
        const notifyUser = await User.findById(updatedTicket.processor);
        if (notifyUser?.fcmToken) {
          await admin.messaging().sendEachForMulticast({
            tokens: [notifyUser.fcmToken],
            notification: {
              title: "Ticket Status Updated",
              body: `Your ticket status changed to ${status}`,
            },
            data: { type: "ticket_status", ticketId },
          });
        }
      } catch (err) {
        console.error("updateTicketStatus error:", err);
        socket.emit("error", { message: "Failed to update ticket status" });
      }
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected", socket.id);
    });
  });
};
// const ChatRoom = require("../models/chatRoom.model");
// const Message = require("../models/message.model");
// const Ticket = require("../models/ticket.model");
// const admin = require("../config/firebase");
// const { translate } = require("libretranslate");
// const fs = require("fs");
// const path = require("path");
// const User = require("../models/user.model");
// const mongoose = require("mongoose");
// const axios = require('axios')

// async function translateText(text, targetLang = "en") {
//   try {
//     const res = await axios.get("https://api.mymemory.translated.net/get", {
//       params: { q: text, langpair: `auto|${targetLang}` },
//     });

//     return res.data?.responseData?.translatedText || text;
//   } catch (error) {
//     console.error("Translation error:", error.message);
//     return text; // fallback to original message if translation fails
//   }
// }
// module.exports = (io) => {
//   io.on("connection", (socket) => {
//     console.log("Socket connected", socket.id);

//     socket.on("registerUser", ({ userId }) => {
//       socket.userId = userId;
//       console.log("Registered user:", userId);
//     });

//     socket.on("joinRoom", async (payload) => {
//       try {
//         const roomId = typeof payload === "object" ? payload.roomId : payload;
//         if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
//           return socket.emit("error", { message: "Invalid or missing roomId" });
//         }

//         const room = await ChatRoom.findById(roomId);
//         if (!room) return socket.emit("error", { message: "Room not found" });

//         if (
//           room.organisation.toString() !== socket.userId &&
//           room.processor.toString() !== socket.userId
//         ) {
//           return socket.emit("error", { message: "Not authorised for this room" });
//         }

//         socket.join(roomId);
//         console.log(`User ${socket.userId} joined room ${roomId}`);

//         await Message.updateMany(
//           { room: roomId, readBy: { $ne: socket.userId } },
//           { $push: { readBy: socket.userId } }
//         );

//         const unreadCount = await Message.countDocuments({
//           room: roomId,
//           readBy: { $ne: socket.userId },
//         });

//         socket.emit("unreadCount", { roomId, unreadCount });
//       } catch (err) {
//         console.error("joinRoom error:", err);
//         socket.emit("error", { message: "Server error" });
//       }
//     });

//     // 🟢 Send message with real-time translation
//     socket.on("sendMessage", async (payload) => {
//       try {
//         const { roomId, content, attachments } = payload;
//         if (!socket.userId || !roomId) return;

//         const room = await ChatRoom.findById(roomId).populate("organisation processor");
//         if (!room) return;

//         const message = await Message.create({
//           room: roomId,
//           sender: socket.userId,
//           content,
//           attachments,
//           readBy: [socket.userId],
//         });

//         // 🧠 Determine receiver
//         const receiverId =
//           socket.userId === room.organisation.id ? room.processor.id : room.organisation.id;
//         const receiver = await User.findById(receiverId);

//         // 🌐 Translate text using LibreTranslate (free API)
//         let translatedText = content;
//         if (content && targetLang) {
//        const translatedContent = await translateText(content, targetLang);
//         io.to(roomId).emit("newMessage", {
//           ...message.toObject(),
//           translatedContent: translatedContent,
//         });
//         }

//         // 🟣 Emit to both sender and receiver
       

//         // 🔔 Send notification via FCM
//         if (receiver?.fcmToken) {
//           await admin.messaging().sendEachForMulticast({
//             tokens: [receiver.fcmToken],
//             notification: {
//               title: `New message from ${room.organisation.fullName || "User"}`,
//               body: content || "Attachment",
//             },
//             data: {
//               type: "chat_message",
//               chatRoomId: room.id,
//               screenName: "chat",
//             },
//           });
//         }
//       } catch (err) {
//         console.error("sendMessage error:", err);
//       }
//     });

//     // 🟠 Ticket status update in real-time
//     socket.on("updateTicketStatus", async ({ ticketId, status }) => {
//       try {
//         if (!ticketId || !status) {
//           return socket.emit("error", { message: "Missing ticketId or status" });
//         }

//         const updatedTicket = await Ticket.findByIdAndUpdate(
//           ticketId,
//           { status },
//           { new: true }
//         );

//         if (!updatedTicket) {
//           return socket.emit("error", { message: "Ticket not found" });
//         }

//         io.emit("ticketStatusUpdated", updatedTicket);
//         console.log(`Ticket ${ticketId} updated to ${status}`);

//         const notifyUser = await User.findById(updatedTicket.processor);
//         if (notifyUser?.fcmToken) {
//           await admin.messaging().sendEachForMulticast({
//             tokens: [notifyUser.fcmToken],
//             notification: {
//               title: "Ticket Status Updated",
//               body: `Your ticket status changed to ${status}`,
//             },
//             data: { type: "ticket_status", ticketId },
//           });
//         }
//       } catch (err) {
//         console.error("updateTicketStatus error:", err);
//         socket.emit("error", { message: "Failed to update ticket status" });
//       }
//     });

//     socket.on("disconnect", () => {
//       console.log("Socket disconnected", socket.id);
//     });
//   });
// };
