const express = require("express");
const router = express.Router();
const { createCheckout, stripeWebhook, verifyPayment } = require("../controllers/stripe.controller");

// Route to create payment and get redirect URL
router.post("/create-checkout", createCheckout);

// Stripe webhook (must have rawBody)
router.post("/stripe/webhook", express.raw({ type: 'application/json' }), stripeWebhook);

// Verify payment after redirect on app
router.get("/verify-payment", verifyPayment);

module.exports = router;
