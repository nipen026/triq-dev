const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth.middleware");
const {
  createChatRoom,
  getChatRoom,
  getChatMessages,
} = require("../controllers/contactChat.controller");
const uploadContactChatMiddleware = require("../middleware/uploadContactChat.middleware");

// Create new chat room
router.post("/create-room", authMiddleware, createChatRoom);

// Get existing chat room
router.get("/get-room/:receiverId", authMiddleware, getChatRoom);
router.get("/getContactChatMessages/:roomId", authMiddleware, getChatMessages);1
router.post("/upload/contactChat", uploadContactChatMiddleware.array("files", 10), (req, res) => {
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
      url: `${req.protocol}://${req.get("host")}/uploads/Contactchat/${file.filename}`,
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
