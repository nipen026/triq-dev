const mongoose = require("mongoose");

const verifyCodeSchema = new mongoose.Schema({
  email: { type: String },
  phone: { type: String },
  code: { type: String, required: true },
  type: { type: String, enum: ["email", "phone"], required: true },
  createdAt: { type: Date, default: Date.now, expires: 3600 } // auto-delete after 1 hour
});

// Ensure one OTP per email/phone
verifyCodeSchema.index({ email: 1, type: 1 }, { unique: true, sparse: true });
verifyCodeSchema.index({ phone: 1, type: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("VerifyCode", verifyCodeSchema);
