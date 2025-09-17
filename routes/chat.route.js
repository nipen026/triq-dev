const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "uploads/chat" }); // store uploads/chat/<filename>

const {
  getRoomByTicket,
  getMessages,
  sendMessage,
  createChatRoomForTicket
} = require("../controllers/chat.controller");

router.post('/rooms',createChatRoomForTicket)
// 🟢 Get chat room by ticketId
router.get("/rooms/:ticketId", getRoomByTicket);

// 🟢 Get all messages for a room
router.get("/messages/:roomId", getMessages);

// 🟢 Send message (with optional attachments)
router.post("/messages", upload.array("attachments", 5), sendMessage);

module.exports = router;
