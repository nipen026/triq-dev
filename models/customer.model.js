const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  customerName: { type: String, required: true },
  email: { type: String },
  contactPerson: { type: String },
  designation: { type: String },
  assignmentStatus: {
  type: String,
  enum: ["Pending", "Assigned", "Rejected"],
  default: "Pending"
},
  countryOrigin: { type: String, default: 'US' },
  organization:{ type: mongoose.Schema.Types.ObjectId, ref: "User" },
  users: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  machines: [
    {
      machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
      purchaseDate: { type: Date },
      installationDate: { type: Date },
      warrantyStart: { type: Date },
      warrantyEnd: { type: Date },
      warrantyStatus: { type: String, enum: ["In warranty", "Out Of Warranty"], default: "In warranty" },
      invoiceContractNo: { type: String }
    }
  ],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Customer", customerSchema);
