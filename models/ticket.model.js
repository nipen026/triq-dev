const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  problem: { type: String, required: true },
  errorCode: { type: String },
  notes: { type: String },

  media: [
    {
      url: { type: String, required: true },
      type: { type: String, enum: ["image", "video"], required: true }
    }
  ],

  ticketType: {
    type: String,
    enum: ["General Check Up", "Full Machine Service"],
    required: true
  },

  status: {
    type: String,
    enum: ["Pending", "In Progress", "Resolved", "Rejected"],
    default: "Pending"
  },

  isActive: { type: Boolean, default: true },

  machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine", required: true },

  processor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },   // customer company (from token)
  organisation: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true } // assigned org

}, { timestamps: true });

module.exports = mongoose.model("Ticket", ticketSchema);
