const Room = require("../models/room.model");
const User = require("../models/user.model");
const Sound = require("../models/sound.model");
const Profile = require('../models/profile.model');
const { generateLivekitToken } = require("../services/livekit.service");
const { getIO } = require("../socket/socketInstance");
const ChatRoom = require('../models/chatRoom.model');
const admin = require("../config/firebase");
const { getFlagWithCountryCode } = require("../utils/flagHelper");

exports.createSession = async (req, res) => {
  try {
    const { roomName, identity, name, users, callType = "video", eventType = "call-request" } = req.body;
    if (!roomName) return res.status(400).json({ error: "roomName is required" });

    const userId = identity || `user_${Math.random().toString(36).substring(2, 9)}`;

    let room = await Room.findOne({ roomName });

    // 🚫 Prevent duplicate call request - if already ringing, do not notify again
    if (room && room.eventType === "call-request") {
      return res.json({ status: 2, msg: "Call already ringing...", roomName });
    }

    const token = await generateLivekitToken(roomName, userId, name || userId);

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
      room.token = token;
      await room.save();
    }

    // 🔥 FIXED — DO NOT USE findById(roomName)
    const chatRoom = await ChatRoom.findOne({ roomName }).populate("organisation processor");
    if (!chatRoom) return console.log("❌ ChatRoom Not Found");

    const receiverId =
      users === String(chatRoom.organisation._id)
        ? String(chatRoom.processor._id)
        : String(chatRoom.organisation._id);

    const io = getIO();
    io.to(receiverId).emit("incoming-call", { roomName, token, callType, eventType });

    console.log(`📞 SOCKET SENT TO → ${receiverId}`);

    // 📌 PUSH NOTIFICATION ONLY IF call-request
    if (eventType === "call-request") {
      const receiver = await User.findById(receiverId).select("fullName fcmToken countryCode");
      if (receiver?.fcmToken) {
        const soundData = await Sound.findOne({
          user: receiverId,
          type: callType === "audio" ? "voice_call" : "video_call"
        }) || { soundName: "bell" };

        await admin.messaging().send({
          token: receiver.fcmToken,
          data: {
            title: `${name} is calling`,
            body: `Incoming ${callType} call`,
            roomName,
            callType,
            token,
            eventType
          },
          android: { priority: "high" },
          apns: { payload: { aps: { sound: `${soundData.soundName}.aiff`, "content-available": 1 } } }
        });

        console.log("📨 PUSH NOTIFICATION SENT");
      }
    }

   return res.json({ status: 1, message: "Livekit session created", token, eventType, identity: userId, callType, livekitUrl: process.env.LIVEKIT_URL });

  } catch (err) {
    console.error("LIVEKIT ERROR", err);
    return res.status(500).json({ status: 0, error: err.message });
  }
};

