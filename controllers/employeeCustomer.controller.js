const EmployeeCustomer = require("../models/employeeCustomer.model");

exports.createCustomer = async (req, res) => {
    const user = req.user;
    try {
        const {
            customerName,
            phones,
            emails,
            addressLine1,
            addressLine2,
            city,
            state,
            country,
            pincode,
            directorName
        } = req.body;

        // const parsedPhones = phones ? JSON.parse(phones) : [];
        // const parsedEmails = emails ? JSON.parse(emails) : [];

        const customer = await EmployeeCustomer.create({
            customerName,
            phones,
            emails,
            addressLine1,
            addressLine2,
            city,
            state,
            country,
            pincode,
            directorName,
            user: user.id
        });

        res.json({
            status: 1,
            message: "Customer created successfully",
            data: customer
        });
    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
exports.getAllCustomers = async (req, res) => {
    const user = req.user;

    try {
        const { search = "", page = 1, limit = 20 } = req.query;

        const query = {
            user: user.id,  // <-- Correct place
            customerName: {
                $regex: search,
                $options: "i"
            }
        };

        const customers = await EmployeeCustomer.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            status: 1,
            data: customers
        });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};

exports.getCustomerById = async (req, res) => {
    try {
        const customer = await EmployeeCustomer.findById(req.params.id);

        if (!customer) {
            return res.status(404).json({ status: 0, message: "Customer not found" });
        }

        res.json({ status: 1, data: customer });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};

exports.updateCustomer = async (req, res) => {
    const user = req.user;
    try {
        const {
            customerName,
            phones,
            emails,
            addressLine1,
            addressLine2,
            city,
            state,
            country,
            pincode,
            directorName
        } = req.body;

        const parsedPhones = phones ? JSON.parse(phones) : [];
        const parsedEmails = emails ? JSON.parse(emails) : [];

        const updateData = {
            customerName,
            phones: parsedPhones,
            emails: parsedEmails,
            addressLine1,
            addressLine2,
            city,
            state,
            country,
            pincode,
            directorName,
            user: user.id
        };

        const updated = await EmployeeCustomer.findByIdAndUpdate(req.params.id, updateData, { new: true });

        res.json({
            status: 1,
            message: "Employee Customer updated successfully",
            data: updated
        });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
exports.deleteCustomer = async (req, res) => {

    try {
        await EmployeeCustomer.findByIdAndDelete(req.params.id);

        res.json({
            status: 1,
            message: "Customer deleted successfully"
        });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
