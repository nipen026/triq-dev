const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const uploadChat = require("../middleware/uploadChat.middleware"); // use the one above

const {
  getRoomByTicket,
  getMessages,
  sendMessage,
  createChatRoomForTicket,
  getAllChats
} = require("../controllers/chat.controller");

router.post("/rooms", createChatRoomForTicket);

// 🟢 Get chat room by ticketId
router.get("/rooms/:ticketId", getRoomByTicket);

// 🟢 Get all messages for a room
router.get("/messages/:roomId", getMessages);
router.get("/getAllChats", auth, getAllChats);

// 🟢 Send message (with optional attachments)
router.post("/messages", sendMessage);

// 🟢 Upload a chat attachment first
router.post("/upload/chat", uploadChat.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  let type = "document";
  if (req.file.mimetype.startsWith("image")) type = "image";
  if (req.file.mimetype.startsWith("video")) type = "video";

  res.status(201).json({
    url: `${req.protocol}://${req.get('host')}/uploads/chat/${req.file.filename}`,
    name: req.file.originalname,
    type,
  });
});

module.exports = router;
