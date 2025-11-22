const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadFieldWork.middleware");
const { createFieldwork } = require("../controllers/fieldwork.controller");
const auth = require("../middleware/auth.middleware");

router.post(
    "/create",
    auth,
    upload.fields([
        { name: "audio", maxCount: 5 },
        { name: "video", maxCount: 5 },
        { name: "image", maxCount: 10 }
    ]),
    createFieldwork
);

module.exports = router;
