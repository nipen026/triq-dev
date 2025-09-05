// routes/auth.routes.js
const express = require("express");
const router = express.Router();
const machineSupplier = require("../controllers/machineSupplier.controller");
const verifyToken = require("../middleware/auth.middleware");

router.get("/getMachineSupplier", verifyToken,machineSupplier.getMachineSupplierList);
router.get("/getMachineOverview", verifyToken,machineSupplier.getMachineOverview);

module.exports = router;
