const mongoose = require("mongoose");

const employeeCustomerSchema = new mongoose.Schema({
    customerName: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    phones: [
        {
            type: String
        }
    ],

    emails: [{ type: String }],

    addressLine1: { type: String },
    addressLine2: { type: String },

    city: { type: String },
    state: { type: String },
    country: { type: String },
    pincode: { type: String },

    directorName: { type: String },

}, { timestamps: true });

module.exports = mongoose.model("EmployeeCustomer", employeeCustomerSchema);
