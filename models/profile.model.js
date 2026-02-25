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
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    unitName: String,
    designation: String,
    organizationName: String,
    isSameAddress: { type: Boolean, default: false },
    chatLanguage:{type:String,default:'en'},
    AutoChatLanguage:{type:Boolean,default:true},
    corporateAddress: AddressSchema,
    factoryAddress: AddressSchema,
    profileImage: {
      type: String, // store URL or filename
      default: ""   // keep blank if not uploaded
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", ProfileSchema);
