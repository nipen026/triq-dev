const Employee = require("../models/employee.model");
const Expense = require("../models/expense.model");
const User = require("../models/user.model");

exports.createExpense = async (req, res) => {
    try {
        const userId = req.user.id;

        const {
            employeeName,
            employeeId,
            department,
            designation,
            assignedArea,
            reportTo,
            dateOfExpense,
            typeOfJob,
            employeeCustomer,
            city,
            state,
            country,
            expenses
        } = req.body;

        // Safely parse expenses array
        let parsedExpenses = [];
        try {
            if (typeof expenses === "object") {
                parsedExpenses = expenses;
            } else {
                parsedExpenses = JSON.parse(expenses); // frontend sends stringified array
                if (!Array.isArray(parsedExpenses)) {
                    throw new Error("Expenses must be an array");
                }
            }
        } catch (err) {
            return res.status(400).json({
                status: 0,
                error: "Invalid expense format. Must be JSON stringified array."
            });
        }

        // Attach uploaded files to each expense row
        if (req.files) {
            for (let i = 0; i < parsedExpenses.length; i++) {
                const key = `attachments_${i}`;
                parsedExpenses[i].attachments = [];

                if (req.files[key]) {
                    parsedExpenses[i].attachments = req.files[key].map(file =>
                        `/uploads/expense/${file.filename}`
                    );
                }
            }
        }

        // CREATE DATABASE ENTRY
        const expense = await Expense.create({
            employee: userId,
            employeeCustomer,
            employeeName,
            employeeId,
            department,
            designation,
            assignedArea,
            reportTo,
            dateOfExpense,
            typeOfJob,
            location: { city, state, country },
            expenses: parsedExpenses
        });

        return res.status(201).json({
            status: 1,
            message: "Expense submitted successfully",
            data: expense
        });

    } catch (error) {
        return res.status(500).json({ status: 0, error: error.message });
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
