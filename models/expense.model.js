const mongoose = require("mongoose");

const expenseItemSchema = new mongoose.Schema({
    expenseCategory: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    attachments: [String],
    notes: { type: String }
});

const expenseSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    employeeCustomer: { type: mongoose.Schema.Types.ObjectId, ref: "EmployeeCustomer" },
    employeeName: String,
    employeeId:String,
    department:{ type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    designation:{ type: mongoose.Schema.Types.ObjectId, ref: "Designation" },
    assignedArea:String,
    reportTo :String,
    // Basic Information
    dateOfExpense: { type: Date, required: true },
    typeOfJob: { type: String, enum: ["Sales", "Service", "Technical", "Support"], required: true },

    location: {
        city: String,
        state: String,
        country: String,
    },

    // MULTIPLE EXPENSE ROWS
    expenses: [expenseItemSchema],

    status: {
        type: String,
        enum: ["Pending", "Approved", "Rejected"],
        default: "Pending"
    },

}, { timestamps: true });

module.exports = mongoose.model("Expense", expenseSchema);
