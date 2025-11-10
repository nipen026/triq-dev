const Employee = require("../models/employee.model");
const Department = require("../models/department.model");
const Designation = require("../models/designation.model");
const User = require("../models/user.model");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Role = require('../models/role.model')
// ➕ CREATE Employee
exports.addEmployee = async (req, res) => {
    try {
        const currentUser = req.user;
        const {
            name,
            phone,
            email,
            bloodGroup,
            employeeId,
            department,
            designation,
            country,
            area,
            reportTo,
            employeeType,
            shiftTiming,
            joiningDate,
        } = req.body;

        // ✅ Validate required fields
        if (!name || !phone || !employeeId || !department || !designation) {
            return res.status(400).json({ status: 0, message: "Missing required fields" });
        }

        // ✅ Validate Department
        const deptExists = await Department.findById(department);
        if (!deptExists) return res.status(404).json({ status: 0, message: "Department not found" });

        // ✅ Validate Designation
        const desigExists = await Designation.findById(designation);
        if (!desigExists) return res.status(404).json({ status: 0, message: "Designation not found" });

        // ✅ Check for duplicate employeeId
        const existingEmployee = await Employee.findOne({ employeeId });
        if (existingEmployee) {
            return res.status(400).json({ status: 0, message: `Employee ID ${employeeId} already exists` });
        }

        // ✅ Handle file upload (profilePhoto)
        let profilePhotoPath = null;
        if (req.file) {
            profilePhotoPath = `/uploads/employee/profilephoto/${req.file.filename}`; // accessible URL
        }

        // ✅ Create new Employee
        const newEmployee = await Employee.create({
            name,
            phone,
            email,
            bloodGroup,
            profilePhoto: profilePhotoPath,
            employeeId,
            department,
            designation,
            country,
            area,
            reportTo,
            employeeType,
            shiftTiming,
            joiningDate,
            user: currentUser.id,
        });

        // ✅ Create random password
        const plainPassword = crypto.randomBytes(6).toString("hex");
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // ✅ Find or create "employee" role
        let employeeRole = await Role.findOne({ name: "employee" });
        if (!employeeRole) employeeRole = await Role.create({ name: "employee" });

        // ✅ Create linked user account
        const userAccount = await User.create({
            fullName: newEmployee.name,
            email: newEmployee.email,
            password: hashedPassword,
            phone: newEmployee.phone,
            isEmailVerified: false,
            isPhoneVerified: false,
            emailOTP: "123456",
            countryCode: "+91",
            roles: [employeeRole._id],
        });

        // ✅ Populate department & designation
        const populatedEmployee = await Employee.findById(newEmployee._id)
            .populate("department", "name")
            .populate("designation", "name");

        return res.status(201).json({
            status: 1,
            message: "Employee created successfully",
            data: populatedEmployee,
            credentials: {
                email: userAccount.email,
                password: plainPassword,
            },
        });
    } catch (error) {
        console.error("❌ Error adding employee:", error);
        return res.status(500).json({ status: 0, message: "Server error", error: error.message });
    }
};



// 📋 GET All Employees (with department & designation populated)
exports.getAllEmployees = async (req, res) => {
    try {
        const user = req.user;
        const employees = await Employee.find({ user: user.id })
            .populate("department", "name")
            .populate("designation", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({ status: 1, data: employees });
    } catch (error) {
        console.error("❌ Error fetching employees:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};



// 🔍 SEARCH Employee (by name, employeeId, department, designation)
exports.searchEmployee = async (req, res) => {
    try {
        const { q } = req.query;
        // const user = req.user;

        const employees = await Employee.find({
            // user: user.id,
            $or: [
                { name: new RegExp(q, "i") },
                { email: new RegExp(q, "i") },
                { phone: new RegExp(q, "i") },
            ],
        })
            .populate("department", "name")
            .populate("designation", "name");

        return res.status(200).json({ status: 1, data: employees });
    } catch (error) {
        console.error("❌ Error searching employee:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};


exports.updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            phone,
            email,
            bloodGroup,
            employeeId,
            department,
            designation,
            country,
            area,
            reportTo,
            employeeType,
            shiftTiming,
            joiningDate,
        } = req.body;

        // ✅ Build update object dynamically
        const updateData = {
            name,
            phone,
            email,
            bloodGroup,
            employeeId,
            department,
            designation,
            country,
            area,
            reportTo,
            employeeType,
            shiftTiming,
            joiningDate,
        };

        // ✅ Handle optional file upload
        if (req.file) {
            updateData.profilePhoto = `/uploads/profilePhotos/${req.file.filename}`;
        }

        // ✅ Validate department (if provided)
        if (department) {
            const deptExists = await Department.findById(department);
            if (!deptExists) {
                return res.status(404).json({ status: 0, message: "Department not found" });
            }
        }

        // ✅ Validate designation (if provided)
        if (designation) {
            const desigExists = await Designation.findById(designation);
            if (!desigExists) {
                return res.status(404).json({ status: 0, message: "Designation not found" });
            }
        }

        // ✅ Prevent duplicate employeeId (if changed)
        if (employeeId) {
            const existing = await Employee.findOne({ employeeId, _id: { $ne: id } });
            if (existing) {
                return res.status(400).json({ status: 0, message: "Employee ID already in use" });
            }
        }

        // ✅ Update employee
        const updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, {
            new: true,
        })
            .populate("department", "name")
            .populate("designation", "name");

        if (!updatedEmployee) {
            return res.status(404).json({ status: 0, message: "Employee not found" });
        }

        return res.status(200).json({
            status: 1,
            message: "Employee updated successfully",
            data: updatedEmployee,
        });
    } catch (error) {
        console.error("❌ Error updating employee:", error);
        return res.status(500).json({ status: 0, message: "Server error", error: error.message });
    }
};




// ❌ DELETE Employee
exports.deleteEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Employee.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ status: 0, message: "Employee not found" });
        }

        return res.status(200).json({ status: 1, message: "Employee deleted successfully" });
    } catch (error) {
        console.error("❌ Error deleting employee:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};



// 👤 GET Employee By ID (populated)
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findById(req.params.id)
            .populate("department", "name")
            .populate("designation", "name");

        if (!employee) {
            return res.status(404).json({ status: 0, message: "Employee not found" });
        }
        const qrCode = await QRCode.toDataURL(employee.id);
        const obj = employee.toObject();
        obj.qrCode = qrCode
        return res.status(200).json({ status: 1, data: obj });
    } catch (error) {
        console.error("❌ Error fetching employee:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};
