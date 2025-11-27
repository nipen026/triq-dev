const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    userId: { type: String },
    amount: { type: Number, required: true },
    currency: { type: String, default: "inr" },
    paymentIntentId: { type: String },
    status: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", PaymentSchema);
