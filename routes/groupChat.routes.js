const express = require("express");
const router = express.Router();

const chatController = require("../controllers/groupChat.controller");
const auth = require("../middleware/auth");

router.post("/create", auth, chatController.createGroupChat);

router.get("/my-chats", auth, chatController.getUserChatRooms);

module.exports = router;