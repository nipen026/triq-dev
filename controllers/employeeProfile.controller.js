const { format } = require("libphonenumber-js");
const Employee = require("../models/employee.model");
const Profile = require("../models/profile.model");
const Designation = require("../models/designation.model");
exports.getEmployeeProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch Employee & Profile
        const employee = await Employee.findOne({ user: userId }).populate("department").populate("designation");
        const profile = await Profile.findOne({ user: userId });
        if (!employee && !profile) {
            return res.status(404).json({
                status: 0,
                message: "Employee profile not found"
            });
        } 
        const formatted = employee.toObject();
        formatted.corporateAddress = profile?.corporateAddress || {};
        formatted.factoryAddress = profile?.factoryAddress || {};
        return res.json({
            status: 1,
            message: "Employee Profile Fetched Successfully",
            data: {
                userId,
                employee: formatted || {},
                // profile: profile || {},
                // personalAddress: employee?.personalAddress || {},
                // emergencyContact: employee?.emergencyContact || {},
                // corporateAddress: profile?.corporateAddress || {},
                // factoryAddress: profile?.factoryAddress || {},
                // postalAddress: employee?.postalAddress || {}
            }
        });

    } catch (err) {
        return res.status(500).json({
            status: 0,
            message: "Server Error",
            error: err.message
        });
    }
};
exports.updateEmployeeProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const body = req.body;
        
        // -------------------------
        // 1️⃣ Update Employee Model
        // -------------------------
        const employeeData = {
            name: body.name,
            phone: body.phone,
            email: body.email,
            bloodGroup: body.bloodGroup,
            employeeId: body.employeeId,
            department: body.department,
            designation: body.designation,
            country: body.country,
            area: body.area,
            reportTo: body.reportTo,
            employeeType: body.employeeType,
            shiftTiming: body.shiftTiming,
            joiningDate: body.joiningDate,
            personalAddress: body.personalAddress,
            emergencyContact: body.emergencyContact,
            postalAddress: body.postalAddress,
            user: userId
        };

        const employee = await Employee.findOneAndUpdate(
            { user: userId },
            { $set: employeeData },
            { new: true, upsert: true }
        );

        // -------------------------
        // 2️⃣ Update Profile Model
        // -------------------------
        const profileData = {
            user: userId,
            unitName: body.unitName || "",
            designation: body.designationName || "",
            organizationName: body.organizationName || "",
            corporateAddress: body.corporateAddress,
            factoryAddress: body.factoryAddress
        };

        const profile = await Profile.findOneAndUpdate(
            { user: userId },
            { $set: profileData },
            { new: true, upsert: true }
        );

        return res.json({
            status: 1,
            message: "Employee Profile Updated Successfully",
            data: {
                employee,
                profile
            }
        });

    } catch (err) {
        return res.status(500).json({
            status: 0,
            message: "Server Error",
            error: err.message
        });
    }
};