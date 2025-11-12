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
  setEmployeePermissions,
  getEligibleReportToList
} = require("../controllers/employee.controller")
const auth = require("../middleware/auth.middleware");
const upload = require("../middleware/uploadEmployeProfile.middleware");

router.post("/add", auth,upload.single("profilePhoto"), addEmployee);
router.get("/getAllEmployee",auth, getAllEmployees);
router.get("/searchEmployee", searchEmployee);
router.get("/getEmployeeById/:id",auth, getEmployeeById);
router.get("/getEmployeeHierarchy/:departmentId",auth,getEmployeeHierarchy)
router.put("/update/:id",auth, upload.single("profilePhoto"),updateEmployee);
router.get("/getEligibleReportToList",auth,getEligibleReportToList);

// --------- Permission -----------


router.get("/getPermissions/:employeeId",auth, getEmployeePermissions);
router.post("/addPermissions/:employeeId", auth,setEmployeePermissions);

module.exports = router;
