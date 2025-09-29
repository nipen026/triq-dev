// models/profile.model.js
const mongoose = require("mongoose");

const AddressSchema = new mongoose.Schema({
  addressLine1: String,
  addressLine2: String,
  city: String,
  state: String,
  country: String,
  pincode: String
});

const ProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User"},

    unitName: String,
    designation: String,
    organizationName: String,
    // personal info duplicates allowed (or you can pull from User directly)

    corporateAddress: AddressSchema,
    factoryAddress: AddressSchema
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", ProfileSchema);
