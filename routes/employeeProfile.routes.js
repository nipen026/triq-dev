const express = require("express");
const router = express.Router();
const {
    getEmployeeProfile,
    updateEmployeeProfile
} = require("../controllers/employeeProfile.controller")
const auth = require("../middleware/auth.middleware");

router.get("/getEmployeeProfile",auth, getEmployeeProfile);
router.put("/updateEmployeeProfile",auth, updateEmployeeProfile);

module.exports = router;
