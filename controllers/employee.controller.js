const Employee = require("../models/employee.model");
const Department = require("../models/department.model");
const Designation = require("../models/designation.model");
const EmployeePermission = require("../models/employeePermission.model");
const User = require("../models/user.model");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Role = require('../models/role.model')
// ➕ CREATE Employee
// ➕ CREATE Employee

// ✅ Helper Function (No res here)
exports.setEmployeePermissions = async (employeeId, permissions) => {
    try {
        if (!employeeId) throw new Error("Employee ID is required");

        // ✅ Ensure employee exists
        const employee = await Employee.findById(employeeId);
        if (!employee) throw new Error("Employee not found");

        // ✅ Upsert permissions
        const updatedPermission = await EmployeePermission.findOneAndUpdate(
            { employee: employeeId },
            { employee: employeeId, permissions },
            { new: true, upsert: true }
        );

        return updatedPermission;
    } catch (error) {
        console.error("❌ Error setting permissions:", error);
        throw new Error(error.message);
    }
};

// ✅ Controller
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
            permissions,
        } = req.body;

        // ✅ Parse nested JSON fields if they come as strings
        let personalAddress = req.body.personalAddress;
        let emergencyContact = req.body.emergencyContact;

        try {
            if (typeof personalAddress === "string")
                personalAddress = JSON.parse(personalAddress);
        } catch (e) {
            console.warn("⚠️ Invalid JSON in personalAddress", e.message);
            personalAddress = {};
        }

        try {
            if (typeof emergencyContact === "string")
                emergencyContact = JSON.parse(emergencyContact);
        } catch (e) {
            console.warn("⚠️ Invalid JSON in emergencyContact", e.message);
            emergencyContact = {};
        }

        // ✅ Validate required fields
        if (!name || !phone || !employeeId || !department || !designation) {
            return res.status(400).json({
                status: 0,
                message: "Missing required fields",
            });
        }

        // ✅ Validate Department
        const deptExists = await Department.findById(department);
        if (!deptExists)
            return res
                .status(404)
                .json({ status: 0, message: "Department not found" });

        // ✅ Validate Designation
        const desigExists = await Designation.findById(designation);
        if (!desigExists)
            return res
                .status(404)
                .json({ status: 0, message: "Designation not found" });

        // ✅ Check duplicate employeeId
        const existingEmployee = await Employee.findOne({ employeeId });
        if (existingEmployee) {
            return res.status(400).json({
                status: 0,
                message: `Employee ID ${employeeId} already exists`,
            });
        }

        // ✅ Handle profile photo
        let profilePhotoPath = null;
        if (req.file) {
            profilePhotoPath = `/uploads/employee/profilephoto/${req.file.filename}`;
        }

        // ✅ Create Employee
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
            personalAddress,
            emergencyContact,
            user: currentUser.id,
        });

        // ✅ Create random password for login
        const plainPassword = crypto.randomBytes(6).toString("hex");
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // ✅ Ensure "employee" role exists
        let employeeRole = await Role.findOne({ name: "employee" });
        if (!employeeRole)
            employeeRole = await Role.create({ name: "employee" });

        // ✅ Create User account linked to Employee
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

        // ✅ Set permissions if provided
        if (permissions) {
            const permissionData = JSON.parse(permissions)
            await exports.setEmployeePermissions(newEmployee._id, permissionData);
        }

        // ✅ Populate and return
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
        return res.status(500).json({
            status: 0,
            message: "Server error",
            error: error.message,
        });
    }
};




// 📋 GET All Employees (with department & designation populated)
exports.getAllEmployees = async (req, res) => {
    try {
        const user = req.user;

        // ✅ Fetch all employees for this user
        const employees = await Employee.find({ user: user.id })
            .populate("department", "name")
            .populate("designation", "name")
            .sort({ createdAt: -1 });

        // ✅ Fetch all permissions for these employees in one go
        const employeeIds = employees.map(emp => emp._id);
        const permissions = await EmployeePermission.find({ employee: { $in: employeeIds } });

        // ✅ Map permissions by employeeId for quick lookup
        const permissionMap = {};
        permissions.forEach(p => {
            permissionMap[p.employee.toString()] = p.permissions;
        });

        // ✅ Attach permissions to each employee
        const formatted = employees.map(emp => {
            const obj = emp.toObject();
            obj.permissions = permissionMap[emp._id.toString()] || {};
            return obj;
        });

        return res.status(200).json({
            status: 1,
            message: "Employees fetched successfully",
            data: formatted,
        });
    } catch (error) {
        console.error("❌ Error fetching employees:", error);
        return res.status(500).json({
            status: 0,
            message: "Server error",
            error: error.message,
        });
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
        let personalAddress = req.body.personalAddress;
        let emergencyContact = req.body.emergencyContact;

        try {
            if (typeof personalAddress === "string") {
                personalAddress = JSON.parse(personalAddress);
            }
        } catch (e) {
            console.warn("⚠️ Invalid JSON in personalAddress", e.message);
            personalAddress = {};
        }

        try {
            if (typeof emergencyContact === "string") {
                emergencyContact = JSON.parse(emergencyContact);
            }
        } catch (e) {
            console.warn("⚠️ Invalid JSON in emergencyContact", e.message);
            emergencyContact = {};
        }
        if (req.file) {
            updateData.profilePhoto = `/uploads/profilePhotos/${req.file.filename}`;
        }

        if (department) {
            const deptExists = await Department.findById(department);
            if (!deptExists)
                return res.status(404).json({ status: 0, message: "Department not found" });
        }

        if (designation) {
            const desigExists = await Designation.findById(designation);
            if (!desigExists)
                return res.status(404).json({ status: 0, message: "Designation not found" });
        }

        if (employeeId) {
            const existing = await Employee.findOne({ employeeId, _id: { $ne: id } });
            if (existing)
                return res.status(400).json({ status: 0, message: "Employee ID already in use" });
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, {
            new: true,
        })
            .populate("department", "name")
            .populate("designation", "name");

        if (!updatedEmployee)
            return res.status(404).json({ status: 0, message: "Employee not found" });

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
        const employePermissionData = await EmployeePermission.findOne({ employee: employee._id });
        const qrCode = await QRCode.toDataURL(employee.id);
        const obj = employee.toObject();
        obj.qrCode = qrCode;
        obj.permissions = employePermissionData
        return res.status(200).json({ status: 1, data: obj });
    } catch (error) {
        console.error("❌ Error fetching employee:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
    }
};
exports.getEmployeeHierarchy = async (req, res) => {
    try {
        const { departmentId } = req.params;

        // Fetch all employees in that department
        const employees = await Employee.find({ department: departmentId })
            .populate("department", "name")
            .populate("designation", "name");

        // Convert to plain objects
        const employeeList = employees.map((emp) => emp.toObject());

        // Build a map using employeeId
        const employeeMap = {};
        employeeList.forEach((emp) => {
            emp.children = [];
            employeeMap[emp.employeeId] = emp;
        });

        // Build hierarchy
        const roots = [];
        employeeList.forEach((emp) => {
            const managerId = emp.reportTo?.trim();
            if (managerId && employeeMap[managerId]) {
                employeeMap[managerId].children.push(emp);
            } else {
                // Top-level (no manager found)
                roots.push(emp);
            }
        });

        // Optional: sort designations or children alphabetically
        const sortTree = (nodes) => {
            nodes.sort((a, b) => a.name.localeCompare(b.name));
            nodes.forEach((n) => sortTree(n.children));
        };
        sortTree(roots);

        return res.status(200).json({
            status: 1,
            message: "Hierarchy built successfully",
            data: roots,
        });
    } catch (error) {
        console.error("❌ Error building hierarchy:", error);
        return res.status(500).json({
            status: 0,
            message: "Server error",
            error: error.message,
        });
    }
};



// 👀 Get Employee Permission
exports.getEmployeePermissions = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const permissions = await EmployeePermission.findOne({ employee: employeeId }).populate(
            "employee",
            "name employeeId department designation"
        );

        if (!permissions)
            return res
                .status(404)
                .json({ status: 0, message: "No permissions found for this employee" });

        res.status(200).json({ status: 1, data: permissions });
    } catch (error) {
        console.error("❌ Error getting permissions:", error);
        res.status(500).json({
            status: 0,
            message: "Server error",
            error: error.message,
        });
    }
};