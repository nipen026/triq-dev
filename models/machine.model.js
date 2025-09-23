const mongoose = require("mongoose");

const machineSchema = new mongoose.Schema({
  machineName: { type: String, required: true },      // "#1234 - Machine Name"
  modelNumber: { type: String, required: true },      // "#1234"
  // serialNumber: { type: String },       // Unique SN
  machine_type: { 
    type: String,
    required: true 
  },
  user:{ type: mongoose.Schema.Types.ObjectId, ref: "User" },
  processingDimensions: {
    maxHeight: Number,
    maxWidth: Number,
    minHeight: Number,  
    minWidth: Number,
    thickness: String,       // "3 - 25"
    maxSpeed: Number,        // m/min
  },

  totalPower: Number,        // kW
  manualsLink: String,       // Operating Manuals/Docs
  notes: String,             // Special Instructions
  status: { 
    type: String, 
    enum: ["Available", "Assigned", "Under Maintenance"], 
    default: "Available" 
  },
  isActive: { type: Boolean, default: true },
  remarks: String

}, { timestamps: true });

module.exports = mongoose.model("Machine", machineSchema);
