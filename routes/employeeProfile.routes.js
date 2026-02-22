const express = require("express");
const router = express.Router();
const {
    getEmployeeProfile,
    updateEmployeeProfile
} = require("../controllers/employeeProfile.controller")
const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/uploadEmployeProfile.middleware");

router.get("/getEmployeeProfile",auth, getEmployeeProfile);
router.put("/updateEmployeeProfile",auth, upload.single("profilePhoto"), updateEmployeeProfile);

module.exports = router;
