const express = require("express");
const router = express.Router();
const upload = require("../middleware/uploadFieldWork.middleware");
const { createFieldwork, getFieldworks, getCCMemberList } = require("../controllers/fieldwork.controller");
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

router.get("/getFieldworks",auth, getFieldworks);
router.get('/getCCMemberList',auth,getCCMemberList)

module.exports = router;
