const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/payment.model");

/*-------------------------------------------
    1. CREATE CHECKOUT SESSION FOR MOBILE APPS
--------------------------------------------*/
exports.createCheckout = async (req, res) => {
  try {
    const { amount, userId } = req.body;
    if (!amount) 
      return res.status(400).json({ status: 0, msg: "amount is required" });

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "upi", "netbanking"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: "Order Payment" },
            unit_amount: amount * 100, // paise format
          },
          quantity: 1,
        },
      ],
      mode: "payment",

      // ⚠ Deep link return to APP instead of website
      success_url: `myapp://payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `myapp://payment-failed`,
    });

    // Save payment
    await Payment.create({
      userId,
      amount,
      currency: "inr",
      checkoutSessionId: session.id,
      paymentIntentId: session.payment_intent,
      status: "pending"
    });

    return res.json({
      status: 1,
      redirect_url: session.url,  // open in browser
      sessionId: session.id,
    });

  } catch (error) {
    return res.status(500).json({ status: 0, error: error.message });
  }
};


/*-------------------------------------------
    2. STRIPE WEBHOOK PAYMENT AUTO VERIFY
--------------------------------------------*/
exports.stripeWebhook = async (req, res) => {
  let event;

  try {
    const signature = req.headers["stripe-signature"];
    event = stripe.webhooks.constructEvent(
      req.rawBody, // raw body important
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    await Payment.findOneAndUpdate(
      { checkoutSessionId: session.id },
      { status: "succeeded" }
    );

    console.log("✔ Payment verified:", session.id);
  }

  res.json({ received: true });
};


/*-------------------------------------------
    3. VERIFY PAYMENT API FOR MOBILE APP
--------------------------------------------*/
exports.verifyPayment = async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) return res.json({ status: 0, msg: "session_id required" });

    const payment = await Payment.findOne({ checkoutSessionId: session_id });

    if (!payment) return res.json({ status: 0, msg: "Payment not found" });

    return res.json({
      status: 1,
      payment_status: payment.status,
      data: payment
    });

  } catch (error) {
    return res.status(500).json({ status: 0, error: error.message });
  }
};
