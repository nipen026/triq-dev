const mongoose = require("mongoose");

const reportingSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employeeCustomer: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeCustomer" },

    type: { type: String, required: true },   // Daily Reporting / Weekly / Monthly
    task: { type: String, required: true },   // Call / Visit / Meeting

    nextFollowUpDate: { type: String },
    nextFollowUpTime: { type: String },

    remark: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Reporting", reportingSchema);
