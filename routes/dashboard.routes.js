const { getLatestRecordIndicator } = require("../controllers/dashboard.controller");
const auth = require("../middleware/auth.middleware");
const router = require("express").Router();

router.get("/", auth, getLatestRecordIndicator);


module.exports = router;