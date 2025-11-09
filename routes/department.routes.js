const express = require("express");
const router = express.Router();
const {
  addDepartment,
  getAllDepartment
} = require("../controllers/department.controller")
const auth = require("../middleware/auth.middleware");

router.post("/add",auth, addDepartment);
router.get("/getAllDepartment",auth, getAllDepartment);

module.exports = router;
