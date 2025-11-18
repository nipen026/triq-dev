const express = require("express");
const router = express.Router();
const {
attendanceAction,
getDashboardData,
getDayDetails,
getMonthlyAttendance
} = require("../controllers/attendance.controller")
const auth = require("../middleware/auth.middleware");

router.post("/add",auth, attendanceAction);
router.get("/employeeDashboard",auth, getDashboardData);
router.get("/dayDetails/:date",auth, getDayDetails);
router.get("/monthlyAttendance/:month",auth, getMonthlyAttendance);

module.exports = router;
