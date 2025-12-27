const Employee = require("../models/employee.model");
const Department = require("../models/department.model");
const Designation = require("../models/designation.model");
const EmployeePermission = require("../models/employeePermission.model");
const User = require("../models/user.model");
const QRCode = require("qrcode");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Role = require('../models/role.model')
const ContactChatRoom = require('../models/contactChatRoom.model');
const sendMail = require("../utils/mailer");
// ➕ CREATE Employee
// ➕ CREATE Employee

// ✅ Helper Function (No res here)
exports.setEmployeePermissions = async (employeeId, permissions, session = null) => {
  try {
    if (!employeeId) throw new Error("Employee ID is required");
    if (permissions) {
      let parsed = permissions;
      if (typeof permissions === "string") {
        parsed = JSON.parse(permissions);
      }

      // 🔥 FIX: Deep nested check for any true permission
      const hasAtLeastOneTrue = Object.values(parsed).some(module =>
        typeof module === "object" &&
        Object.values(module).some(val => val === true)
      );

      console.log(parsed, "parsed");

      if (!hasAtLeastOneTrue) {
        throw new Error("At least 1 permission must be enabled.");
      }
    }
    // ✅ Ensure employee exists (inside session)
    const employee = await Employee.findById(employeeId).session(session);
    if (!employee) throw new Error("Employee not found");

    // ✅ Upsert permissions
    const updatedPermission = await EmployeePermission.findOneAndUpdate(
      { employee: employeeId },
      { employee: employeeId, permissions },
      { new: true, upsert: true, session }
    );

    return updatedPermission;
  } catch (error) {
    console.error("❌ Error setting permissions:", error);
    throw new Error(error.message);
  }
};


// ✅ Controller
// exports.addEmployee = async (req, res) => {
//     try {
//         const currentUser = req.user;
//         const {
//             name,
//             phone,
//             email,
//             bloodGroup,
//             employeeId,
//             department,
//             designation,
//             country,
//             area,
//             reportTo,
//             employeeType,
//             shiftTiming,
//             joiningDate,
//             permissions,
//         } = req.body;

//         // ✅ Parse nested JSON fields if they come as strings
//         let personalAddress = req.body.personalAddress;
//         let emergencyContact = req.body.emergencyContact;

//         try {
//             if (typeof personalAddress === "string")
//                 personalAddress = JSON.parse(personalAddress);
//         } catch (e) {
//             console.warn("⚠️ Invalid JSON in personalAddress", e.message);
//             personalAddress = {};
//         }

//         try {
//             if (typeof emergencyContact === "string")
//                 emergencyContact = JSON.parse(emergencyContact);
//         } catch (e) {
//             console.warn("⚠️ Invalid JSON in emergencyContact", e.message);
//             emergencyContact = {};
//         }

//         // ✅ Validate required fields
//         if (!name || !phone || !employeeId || !department || !designation) {
//             return res.status(400).json({
//                 status: 0,
//                 message: "Missing required fields",
//             });
//         }

//         // ✅ Validate Department
//         const deptExists = await Department.findById(department);
//         if (!deptExists)
//             return res
//                 .status(404)
//                 .json({ status: 0, message: "Department not found" });

//         // ✅ Validate Designation
//         const desigExists = await Designation.findById(designation);
//         if (!desigExists)
//             return res
//                 .status(404)
//                 .json({ status: 0, message: "Designation not found" });

//         // ✅ Check duplicate employeeId
//         const existingEmployee = await Employee.findOne({ employeeId });
//         if (existingEmployee) {
//             return res.status(400).json({
//                 status: 0,
//                 message: `Employee ID ${employeeId} already exists`,
//             });
//         }

//         // ✅ Handle profile photo
//         let profilePhotoPath = null;
//         if (req.file) {
//             profilePhotoPath = `/uploads/employee/profilephoto/${req.file.filename}`;
//         }

//         // ✅ Create Employee


//         // ✅ If designation name is CEO → reportTo = token user id
//         let finalReportTo = reportTo;
//         if (desigExists.name?.toLowerCase() === "ceo") {
//             finalReportTo = currentUser.id; // token user's ID as supervisor
//         }

//         // ✅ Create Employee
//         const newEmployee = await Employee.create({
//             name,
//             phone,
//             email,
//             bloodGroup,
//             profilePhoto: profilePhotoPath,
//             employeeId,
//             department,
//             designation,
//             country,
//             area,
//             reportTo: finalReportTo,
//             employeeType,
//             shiftTiming,
//             joiningDate,
//             personalAddress,
//             emergencyContact,
//             user: currentUser.id,
//         });

//         // ✅ Create random password for login
//         const plainPassword = crypto.randomBytes(6).toString("hex");
//         const hashedPassword = await bcrypt.hash(plainPassword, 10);

//         // ✅ Ensure "employee" role exists
//         let employeeRole = await Role.findOne({ name: "employee" });
//         if (!employeeRole)
//             employeeRole = await Role.create({ name: "employee" });

//         // ✅ Create User account linked to Employee
//         const userAccount = await User.create({
//             fullName: newEmployee.name,
//             email: newEmployee.email,
//             password: hashedPassword,
//             phone: newEmployee.phone,
//             isEmailVerified: false,
//             isPhoneVerified: false,
//             emailOTP: "123456",
//             countryCode: "+91",
//             roles: [employeeRole._id],
//         });

//         // ✅ Set permissions if provided
//         if (permissions) {
//             const permissionData = JSON.parse(permissions)
//             await exports.setEmployeePermissions(newEmployee._id, permissionData);
//         }
//         // ✅ Populate and return
//         const populatedEmployee = await Employee.findById(newEmployee._id)
//             .populate("department", "name")
//             .populate("designation", "name");

//         return res.status(201).json({
//             status: 1,
//             message: "Employee created successfully",
//             data: populatedEmployee,
//             credentials: {
//                 email: userAccount.email,
//                 password: plainPassword,
//             },
//         });
//     } catch (error) {
//         console.error("❌ Error adding employee:", error);
//         return res.status(500).json({
//             status: 0,
//             message: "Server error",
//             error: error.message,
//         });
//     }
// };

// exports.addEmployee = async (req, res) => {
//   try {
//     const currentUser = req.user;
//     const {
//       name,
//       phone,
//       email,
//       bloodGroup,
//       employeeId,
//       department,
//       designation,
//       country,
//       area,
//       reportTo,
//       employeeType,
//       shiftTiming,
//       joiningDate,
//       permissions,
//     } = req.body;

//     // Parse nested JSON safely
//     let personalAddress = req.body.personalAddress;
//     let emergencyContact = req.body.emergencyContact;
//     try {
//       if (typeof personalAddress === "string")
//         personalAddress = JSON.parse(personalAddress);
//     } catch {
//       personalAddress = {};
//     }
//     try {
//       if (typeof emergencyContact === "string")
//         emergencyContact = JSON.parse(emergencyContact);
//     } catch {
//       emergencyContact = {};
//     }

//     // Validate required fields
//     if (!name || !phone || !employeeId || !department || !designation) {
//       return res.status(400).json({ status: 0, message: "Missing required fields" });
//     }

//     // Validate Department and Designation
//     const deptExists = await Department.findById(department);
//     if (!deptExists) return res.status(404).json({ status: 0, message: "Department not found" });

//     const desigExists = await Designation.findById(designation);
//     if (!desigExists) return res.status(404).json({ status: 0, message: "Designation not found" });

//     // Check duplicate employeeId
//     const existingEmployee = await Employee.findOne({ employeeId });
//     if (existingEmployee) {
//       return res.status(400).json({
//         status: 0,
//         message: `Employee ID ${employeeId} already exists`,
//       });
//     }

//     // Handle profile photo
//     let profilePhotoPath = null;
//     if (req.file) {
//       profilePhotoPath = `/uploads/employee/profilephoto/${req.file.filename}`;
//     }

//     // If designation = CEO → reportTo = token user id
//     let finalReportTo = reportTo;
//     if (desigExists.name?.toLowerCase() === "ceo") {
//       finalReportTo = currentUser.id;
//     }

//     // ✅ Check if user already exists (by email)
//     let userAccount = await User.findOne({ email });

//     let plainPassword = null;
//     if (!userAccount) {
//       // 🆕 Create new user
//       plainPassword = crypto.randomBytes(6).toString("hex");
//       const hashedPassword = await bcrypt.hash(plainPassword, 10);

//       let employeeRole = await Role.findOne({ name: "employee" });
//       if (!employeeRole) employeeRole = await Role.create({ name: "employee" });

//       userAccount = await User.create({
//         fullName: name,
//         email,
//         password: hashedPassword,
//         phone,
//         isEmailVerified: false,
//         isPhoneVerified: false,
//         emailOTP: "123456",
//         countryCode: "+91",
//         roles: [employeeRole._id],
//       });
//     }

//     // ✅ Create employee linked to user (existing or new)
//     const newEmployee = await Employee.create({
//       name,
//       phone,
//       email,
//       bloodGroup,
//       profilePhoto: profilePhotoPath,
//       employeeId,
//       department,
//       designation,
//       country,
//       area,
//       reportTo: finalReportTo,
//       employeeType,
//       shiftTiming,
//       joiningDate,
//       personalAddress,
//       emergencyContact,
//       user: currentUser.id,
//       linkedUser: userAccount._id, // 🔗 Link existing/new user
//     });

//     // ✅ Set permissions if provided
//     if (permissions) {
//       const permissionData = JSON.parse(permissions);
//       await exports.setEmployeePermissions(newEmployee._id, permissionData);
//     }

//     const populatedEmployee = await Employee.findById(newEmployee._id)
//       .populate("department", "name")
//       .populate("designation", "name");

//     return res.status(201).json({
//       status: 1,
//       message: userAccount.isNew
//         ? "Employee created successfully with new user"
//         : "Employee linked with existing user",
//       data: populatedEmployee,
//       credentials: plainPassword
//         ? { email: userAccount.email, password: plainPassword }
//         : null,
//     });
//   } catch (error) {
//     console.error("❌ Error adding employee:", error);
//     return res.status(500).json({
//       status: 0,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };

exports.addEmployee = async (req, res) => {
  const session = await Employee.startSession();
  session.startTransaction();

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
      machine,
    } = req.body;
    console.log(req.body, "req.body");

    // Parse nested JSON
    let personalAddress = req.body.personalAddress;
    let emergencyContact = req.body.emergencyContact;
    try {
      if (typeof personalAddress === "string")
        personalAddress = JSON.parse(personalAddress);
    } catch {
      personalAddress = {};
    }
    try {
      if (typeof emergencyContact === "string")
        emergencyContact = JSON.parse(emergencyContact);
    } catch {
      emergencyContact = {};
    }

    // Validate required fields
    if (!name || !phone || !employeeId || !department || !designation) {
      return res
        .status(400)
        .json({ status: 0, message: "Missing required fields" });
    }

    // Validate Department and Designation
    const deptExists = await Department.findById(department);
    if (!deptExists)
      return res.status(404).json({ status: 0, message: "Department not found" });

    const desigExists = await Designation.findById(designation);
    if (!desigExists)
      return res.status(404).json({ status: 0, message: "Designation not found" });

    // Duplicate employeeId check
    const existingEmployee = await Employee.findOne({ employeeId });
    if (existingEmployee) {
      return res.status(400).json({
        status: 0,
        message: `Employee ID ${employeeId} already exists`,
      });
    }

    // Profile photo
    let profilePhotoPath = null;
    if (req.file) {
      profilePhotoPath = `/uploads/employee/profilephoto/${req.file.filename}`;
    }

    // Handle reportTo
    let finalReportTo = reportTo;
    if (desigExists.name?.toLowerCase() === "ceo") {
      finalReportTo = currentUser.id;
    }

    // ✅ Step 1: Check if User exists
    // let userAccount = await User.findOne({ email });

    // let plainPassword = null;
    // let isNewUser = false;

    // // ✅ Step 2: Create user if not exists
    // if (!userAccount) {
    //   isNewUser = true;
    //   plainPassword = crypto.randomBytes(6).toString("hex");
    //   const hashedPassword = await bcrypt.hash(plainPassword, 10);

    //   let employeeRole = await Role.findOne({ name: "employee" });
    //   if (!employeeRole) {
    //     employeeRole = await Role.create([{ name: "employee" }], { session });
    //   }

    //   userAccount = await User.create(
    //     [
    //       {
    //         fullName: name,
    //         email,
    //         password: hashedPassword,
    //         phone,
    //         isEmailVerified: false,
    //         isPhoneVerified: false,
    //         emailOTP: "123456",
    //         countryCode: "+91",
    //         roles: [employeeRole._id],
    //       },
    //     ],
    //     { session }
    //   );
    //   userAccount = userAccount[0];
    // }

    let userAccount = await User.findOne({ email });

    let isNewUser = false;
    let plainPassword = null;

    if (!userAccount) {
      // user not found → create new user
      isNewUser = true;

      plainPassword = crypto.randomBytes(6).toString("hex");
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      let employeeRole = await Role.findOne({ name: "employee" });
      if (!employeeRole) {
        employeeRole = await Role.create([{ name: "employee" }], { session });
      }

      userAccount = await User.create(
        [
          {
            fullName: name,
            email,
            password: hashedPassword,
            phone,
            isEmailVerified: false,
            isPhoneVerified: true,
            emailOTP: "123456",
            countryCode: "+91",
            isNewUser: false,
            roles: [employeeRole._id],
          },
        ],
        { session }
      );
      userAccount = userAccount[0];
      await sendMail({
        to: email,
        subject: "Welcome! Your Employee Account is Ready",
        html: `
          <p>Hello ${name},</p>
          <p>Your employee account has been created.</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${plainPassword}</p>
          <p>Please log in and change your password immediately.</p>
        `,
      });

    } else {
      // user exists → check if they already have employee data
      const existingEmpForUser = await Employee.findOne({ linkedUser: userAccount._id });

      if (!existingEmpForUser) {
        // user exists but no employee created yet → new user for employee system
        isNewUser = true;
      } else {
        // user already has employee record → not new
        isNewUser = false;
      }
    }


    // ✅ Step 3: Create employee only if user exists
    if (!userAccount?._id) {
      await session.abortTransaction();
      return res.status(400).json({
        status: 0,
        message: "User account creation failed — employee not created",
      });
    }

    const newEmployee = await Employee.create(
      [
        {
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
          reportTo: finalReportTo,
          employeeType,
          shiftTiming,
          joiningDate,
          personalAddress,
          emergencyContact,
          user: currentUser.id,
          linkedUser: userAccount._id,
          machine: machine ? machine : null
        },
      ],
      { session }
    );

    const employeeDoc = newEmployee[0];
    console.log(employeeDoc, "newEmployee");

    // ✅ Step 4: Set permissions if provided
    if (permissions) {
      const permissionData = JSON.parse(permissions);
      await exports.setEmployeePermissions(employeeDoc?._id, permissionData, session);
    }

    // ✅ Step 5: Create chat room (only if user exists)
    const existingChat = await ContactChatRoom.findOne({
      $or: [
        { employee_sender: currentUser.id, employee_receiver: userAccount._id },
        { employee_sender: userAccount._id, employee_receiver: currentUser.id },
      ],
    });

    if (!existingChat) {
      await ContactChatRoom.create(
        [
          {
            employee_sender: currentUser.id,
            employee_receiver: userAccount._id,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    const populatedEmployee = await Employee.findById(employeeDoc._id)
      .populate("department", "name")
      .populate("designation", "name");

    return res.status(201).json({
      status: 1,
      message: isNewUser
        ? "Employee created successfully with new user"
        : "Employee linked with existing user",
      data: populatedEmployee,
      credentials: plainPassword
        ? { email: userAccount.email, password: plainPassword }
        : null,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("❌ Error adding employee with chat:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  } finally {
    session.endSession();
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


// exports.updateEmployee = async (req, res) => {
//     try {
//         const { id } = req.params;

//         const {
//             name,
//             phone,
//             email,
//             bloodGroup,
//             employeeId,
//             department,
//             designation,
//             country,
//             area,
//             reportTo,
//             employeeType,
//             shiftTiming,
//             joiningDate,
//         } = req.body;

//         const updateData = {
//             name,
//             phone,
//             email,
//             bloodGroup,
//             employeeId,
//             department,
//             designation,
//             country,
//             area,
//             reportTo,
//             employeeType,
//             shiftTiming,
//             joiningDate,

//         };
//         let personalAddress = req.body.personalAddress;
//         let emergencyContact = req.body.emergencyContact;

//         try {
//             if (typeof personalAddress === "string") {
//                 personalAddress = JSON.parse(personalAddress);
//             }
//         } catch (e) {
//             console.warn("⚠️ Invalid JSON in personalAddress", e.message);
//             personalAddress = {};
//         }

//         try {
//             if (typeof emergencyContact === "string") {
//                 emergencyContact = JSON.parse(emergencyContact);
//             }
//         } catch (e) {
//             console.warn("⚠️ Invalid JSON in emergencyContact", e.message);
//             emergencyContact = {};
//         }
//         if (req.file) {
//             updateData.profilePhoto = `/uploads/profilePhotos/${req.file.filename}`;
//         }

//         if (department) {
//             const deptExists = await Department.findById(department);
//             if (!deptExists)
//                 return res.status(404).json({ status: 0, message: "Department not found" });
//         }

//         if (designation) {
//             const desigExists = await Designation.findById(designation);
//             if (!desigExists)
//                 return res.status(404).json({ status: 0, message: "Designation not found" });
//         }

//         if (employeeId) {
//             const existing = await Employee.findOne({ employeeId, _id: { $ne: id } });
//             if (existing)
//                 return res.status(400).json({ status: 0, message: "Employee ID already in use" });
//         }

//         const updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, {
//             new: true,
//         })
//             .populate("department", "name")
//             .populate("designation", "name");

//         if (!updatedEmployee)
//             return res.status(404).json({ status: 0, message: "Employee not found" });

//         return res.status(200).json({
//             status: 1,
//             message: "Employee updated successfully",
//             data: updatedEmployee,
//         });
//     } catch (error) {
//         console.error("❌ Error updating employee:", error);
//         return res.status(500).json({ status: 0, message: "Server error", error: error.message });
//     }
// };



// ❌ DELETE Employee

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
      if (typeof personalAddress === "string") personalAddress = JSON.parse(personalAddress);
    } catch {
      personalAddress = {};
    }
    try {
      if (typeof emergencyContact === "string") emergencyContact = JSON.parse(emergencyContact);
    } catch {
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

    // ✅ If email changed → link to existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      updateData.linkedUser = existingUser._id; // 🔗 Relink employee
    }
    updateData.personalAddress = personalAddress;
    updateData.emergencyContact = emergencyContact;
    const updatedEmployee = await Employee.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("department", "name")
      .populate("designation", "name");

    if (!updatedEmployee)
      return res.status(404).json({ status: 0, message: "Employee not found" });

    return res.status(200).json({
      status: 1,
      message: existingUser
        ? "Employee updated and linked to existing user"
        : "Employee updated successfully",
      data: updatedEmployee,
    });
  } catch (error) {
    console.error("❌ Error updating employee:", error);
    return res.status(500).json({ status: 0, message: "Server error", error: error.message });
  }
};

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
    const userId = req.params.id
    console.log(userId, "userId");

    const employee = await Employee.findOne({
      $or: [
        { linkedUser: userId },
        { _id: userId }
      ]
    })
      .populate("department", "name")
      .populate("designation", "name");
    console.log(employee, "employee");

    if (!employee) {
      return res.status(404).json({ status: 0, message: "Employee not found" });
    }
    const employePermissionData = await EmployeePermission.findOne({ employee: employee._id });
    console.log(employePermissionData, "employePermissionData");

    const qrCode = await QRCode.toDataURL(employee.id);
    const obj = employee.toObject();
    obj.qrCode = qrCode;
    if (employePermissionData) {
      obj.permissions = employePermissionData.permissions
    }
    return res.status(200).json({ status: 1, data: obj });
  } catch (error) {
    console.error("❌ Error fetching employee:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};
// exports.getEmployeeHierarchy = async (req, res) => {
//   try {
//     const user = req.user;
//     const { departmentId } = req.params;

//     if (!departmentId) {
//       return res.status(400).json({ status: 0, message: "Department ID is required" });
//     }

//     // ✅ Fetch employees for that department
//     const employees = await Employee.find({ user:user.id , department: departmentId })
//       .populate("department", "name")
//       .populate("designation", "name level")
//       .lean();

//     // ✅ Build map and hierarchy only if employees exist
//     let finalHierarchy = [];

//     if (employees.length > 0) {
//       const employeeMap = {};
//       employees.forEach(emp => {
//         emp.children = [];
//         employeeMap[emp._id.toString()] = emp;
//       });

//       const roots = [];
//       employees.forEach(emp => {
//         if (emp.reportTo && employeeMap[emp.reportTo.toString()]) {
//           employeeMap[emp.reportTo.toString()].children.push(emp);
//         } else {
//           roots.push(emp);
//         }
//       });

//       // ✅ Sort recursively by designation level
//       const sortHierarchy = (nodes) => {
//         nodes.sort((a, b) => {
//           if (!a.designation || !b.designation) return 0;
//           return a.designation.level - b.designation.level;
//         });
//         nodes.forEach(child => sortHierarchy(child.children));
//       };
//       sortHierarchy(roots);

//       finalHierarchy = roots;
//     }

//     // ✅ Always add Director node for organization/processor users
//     if (user.roles && (user.roles.includes("organization") || user.roles.includes("processor"))) {
//       const userData = await User.findById(user.id).select("fullName email phone processorType").lean();

//       const directorNode = {
//         _id: userData._id,
//         fullName: userData.fullName,
//         email: userData.email,
//         phone: userData.phone,
//         processorType: userData.processorType || null,
//         designation: { name: "Director", level: 1 },
//         department: { _id: departmentId, name: "All Departments" },
//         children: finalHierarchy, // attach all employees (if any)
//       };

//       // ✅ If no employees, still show only director node
//       finalHierarchy = [directorNode];
//     }

//     return res.status(200).json({
//       status: 1,
//       message: "Department hierarchy fetched successfully",
//       data: finalHierarchy,
//     });
//   } catch (error) {
//     console.error("❌ Error building department hierarchy:", error);
//     return res.status(500).json({
//       status: 0,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };





// 👀 Get Employee Permission


const assignLevels = (nodes, currentLevel = 1) => {
  nodes.forEach(node => {
    node.autoLevel = currentLevel; // 👈 this is the NEW level you want

    if (node.children && node.children.length > 0) {
      assignLevels(node.children, currentLevel + 1);
    }
  });
};

exports.getEmployeeHierarchy = async (req, res) => {
  try {
    const user = req.user;
    const { departmentId } = req.params;

    if (!departmentId) {
      return res.status(400).json({ status: 0, message: "Department ID is required" });
    }

    const employees = await Employee.find({ user: user.id, department: departmentId })
      .populate("department", "name")
      .populate("designation", "name level")
      .lean();

    let finalHierarchy = [];

    if (employees.length > 0) {
      const employeeMap = {};

      employees.forEach(emp => {
        emp.children = [];
        employeeMap[emp._id.toString()] = emp;
      });

      const roots = [];
      employees.forEach(emp => {
        if (emp.reportTo && employeeMap[emp.reportTo.toString()]) {
          employeeMap[emp.reportTo.toString()].children.push(emp);
        } else {
          roots.push(emp);
        }
      });

      // Sort based on designation but optional
      const sortHierarchy = (nodes) => {
        nodes.sort((a, b) => {
          if (!a.designation || !b.designation) return 0;
          return (a.designation.level || 999) - (b.designation.level || 999);
        });
        nodes.forEach(child => sortHierarchy(child.children));
      };
      sortHierarchy(roots);

      // ⭐ Assign dynamic levels
      assignLevels(roots);

      finalHierarchy = roots;
    }

    // Director Node
    if (user.roles && (user.roles.includes("organization") || user.roles.includes("processor"))) {
      const userData = await User.findById(user.id).select("fullName email phone processorType").lean();

      const directorNode = {
        _id: userData._id,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        processorType: userData.processorType || null,
        designation: { name: "Director", level: 1 },
        department: { _id: departmentId, name: "All Departments" },
        children: finalHierarchy,
      };

      // ⭐ Director is always level 1
      directorNode.autoLevel = 1;

      // ⭐ Children become level 2+
      assignLevels(directorNode.children, 2);

      finalHierarchy = [directorNode];
    }

    return res.status(200).json({
      status: 1,
      message: "Department hierarchy fetched successfully",
      data: finalHierarchy,
    });
  } catch (error) {
    console.error("❌ Error building department hierarchy:", error);
    return res.status(500).json({ status: 0, message: "Server error", error: error.message });
  }
};


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

exports.getEligibleReportToList = async (req, res) => {
  try {
    const { designationId, departmentId } = req.query;
    const user = req.user;

    if (!designationId || !departmentId) {
      return res.status(400).json({
        status: 0,
        message: "designationId and departmentId are required",
      });
    }

    // ✅ Fetch current designation
    const currentDesig = await Designation.findById(designationId);
    if (!currentDesig) {
      return res.status(404).json({
        status: 0,
        message: "Designation not found",
      });
    }

    // ✅ If current designation is CEO → show Director (user data)
    if (currentDesig.name?.toLowerCase() === "ceo") {
      const userData = await User.findById(user.id)
        .select("fullName email phone processorType")
        .lean();

      const directorData = {
        _id: userData._id,
        fullName: userData.fullName,
        email: userData.email,
        phone: userData.phone,
        processorType: userData.processorType || null,
        designation: { name: "Director", level: 1 },
        department: { _id: departmentId, name: "All Departments" },
        isUser: true, // 🔹 helpful flag to know it's not an employee
      };

      return res.status(200).json({
        status: 1,
        message: "Eligible reportTo list fetched successfully (Director user)",
        data: [directorData],
      });
    }

    // ✅ Otherwise, find higher-level employees within the department
    const eligibleEmployees = await Employee.find({
      user: user.id,
      department: departmentId,
    })
      .populate({
        path: "designation",
        match: { level: { $lt: currentDesig.level } }, // higher-level only
        select: "name level",
      })
      .populate("department", "name")
      .lean();

    // Remove employees that didn’t match higher-level condition
    const filtered = eligibleEmployees.filter(e => e.designation);

    // ✅ Final response
    return res.status(200).json({
      status: 1,
      message: "Eligible reportTo list fetched successfully",
      data: filtered,
    });

  } catch (error) {
    console.error("❌ Error fetching reportTo list:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};
