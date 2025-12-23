const mongoose = require("mongoose");

const verifyCodeSchema = new mongoose.Schema({
  email: { type: String },
  phone: { type: String },
  code: { type: String, required: true },
  type: { type: String, enum: ["email", "phone"], required: true },
  verificationId: String,
  countryCode: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // auto delete after 10 minutes
  }
});

// Optional but recommended: fast lookup
verifyCodeSchema.index({ email: 1, createdAt: -1 });
verifyCodeSchema.index({ phone: 1, createdAt: -1 });

module.exports = mongoose.model("VerifyCode", verifyCodeSchema);
