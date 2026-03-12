const express = require("express");
const router = express.Router();

const controller = require("../controllers/groupChatMessage.controller");
const auth = require("../middleware/auth");

router.post("/send", auth, controller.sendMessage);

router.get("/messages/:roomId", auth, controller.getMessages);

router.post("/read", auth, controller.markAsRead);

router.post("/react", auth, controller.reactMessage);

router.delete("/:messageId", auth, controller.deleteMessage);

router.post("/seen", auth, controller.markSeen);

module.exports = router;