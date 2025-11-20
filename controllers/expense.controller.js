const Employee = require("../models/employee.model");
const Expense = require("../models/expense.model");
const User = require("../models/user.model");

exports.createExpense = async (req, res) => {
    try {
        const userId = req.user.id;
     

       

        const {
            dateOfExpense,
            typeOfJob,
            expenseCategory,
            city,
            state,
            country,
            amount,
            currency,
            notes,
            employeeCustomer,
        } = req.body;

        // Multiple file upload
        let attachments = [];
        if (req.files && req.files.length > 0) {
            attachments = req.files.map(f => `/uploads/expenses/${f.filename}`);
        }

        const expense = await Expense.create({
            employee: userId,
            employeeCustomer,
            dateOfExpense,
            typeOfJob,
            expenseCategory,
            location: { city, state, country },
            amount,
            currency,
            attachments,
            notes
        });

        res.json({
            status: 1,
            message: "Expense submitted successfully",
            data: expense
        });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
exports.getAllExpenses = async (req, res) => {
    try {
        const { page = 1, limit = 20, status } = req.query;
        const query = {};

        if (status) query.status = status;

        const expenses = await Expense.find(query)
            .populate("employee").populate("employeeCustomer")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit));

        res.json({
            status: 1,
            data: expenses
        });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
exports.getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (!expense) {
            return res.status(404).json({ status: 0, message: "Expense not found" });
        }

        res.json({ status: 1, data: expense });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
exports.updateExpense = async (req, res) => {
    try {
        let expense = await Expense.findById(req.params.id);
        if (!expense) {
            return res.status(404).json({ status: 0, message: "Not found" });
        }

        let attachments = expense.attachments;

        if (req.files && req.files.length > 0) {
            const newFiles = req.files.map(f => `/uploads/expenses/${f.filename}`);
            attachments = [...attachments, ...newFiles];
        }

        const updateData = {
            ...req.body,
            attachments
        };

        expense = await Expense.findByIdAndUpdate(req.params.id, updateData, { new: true });

        res.json({ status: 1, message: "Updated successfully", data: expense });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
exports.deleteExpense = async (req, res) => {
    try {
        await Expense.findByIdAndDelete(req.params.id);

        res.json({
            status: 1,
            message: "Expense deleted successfully"
        });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
