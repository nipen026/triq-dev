const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const uploadChat = require("../middleware/uploadChat.middleware"); // use the one above

const {
  getRoomByTicket,
  getMessages,
  sendMessage,
  createChatRoomForTicket,
  getAllChats,
  updateMessage,
  deleteMessage
} = require("../controllers/chat.controller");

router.post("/rooms", createChatRoomForTicket);

// 🟢 Get chat room by ticketId
router.get("/rooms/:ticketId", getRoomByTicket);

// 🟢 Get all messages for a room
router.get("/messages/:roomId", getMessages);
router.get("/getAllChats", auth, getAllChats);

// 🟢 Send message (with optional attachments)
router.post("/messages", sendMessage);

router.post("/messages/:messageId", auth, updateMessage);
router.post("/deleteMessages/:messageId", auth, deleteMessage);

// 🟢 Upload a chat attachment first
const path = require("path");

// in middleware: 
// const uploadChat = require("../middleware/uploadChat.middleware");

// POST /api/chat/upload/chat (multipart/form-data with field name 'files')
router.post("/upload/chat", uploadChat.array("files", 10), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "No files uploaded" });
  }

  const filesData = req.files.map((file) => {
    const ext = path.extname(file.originalname)
      .toLowerCase()
      .replace(".", "");

    let type = "document";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) type = "image";
    if (["mp4", "mov", "avi"].includes(ext)) type = "video";
    if (["pdf"].includes(ext)) type = "pdf";

    return {
      url: `${req.protocol}://${req.get("host")}/uploads/chat/${file.filename}`,
      name: file.originalname,
      ext,
      type,
    };
  });

  // respond with array of uploaded files metadata
  res.status(201).json({
    files: filesData,
  });
});



module.exports = router;
