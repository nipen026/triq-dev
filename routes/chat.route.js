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
const path = require("path");

router.post("/upload/chat", uploadChat.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });

  // get extension, lowercased (without dot)
  const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');

  let type = "document";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) type = "image";
  if (["mp4", "mov", "avi"].includes(ext)) type = "video";
  if (["pdf"].includes(ext)) type = "pdf";

  res.status(201).json({
    url: `${req.protocol}://${req.get("host")}/uploads/chat/${req.file.filename}`,
    name: req.file.originalname,
    ext,    // optional: return the ext too
    type,
  });
});


module.exports = router;
