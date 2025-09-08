const mongoose = require("mongoose");

const servicePricingSchema = new mongoose.Schema({
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  // Online or Offline Support
  supportMode: {
    type: String,
    enum: ["Online", "Offline"],
    required: true
  },

  // Warranty condition
  warrantyStatus: {
    type: String,
    enum: ["In warranty", "Out of warranty"],
    required: true
  },

  // Type of service inside that support
  ticketType: {
    type: String,
    enum: ["General Check Up", "Full Machine Service"],
    required: true
  },

  // Cost & currency
  cost: { type: Number, required: true },
  currency: { type: String, default: "INR" }

}, { timestamps: true });

// 🚫 Prevent duplicates: unique per organisation + mode + warranty + ticketType
servicePricingSchema.index(
  { organisation: 1, supportMode: 1, warrantyStatus: 1, ticketType: 1 },
  { unique: true }
);

module.exports = mongoose.model("ServicePricing", servicePricingSchema);
