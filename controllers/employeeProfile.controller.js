const { format } = require("libphonenumber-js");
const Employee = require("../models/employee.model");
const User = require("../models/user.model");
const Profile = require("../models/profile.model");
const Designation = require("../models/designation.model");
const calculateProfileCompletion = (employee, profile) => {
    let total = 0;
    let filled = 0;

    const fields = [
        employee?.name,
        employee?.phone,
        employee?.email,
        employee?.bloodGroup,
        employee?.employeeId,
        employee?.department,
        employee?.designation,
        employee?.profilePhoto,
        employee?.country,
        employee?.area,
        employee?.joiningDate,
        employee?.personalAddress?.addressLine1,
        employee?.emergencyContact?.emergencyContactName,
        employee?.postalAddress?.addressLine1,

        profile?.unitName,
        profile?.organizationName,
        profile?.corporateAddress?.addressLine1,
        profile?.factoryAddress?.addressLine1,
    ];

    total = fields.length;

    fields.forEach((f) => {
        if (f !== undefined && f !== null && f !== "") {
            filled++;
        }
    });

    return Math.round((filled / total) * 100);
};
exports.getEmployeeProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const employee = await Employee.findOne({ linkedUser: userId })
            .populate("department")
            .populate("designation").populate('user');
        console.log(employee,"employee");
        const profile = await Profile.findOne({ user: userId });

        if (!employee && !profile) {
            return res.status(404).json({
                status: 0,
                message: "Employee profile not found"
            });
        }

        // Ensure formatted is ALWAYS an object
        const formatted = employee ? employee.toObject() : {};
        console.log(employee);
        // Merge Profile fields safely
        formatted.corporateAddress = profile?.corporateAddress ?? {};
        formatted.factoryAddress = profile?.factoryAddress ?? {};
        const completionPercentage = calculateProfileCompletion(
            formatted,
            profile
        );
        formatted.profileCompletion = completionPercentage;
        formatted.AutoChatLanguage = profile?.AutoChatLanguage;
        console.log(formatted,"formatted");
        
        return res.json({
            status: 1,
            message: "Employee Profile Fetched Successfully",
            data: {
                userId,
                employee: formatted,
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
        // ⭐ HANDLE PHOTO
        // -------------------------
        let photoPath;

        if (req.file) {
            photoPath = `/employee/profilephoto/${req.file.filename}`;
        }

        // -------------------------
        // 1️⃣ Employee Model
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
            linkedUser: userId,
        };

        // ⭐ only update photo if uploaded
        if (photoPath) {
            employeeData.profilePhoto = photoPath;
        }

       const employee = await Employee.findOneAndUpdate(
  { linkedUser: userId },   // ⭐ FIXED
  { $set: employeeData },
  { new: true, upsert: true }
);

        // -------------------------
        // 2️⃣ Profile Model
        // -------------------------
        const profileData = {
            user: userId,
            unitName: body.unitName || "",
            designation: body.designationName || "",
            organizationName: body.organizationName || "",
            corporateAddress: body.corporateAddress,
            factoryAddress: body.factoryAddress,
            AutoChatLanguage: body.AutoChatLanguage
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