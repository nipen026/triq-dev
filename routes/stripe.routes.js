const express = require("express");
const router = express.Router();
const StripeController = require("../controllers/stripe.controller");

router.post("/create-payment", StripeController.createPayment);

// Raw body required for webhook
router.post("/webhook", express.raw({ type: "application/json" }), StripeController.stripeWebhook);

module.exports = router;
