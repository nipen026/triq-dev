const Payment = require("../models/payment.model");
const { createPaymentIntent } = require("../services/stripe.service");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createPayment = async (req, res) => {
  try {
    const { amount, userId } = req.body;

    if (!amount) {
      return res.status(400).json({ status: 0, error: "amount is required" });
    }

    const paymentIntent = await createPaymentIntent(amount);

    // Save payment log
    await Payment.create({
      userId,
      amount,
      currency: process.env.STRIPE_CURRENCY,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
    });

    return res.json({
      status: 1,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 0, error: error.message });
  }
};

/* ---------- Stripe Webhook ---------- */
exports.stripeWebhook = async (req, res) => {
  let event;

  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook Signature Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle events
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;

    await Payment.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { status: "succeeded" }
    );

    console.log("Payment succeeded:", paymentIntent.id);
  }

  res.json({ received: true });
};
