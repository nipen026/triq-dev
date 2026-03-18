const express = require("express");
const router = express.Router();

const chatController = require("../controllers/groupChat.controller");
const auth = require("../middleware/auth");

router.post("/create", auth, chatController.createGroupChat);

router.get("/my-chats", auth, chatController.getUserChatRooms);
router.put("/leave/:groupId", auth, chatController.leaveGroup);
router.put("/rename/:groupId", auth, chatController.renameGroup);
router.put("/add-members/:groupId", auth, chatController.addMembersToGroup);
module.exports = router;