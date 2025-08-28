const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  email: { type: String },
  contactPerson: { type: String },
  designation: { type: String },
  countryOrigin: { type: String, default: 'US' },
  users: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  machines: [
    {
      machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
      purchaseDate: { type: Date },
      installationDate: { type: Date },
      warrantyStart: { type: Date },
      warrantyEnd: { type: Date },
      warrantyStatus: { type: String, enum: ["Active", "Expired", "Pending", "Out Of Warranty"], default: "Pending" },
      invoiceContractNo: { type: String }
    }
  ],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Customer", customerSchema);
