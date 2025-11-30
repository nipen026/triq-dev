const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const Payment = require("../models/payment.model");

/*-------------------------------------------
    1. CREATE CHECKOUT SESSION FOR MOBILE APPS
--------------------------------------------*/
exports.createCheckout = async (req, res) => {
  try {
    const { amount, userId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "upi", "netbanking"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: "App Order Payment" },
            unit_amount: amount * 100, 
          },
          quantity: 1,
        }
      ],
      mode: "payment",

      // 🔥 DIRECT REDIRECT AFTER PAYMENT SUCCESS
      success_url: `myapp://payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `myapp://payment-failed`,
    });

    await Payment.create({
      userId,
      amount,
      currency: "inr",
      status: "pending",
      checkoutSessionId: session.id,
    });

    return res.json({ url: session.url }); // open in browser
  }
  catch (err) {
    return res.json({ status: 0, error: err.message });
  }
};




/*-------------------------------------------
    2. STRIPE WEBHOOK PAYMENT AUTO VERIFY
--------------------------------------------*/
exports.stripeWebhook = async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      await Payment.findOneAndUpdate(
        { checkoutSessionId: session.id },
        { status: "succeeded" }
      );
      console.log("✔ Payment verified:", session.id);
    }

    res.json({ received: true });
  } catch (err) {
    res.status(400).send(`Webhook error: ${err.message}`);
  }
};


/*-------------------------------------------
    3. VERIFY PAYMENT API FOR MOBILE APP
--------------------------------------------*/
exports.verifyPayment = async (req, res) => {
  try {
    const session_id = req.query.session_id;
    const payment = await Payment.findOne({ checkoutSessionId: session_id });

    if (!payment) return res.send("Payment not found");

    // Wait until webhook updates status (max 5 sec retry)
    let tries = 0;
    while (payment.status !== "succeeded" && tries < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      tries++;
      await payment.reload(); // recheck database
    }

    if (payment.status === "succeeded") {
      // 👇 Redirect to App after verification
      return res.redirect(`myapp://payment-success?session_id=${session_id}`);
    } else {
      return res.redirect(`myapp://payment-failed`);
    }

  } catch (err) {
    res.send("Error verifying payment");
  }
};
