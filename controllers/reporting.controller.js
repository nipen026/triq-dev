const Reporting = require("../models/reporting.model");
const EmployeeCustomer = require("../models/employeeCustomer.model");

exports.createReporting = async (req, res) => {
    try {
        const user = req.user;

        const {
            employeeCustomer,
            type,
            task,
            nextFollowUpDate,
            nextFollowUpTime,
            remark
        } = req.body;

        const reporting = await Reporting.create({
            employee: user.id,
            employeeCustomer,
            type,
            task,
            nextFollowUpDate,
            nextFollowUpTime,
            remark,
        });

        return res.status(201).json({
            status: true,
            message: "Reporting created successfully",
            data: reporting
        });

    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getAllReporting = async (req, res) => {
    try {
        const user = req.user;
        const { search = "", page = 1, limit = 20 } = req.query;

        const skip = (page - 1) * limit;

        const query = {
            employee: user.id,
        };

        if (search) {
            query.$or = [
                { type: { $regex: search, $options: "i" } },
                { task: { $regex: search, $options: "i" } },
                { remark: { $regex: search, $options: "i" } },
            ];
        }

        const data = await Reporting.find(query)
            .populate("employee", "name email")
            .populate("employeeCustomer", "customerName phones")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Reporting.countDocuments(query);

        return res.status(200).json({
            status: true,
            total,
            page: Number(page),
            limit: Number(limit),
            data
        });

    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
exports.searchEmployeeCustomers = async (req, res) => {
    try {
        const { search = "" } = req.query;

        const customers = await EmployeeCustomer.find({
            customerName: { $regex: search, $options: "i" }
        }).sort({ createdAt: -1 });

        res.json({ status: true, data: customers });

    } catch (error) {
        res.status(500).json({ status: false, message: error.message });
    }
};
