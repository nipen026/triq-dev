const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema({
  problem: { type: String},
  errorCode: { type: String },
  notes: { type: String },

  media: [
    {
      url: { type: String },
      type: { type: String, enum: ["image", "video"] }
    }
  ],

  ticketType: {
    type: String,
    enum: ["General Check Up", "Full Machine Service"],
  },
  type:String,
  status: {
    type: String,
    enum: ["Active", "In Progress", "Resolved", "Rejected"],
    default: "Active"
  },

  isActive: { type: Boolean, default: true },

  machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine",  },

  processor: { type: mongoose.Schema.Types.ObjectId, ref: "User"  },   // customer company (from token)
  organisation: { type: mongoose.Schema.Types.ObjectId, ref: "User" } ,
  engineerRemark:String

}, { timestamps: true });

module.exports = mongoose.model("Ticket", ticketSchema);
