const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadFieldWork.middleware");
const { createFieldwork, getFieldworks } = require("../controllers/fieldwork.controller");
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

router.get("/getFieldworks", getFieldworks);

module.exports = router;
