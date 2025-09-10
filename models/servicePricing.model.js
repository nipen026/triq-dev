const mongoose = require("mongoose");

const pricingItemSchema = new mongoose.Schema({
  supportMode: {
    type: String,
    enum: ["Online", "Offline"],
    required: true
  },
  warrantyStatus: {
    type: String,
    enum: ["In warranty", "Out of warranty"],
    required: true
  },
  ticketType: {
    type: String,
    enum: ["General Check Up", "Full Machine Service"],
    required: true
  },
  cost: { type: Number, required: true },
  currency: { type: String, default: "INR" }
});

const servicePricingSchema = new mongoose.Schema(
  {
    organisation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true // ✅ only one record per organisation
    },
    pricing: [pricingItemSchema] // ✅ array of pricing entries
  },
  { timestamps: true }
);

module.exports = mongoose.model("ServicePricing", servicePricingSchema);
