const Room = require("../models/room.model");
const User = require("../models/user.model");
const { generateLivekitToken } = require("../services/livekit.service");
const { getIO } = require("../socket/socketInstance");
const ChatRoom = require('../models/chatRoom.model');
const admin = require("../config/firebase");
const { getFlagWithCountryCode } = require("../utils/flagHelper");

exports.createSession = async (req, res) => {
  try {
    const { roomName, identity, name, users = "", callType = "video", eventType = "call_request" } = req.body;
    if (!roomName) return res.status(400).json({ error: "roomName is required" });

    const userId = identity || `user_${Math.random().toString(36).substring(2, 9)}`;

    const token = await generateLivekitToken(roomName, userId, name || userId);

    // FIX ❗ Find room by roomName, NOT _id
    let room = await Room.findOne({ roomName });

    if (!room) {
      room = await Room.create({
        roomName,
        createdBy: userId,
        token,
        users,
        callType,
        eventType
      });
    } else {
      room.eventType = eventType;
      room.users = users;
      await room.save();
    }

    const chatRoom = await ChatRoom.findById(roomName).populate("organisation processor");
    if (!chatRoom) return console.log("❌ ChatRoom Not Found");

    // AUTO DETECT CALL RECEIVER
    const receiverId =
      users === String(chatRoom.organisation._id)
        ? String(chatRoom.processor._id)
        : String(chatRoom.organisation._id);

    const senderUser =
      users === String(chatRoom.organisation._id) ? chatRoom.organisation : chatRoom.processor;
    const receiverUser =
      users === String(chatRoom.organisation._id) ? chatRoom.processor : chatRoom.organisation;

    // If receiver online -> emit socket event directly
    // const socketId = global.onlineUsers.get(receiverId);
    console.log(eventType, receiverId, "receiverId");

    if (receiverId && eventType === "call_request") {
      const io = getIO();
      io.to(receiverId).emit("incoming-call", {
        eventType,
        roomName,
        callType,
        token,
        sender_name: senderUser.fullName,
        receiver_name: receiverUser.fullName,
        flag: getFlagWithCountryCode(senderUser.countryCode),
        user: users
      });

      console.log("📞 Incoming Call Sent via WebSocket →", receiverId);
    }

    // Always send Notification (even if offline)
    // const receiver = await User.findById(receiverId).select("fcmToken fullName");
    // if (receiver?.fcmToken) {
    //   const payload = {
    //     token: receiver.fcmToken,   // FIX 🔥 token only (not tokens)
    //     notification: {
    //       title: `${senderUser.fullName} is calling`,
    //       body: `Incoming ${callType.toUpperCase()} Call`,
    //     },
    //     data: {
    //       roomName,
    //       callType,
    //       token,
    //       eventType: "call_request"
    //     }
    //   };

    //   await admin.messaging().send(payload);
    //   console.log("📨 Push Notification Delivered →", receiver.fullName);
    // }

    return res.json({
      status: 1,
      message: "Livekit session created",
      token,
      eventType,
      identity: userId,
      callType,
      livekitUrl: process.env.LIVEKIT_URL
    });

  } catch (err) {
    console.error("LIVEKIT ERROR:", err);
    return res.status(500).json({ status: 0, error: err.message });
  }
};
