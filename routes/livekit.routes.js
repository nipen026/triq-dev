const express = require("express");
const router = express.Router();
const LiveKitController = require("../controllers/livekit.controller");

router.post("/create-session", LiveKitController.createSession);

module.exports = router;
