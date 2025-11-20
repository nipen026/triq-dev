const mongoose = require("mongoose");

const expenseSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employeeCustomer: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeCustomer" },
    // Basic Information
    dateOfExpense: { type: Date, required: true },
    typeOfJob: { type: String, enum: ["Sales", "Service", "Technical", "Support"], required: true },
    expenseCategory: { type: String, required: true },
    location: {
        city: String,
        state: String,
        country: String,
    },

    // Amount
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },

    // File Uploads (multiple receipts)
    attachments: [
        { type: String }
    ],

    notes: { type: String },

    // Status Handling
    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },
}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);
