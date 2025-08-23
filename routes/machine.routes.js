const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.middleware");
const roles = require("../middleware/role.middleware");
const {
  createMachine,
  getMachines,
  getMachineById,
  updateMachine,
  deleteMachine
} = require("../controllers/machine.controller");

// Routes
router.post("/create", auth, roles("organization"), createMachine);     // Create
router.get("/getAll", auth, getMachines);        // Get all
router.get("/getById/:id", auth, getMachineById);  // Get one
router.put("/update/:id", auth, roles("organization"), updateMachine);   // Update
router.delete("/delete/:id", auth, roles("organization"), deleteMachine);// Delete

module.exports = router;
