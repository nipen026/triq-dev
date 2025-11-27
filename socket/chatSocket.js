const ChatRoom = require("../models/chatRoom.model");
const Message = require("../models/message.model");
const Ticket = require("../models/ticket.model");
const admin = require("../config/firebase");
const User = require("../models/user.model");
const Profile = require("../models/profile.model");
const Sound = require("../models/sound.model")
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
      socket.join(userId);
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
        console.log(room, "room");


        // 🟢 Send original to sender
        io.to(roomId).emit("newMessage", {
          ...message.toObject(),
          translatedContent: translatedText,
        });
        const participants = [room.organisation._id.toString(), room.processor._id.toString()];

        for (const userId of participants) {
          const chatWith =
            userId === room.organisation._id.toString()
              ? room.processor
              : room.organisation;

          const flag = getFlagWithCountryCode(chatWith?.countryCode);

          // 🔸 Count unread messages for this user
          const unreadCount = await Message.countDocuments({
            room: roomId,
            sender: { $ne: userId },
            readBy: { $ne: userId },
          });

          const updatedChat = {
            _id: room._id,
            ticket: room.ticket,
            chatWith: { ...chatWith._doc, flag },
            lastMessage: message,
            unreadCount,
            updatedAt: new Date(),
          };

          // ✅ Emit to each user's personal socket room
          io.to(userId).emit("updateChatList", updatedChat);
        }
        // 🟣 Optional: Push notification (if receiver offline)
        const isReceiverInRoom = userRooms.get(receiverId)?.has(roomId);
        if (!isReceiverInRoom && receiver?.fcmToken) {
          const soundData = await Sound.findOne({
            type: "chat",
            user: receiverId,
          });
          console.log(soundData, receiverId, "soundData");

          const dynamicSoundName = soundData.soundName;

          // Step B: Android ke notification options taiyaar karein
          const androidNotification = {
            channelId: "triq_custom_sound_channel",
            sound: dynamicSoundName,
          };

          // const message = {
          //   tokens: [receiver.fcmToken],
          //   notification: {
          //     title: `New message from ${socket.userId === room.organisation.id
          //       ? room.organisation.fullName
          //       : room.processor.fullName
          //       }`,
          //     body: translatedText,
          //   },
          //   data: {
          //     type: "chat_message",
          //     chatRoomId: room.id,
          //     screenName: "chatView",
          //     route:'/chatView',
          //     sound:"bell",
          //     android_channel_id: "triq_custom_sound_channel",
          //     contactName: socket.userId === room.organisation.id
          //     ? room.organisation.fullName
          //     : room.processor.fullName,
          //   contactNumber: socket.userId === room.organisation.id
          //     ? room.organisation.phone
          //     : room.processor.phone,
          //   roomId: room.id,
          //   ticketId: room.ticket ? String(room.ticket._id) : "",
          //   ticketStatus: room.ticket ? room.ticket.status : "",
          //   ticketNumber:room.ticket ? room.ticket.ticketNumber : "",
          //   userRole: socket.userId === room.organisation.id ? "organization" : "processor",
          //   flag: socket.userId === room.organisation.id
          //     ? getFlagWithCountryCode(room.organisation.countryCode)
          //     : getFlagWithCountryCode(room.processor.countryCode),
          //   },
          //   android: {
          //     notification: androidNotification,
          //   },
          //   apns: {
          //      headers: { "apns-priority": "10" },
          //     payload: {
          //       aps: {
          //         sound: `bell.aiff`,
          //         "mutable-content": 1,
          //       },
          //     },

          //   },
          // };
          const message = {
            tokens: [receiver.fcmToken],

            // 1. Notification object title/body ke saath
            notification: {
              title: `New message from ${socket.userId === room.organisation.id
                ? room.organisation.fullName
                : room.processor.fullName
                }`,
              body: translatedText,
            },

            // 2. Data object me sirf navigation ka data hoga
            data: {
              type: "chat_message",
              chatRoomId: room.id,
              screenName: "chatView",
              route: '/chatView',
              android_channel_id: "triq_custom_sound_channel",
              sound: dynamicSoundName,
              // Yahan se 'sound' aur 'android_channel_id' hata diye gaye hain kyunki wo ab upar set hain.
              contactName: socket.userId === room.organisation.id
                ? room.organisation.fullName
                : room.processor.fullName,
              contactNumber: socket.userId === room.organisation.id
                ? room.organisation.phone
                : room.processor.phone,
              roomId: room.id,
              ticketId: room.ticket ? String(room.ticket._id) : "",
              ticketStatus: room.ticket ? room.ticket.status : "",
              ticketNumber: room.ticket ? room.ticket.ticketNumber : "",
              userRole: socket.userId === room.organisation.id ? "organization" : "processor",
              flag: socket.userId === room.organisation.id
                ? getFlagWithCountryCode(room.organisation.countryCode)
                : getFlagWithCountryCode(room.processor.countryCode),
            },

            // 3. Android ke liye priority aur notification options
            android: {
              priority: "high", // Priority ko yahan rakhein
              notification: androidNotification,
            },

            // 4. iOS ke liye options
            apns: {
              headers: { "apns-priority": "10" },
              payload: {
                aps: {
                  // Sound file ka naam string me aur .aiff extension ke saath
                  sound: ` ${dynamicSoundName}.aiff`,
                  "mutable-content": 1,
                },
              },
            }
          };
          console.log(message, "message");
          // const message ={
          //   tokens: [receiver.fcmToken],
          //   notification: {
          //     title: `New message from ${socket.userId === room.organisation.id
          //       ? room.organisation.fullName
          //       : room.processor.fullName
          //       }`,
          //     body: translatedText,
          //   },
          //   data: {
          //     type: "chat_message",
          //     chatRoomId: room.id,
          //     screenName: "chat",
          //   },
          // }


          await admin.messaging().sendEachForMulticast(message);
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
