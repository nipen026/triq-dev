const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  problem: String,
  errorCode: String,
  notes: String,

  media: [
    {
      url: String,
      type: { type: String, enum: ["image", "video"] }
    }
  ],

  ticketType: {
    type: String,
    enum: ["General Check Up", "Full Machine Service"],
  },
  type: String,
  status: {
    type: String,
    enum: ["Active", "In Progress", "Resolved", "Rejected"],
    default: "Active"
  },

  isActive: { type: Boolean, default: true },

  machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
  processor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organisation: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

  // ✅ Pricing Reference
  pricing: { type: mongoose.Schema.Types.ObjectId, ref: "ServicePricing" },

  // ✅ Payment Status
  paymentStatus: { type: String, enum: ["paid", "unpaid"], default: "unpaid" },

  engineerRemark: String,
}, { timestamps: true });

module.exports = mongoose.model("Ticket", ticketSchema);
