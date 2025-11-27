const Room = require("../models/room.model");
const { generateLivekitToken } = require("../services/livekit.service");

exports.createSession = async (req, res) => {
  try {
    const { roomName, identity, name } = req.body;

    if (!roomName) {
      return res.status(400).json({ error: "roomName is required" });
    }

    // Optional save to DB
    let room = await Room.findOne({ roomName });
    if (!room) {
      room = await Room.create({
        roomName,
        createdBy: identity || "system",
      });
    }

    const userId = identity || `user_${Math.random().toString(36).substring(2, 9)}`;

    const token = generateLivekitToken(roomName, userId, name || userId);

    return res.json({
      status: 1,
      message: "Token generated successfully",
      token,
      identity: userId,
      livekitUrl: process.env.LIVEKIT_URL,
    });
  } catch (err) {
    console.error("LiveKit Error:", err);
    return res.status(500).json({
      status: 0,
      error: err.message,
    });
  }
};
