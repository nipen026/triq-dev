const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    userId: String,
    amount: { type: Number, required: true },
    currency: { type: String, default: "inr" },
    checkoutSessionId: String,
    paymentIntentId: String,
    status: { type: String, default: "pending" }, // pending | succeeded
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
