const mongoose = require("mongoose");
const AddressSchema = new mongoose.Schema({
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  country: String,
  pincode: String
});
const emergencySchema = new mongoose.Schema({
  emergencyContactName:String,
  emergencyContactPhone:String,
  emergencyContactEmail:String

})
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
    machine: { type: mongoose.Schema.Types.ObjectId, ref: "Machine" },
    country: { type: String },
    area: { type: String },
    reportTo: { type: String },
    employeeType: { type: String },
    shiftTiming: { type: String },
    joiningDate: { type: Date },
    isActive: { type: Boolean,default:true },
    personalAddress:AddressSchema,
    emergencyContact:emergencySchema,
    postalAddress:AddressSchema,
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Employee", employeeSchema);
