const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
  phone: String,
  countryCode: String,
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: "Role" }],
  // organizationType:String,
  emailOTP: String,
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", UserSchema);
