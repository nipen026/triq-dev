const express = require("express");
const router = express.Router();
const controller = require("../controllers/reporting.controller");
const auth = require("../middleware/auth.middleware");

router.post("/create", auth, controller.createReporting);
router.get("/getAllReporting", auth, controller.getAllReporting);
router.get("/searchEmployeeCustomers", auth, controller.searchEmployeeCustomers);
router.put("/updateReporting/:id", auth, controller.updateReporting);
router.delete("/deleteReporting/:id", auth, controller.deleteReporting);

module.exports = router;
