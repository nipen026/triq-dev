const Room = require("../models/room.model");
const { generateLivekitToken } = require("../services/livekit.service");
const { getIO } = require("../socket/socketInstance");
const ChatRoom = require('../models/chatRoom.model');
exports.createSession = async (req, res) => {
  try {
    const { roomName, identity, name, users = "", callType = "video", eventType = "call_requesting" } = req.body;

    if (!roomName) return res.status(400).json({ error: "roomName is required" });

    const io = getIO();
    const userId = identity || `user_${Math.random().toString(36).substring(2, 9)}`;
    const token = await generateLivekitToken(roomName, userId, name || userId);

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
    }
    const chatRoom = await ChatRoom.findById(roomName).populate("organisation processor");
    if (!chatRoom) return console.log("❌ ChatRoom Not Found");

    // AUTO GET RECEIVER
    const receiverId =
      users === String(chatRoom.organisation._id)
        ? String(chatRoom.processor._id)
        : String(chatRoom.organisation._id);
        console.log(receiverId, "receiverId");
        
    const socketId = global.onlineUsers.get([receiverId]);
    console.log(socketId, "socketId");

    if (socketId) {
      io.to(socketId).emit("incoming-call", {
        eventType,
        roomName,
        token,
        callType,
        user: users
      });
      console.log("📞 CALL SENT →", socketId);
    }
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
