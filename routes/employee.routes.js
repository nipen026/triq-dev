const express = require("express");
const router = express.Router();
const {
  addEmployee,
  getAllEmployees,
  searchEmployee,
  getEmployeeById,
  updateEmployee,
  getEmployeeHierarchy,
  getEmployeePermissions,
  setEmployeePermissions
} = require("../controllers/employee.controller")
const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/uploadEmployeProfile.middleware");

router.post("/add", auth,upload.single("profilePhoto"), addEmployee);
router.get("/getAllEmployee",auth, getAllEmployees);
router.get("/searchEmployee", searchEmployee);
router.get("/getEmployeeById/:id",auth, getEmployeeById);
router.get("/getEmployeeHierarchy/:id",auth,getEmployeeHierarchy)
router.put("/update/:id",auth, upload.single("profilePhoto"),updateEmployee);

// --------- Permission -----------


router.get("/getPermissions/:employeeId",auth, getEmployeePermissions);
router.post("/addPermissions/:employeeId", auth,setEmployeePermissions);

module.exports = router;
