const express = require("express");
const router = express.Router();
const reportController = require("../controllers/report.controller");
const auth = require("../middleware/auth.middleware");

router.post("/report-problem",auth, reportController.reportProblem);
router.post("/send-feedback", auth,reportController.SendFeedback);

module.exports = router;