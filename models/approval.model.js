const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    type: { type: String, required: true },
    // leave | overtime | workPermission | shiftChange | machineRequest | other

    details: {}, // dynamic object (each type has different fields)

    attachments: [{
      type: String
    }], // array of file paths

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending"
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Approval", approvalSchema);
