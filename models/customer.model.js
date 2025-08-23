const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  organizationName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  email: { type: String },
  contactPerson: { type: String },
  designation: { type: String },

  machines: [
    {
      machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
      purchaseDate: { type: Date },
      installationDate: { type: Date },
      warrantyStart: { type: Date },
      warrantyEnd: { type: Date },
      warrantyStatus: { type: String, enum: ["Active", "Expired", "Pending"], default: "Pending" },
      invoiceContractNo: { type: String }
    }
  ],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Customer", customerSchema);
