const express = require("express");
const router = express.Router();

const {
  createCustomer,
  getCustomers,
  updateCustomer,
  getCustomerById,
  deleteCustomer,
  searchCustomers,
  removeMachineFromCustomer,
  getMyMachines
} = require("../controllers/customer.controller");
const auth = require("../middleware/auth.middleware");
// @route   POST /api/customers
// @desc    Create new customer
router.post("/create-customer", auth, createCustomer);

// @route   GET /api/customers
// @desc    Get all customers
router.get("/get-customers", auth, getCustomers);
router.get("/getCustomerById/:id", getCustomerById);
router.get("/getMyMachines",auth, getMyMachines);

// @route   PUT /api/customers/:id
// @desc    Update customer by ID
router.put("/update-customer/:id",auth, updateCustomer);

// @route   DELETE /api/customers/:id
// @desc    Delete customer by ID
router.delete("/delete-customer/:id", deleteCustomer);
router.get("/search-customers", auth, searchCustomers);
router.post("/remove-machine/:customerId/:machineId", auth, removeMachineFromCustomer);
module.exports = router;
