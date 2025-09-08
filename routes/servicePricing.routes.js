const express = require("express");
const router = express.Router();
const pricingCtrl = require("../controllers/servicePricing.controller");
const auth = require("../middleware/auth.middleware");

// Bulk create/update pricing
router.post("/create", auth, pricingCtrl.setPricing);

// Get all pricing for organisation
router.get("/getAll", auth, pricingCtrl.getAllPricing);

// Get one by ID
router.get("/getByID/:id", auth, pricingCtrl.getPricingById);

// Update one by ID
router.put("/update/:id", auth, pricingCtrl.updatePricing);

// Delete one by ID
router.delete("/delete/:id", auth, pricingCtrl.deletePricing);

module.exports = router;
