const express = require("express");
const router = express.Router();
const {
  addDesignation,
  getAllDesignation,
  getDesignationByDepartment
} = require("../controllers/designation.controller")
const auth = require("../middleware/auth.middleware");

router.post("/add",auth, addDesignation);
router.get("/getAllDesignation",auth, getAllDesignation);
router.get("/getAllDesignationByDepartment/:departmentId",auth, getDesignationByDepartment);

module.exports = router;
