const Approval = require("../models/approval.model");
const Employee = require("../models/employee.model");

exports.createApproval = async (req, res) => {
    try {
        const userId = req.user.id;

        // Check if user is employee
        const employee = await Employee.findOne({ user: userId });
        if (!employee) {
            return res.status(403).json({
                status: 0,
                message: "Only employees can submit approvals"
            });
        }

        const { type, details } = req.body;

        if (!type) {
            return res.status(400).json({ status: 0, message: "Approval type required" });
        }
        let attechament = null;
        if (req.file) {
            attechament = `/uploads/approval/${req.file.filename}`;
        }
        const parseData = details ? JSON.parse(details) : {};
        const approval = await Approval.create({
            user: userId,
            type,
            details: parseData,
            attachments: attechament
        });

        res.json({
            status: 1,
            message: "Approval submitted successfully",
            data: approval
        });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
exports.getMyApprovals = async (req, res) => {
    try {
        const approvals = await Approval.find({ user: req.user.id })
            .sort({ createdAt: -1 });

        res.json({ status: 1, data: approvals });
    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};
exports.updateApprovalStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // Approved | Rejected
        console.log(id, status, "id,status");

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ status: 0, message: "Invalid status" });
        }

        // Check role


        const approval = await Approval.findByIdAndUpdate(id, { status }, { new: true });
        console.log(approval, "approval");

        res.json({ status: 1, data: approval });

    } catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }
};

exports.getAllApprovalMachines = async (req, res) => {
    try {
        const machineData = [{
            "_id": "68e494d3a5636fb13ca2f2ae",
            "machineName": "smart",
            "modelNumber": "31rt5",
            "machine_type": "Fully Automatic",
            "status": "Available",
            "remarks": "no remark",
            "warranty": {
                "purchaseDate": "2025-10-01T00:00:00.000Z",
                "installationDate": "2025-10-01T00:00:00.000Z",
                "startDate": "2025-10-01T00:00:00.000Z",
                "expirationDate": "2025-10-31T00:00:00.000Z",
                "status": "In warranty",
                "invoiceNo": "5746"
            }
        }, {
            "_id": "68e494d3a5636fb13ca2f2ae",
            "machineName": "smart",
            "modelNumber": "31rt5",
            "machine_type": "Fully Automatic",
            "status": "Available",
            "remarks": "no remark",
            "warranty": {
                "purchaseDate": "2025-10-01T00:00:00.000Z",
                "installationDate": "2025-10-01T00:00:00.000Z",
                "startDate": "2025-10-01T00:00:00.000Z",
                "expirationDate": "2025-10-31T00:00:00.000Z",
                "status": "In warranty",
                "invoiceNo": "5746"
            }
        }];
        res.json({ status: 1, data: machineData });
    }
    catch (err) {
        res.status(500).json({ status: 0, error: err.message });
    }

}