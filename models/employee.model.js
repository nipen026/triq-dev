const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    bloodGroup: { type: String },
    profilePhoto: { type: String },
    employeeId: { type: String, required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: "Designation" },
    country: { type: String },
    area: { type: String },
    reportTo: { type: String },
    employeeType: { type: String },
    shiftTiming: { type: String },
    joiningDate: { type: Date },
    isActive: { type: Boolean,default:true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
