const Room = require("../models/room.model");
const User = require("../models/user.model");
const { generateLivekitToken } = require("../services/livekit.service");
const { getIO } = require("../socket/socketInstance");
const ChatRoom = require('../models/chatRoom.model');
exports.createSession = async (req, res) => {
  console.log(req.body, "body");

  try {
    const { roomName, identity, name, users = "", callType = "video", eventType = "call_request" } = req.body;

    if (!roomName) return res.status(400).json({ error: "roomName is required" });

    const io = getIO();
    const userId = identity || `user_${Math.random().toString(36).substring(2, 9)}`;

    // if (eventType == 'call_request') {
    const token = await generateLivekitToken(roomName, userId, name || userId);
    // } else {
    //   let room = await Room.findOne({ roomName });
    //   if (room) {
    //     token = room.token
    //   } else {
    //     return;
    //   }
    // }
    let room = await Room.findOne({ roomName });
    if (!room) {
      room = await Room.create({
        roomName,
        createdBy: userId,
        token,
        users,
        callType,
        eventType    // <-- store latest event in DB
      });
    } else {
      room.eventType = eventType,
        room.users = users
      room.save();
    }



    const chatRoom = await ChatRoom.findById(roomName).populate("organisation processor");
    if (!chatRoom) return console.log("❌ ChatRoom Not Found");

    // AUTO GET RECEIVER
    const receiverId =
      users === String(chatRoom.organisation._id)
        ? String(chatRoom.processor._id)
        : String(chatRoom.organisation._id);

    console.log(chatRoom, users, 'chatRoom');


    // const socketId = global.onlineUsers.get(receiverId);
    console.log(socketId, "🔹 Found Socket ID");

    // if (socketId) {
    io.to(receiverId).emit("incoming-call", {
      eventType,
      roomName,
      token,
      callType,
      user: users
    });
    const receiver = await User.findById(receiverId).select("fcmToken fullName");
    if (receiver?.fcmToken) {
      await admin.messaging().send({
        token: receiver.fcmToken,
        notification: {
          title: "Incoming Call",
          body: "You have an incoming call",
        },
        data: { roomName, callType, token }
      });
    }
    console.log("📞 CALL SENT →", receiverId, "→ Socket:", socketId);
    // } else {
    //   console.log("📵 Receiver is offline OR not registered in socket");
    // }
    // });
    // }

    return res.json({
      status: 1,
      message: "Livekit session created",
      eventType,
      token,
      identity: userId,
      livekitUrl: process.env.LIVEKIT_URL,
      callType
    });

  } catch (err) {
    console.error("LIVEKIT ERROR:", err);
    return res.status(500).json({ status: 0, error: err.message });
  }
};
