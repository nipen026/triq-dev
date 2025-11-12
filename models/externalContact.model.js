// models/externalContact.model.js
const mongoose = require("mongoose");

const externalContactSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    linkedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" }, // 🔹 New
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExternalContact", externalContactSchema);
