const Room = require("../models/room.model");
const { generateLivekitToken } = require("../services/livekit.service");
const { getIO } = require("../socket/socketInstance");

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

    // if (global.onlineUsers) {
    // users.forEach(u => {
    const receiverId = users;                         // field = ID of receiver
    const socketId = global.onlineUsers.get(receiverId);
    if (socketId) {
      io.to(socketId).emit("call-event", {
        eventType,
        roomName,
        token,
        callType,
        from: userId,        // caller
        to: receiverId       // receiver
      });
      console.log("📞 CALL SENT →", receiverId);
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
