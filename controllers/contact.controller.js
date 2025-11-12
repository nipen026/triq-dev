const Employee = require("../models/employee.model");
const Department = require("../models/department.model");
const Designation = require("../models/designation.model");
const ExternalContact = require("../models/externalContact.model"); // we'll define this below



exports.addExternalContact = async (req, res) => {
  try {
    const user = req.user;
    const { name, email, phone } = req.body;

    // ✅ Step 1: Check if the person already exists as an Employee
    const existingEmployee = await Employee.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone: phone },
      ],
    })
      .populate("designation", "name")
      .populate("department", "name")
      .lean();

    if (existingEmployee) {
      // ✅ Step 2: Create external contact linked to existing employee details
      const newContact = await ExternalContact.create({
        name: existingEmployee.name || name,
        email: existingEmployee.email || email,
        phone: existingEmployee.phone || phone,
        addedBy: user.id,
        linkedEmployee: existingEmployee._id, // 🔹 Optional: Add field to link them
      });

      return res.status(200).json({
        status: 1,
        message: "External contact added successfully (existing employee linked)",
        data: newContact,
      });
    }

    // ✅ Step 3: Otherwise, create as a normal new external contact
    const newContact = await ExternalContact.create({
      name,
      email,
      phone,
      addedBy: user.id,
    });

    return res.status(200).json({
      status: 1,
      message: "External contact added successfully",
      data: newContact,
    });
  } catch (error) {
    console.error("❌ Error adding external contact:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};




exports.getDepartmentalContacts = async (req, res) => {
  try {
    const user = req.user;

    const employees = await Employee.find({ user: user.id })
      .populate("department", "name")
      .populate("designation", "name")
      .sort({ name: 1 })
      .lean();

    if (!employees.length) {
      return res.status(200).json({
        status: 1,
        message: "No employees found",
        data: [],
      });
    }

    const data = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation?.name || "—",
      department: emp.department?.name || "—",
      profilePhoto: emp.profilePhoto || null,
      status: emp.isActive ? "Active" : "Inactive",
    }));

    res.status(200).json({
      status: 1,
      message: "Departmental contacts fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching departmental contacts:", error);
    res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};


exports.getExternalContacts = async (req, res) => {
  try {
    const user = req.user;

    const contacts = await ExternalContact.find({ addedBy: user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 1,
      message: "External contacts fetched successfully",
      data: contacts.map(c => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        organizationName: c.organizationName,
        profilePhoto: c.profilePhoto || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching external contacts:", error);
    res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.searchContacts = async (req, res) => {
  try {
    const { q } = req.query; // type can be "organization" or "processor"
    const regex = new RegExp(q, "i");

    // search employees by name/email/phone
    const employeeFilter = {
      $or: [
        { name: regex },
        { email: regex },
        { phone: regex },
      ],
    };

    const employees = await Employee.find(employeeFilter)
      .populate("designation", "name")
      .populate("department", "name")
      .lean();

    // search external contacts too
    const externals = await ExternalContact.find({
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).lean();

    res.status(200).json({
      status: 1,
      message: "Search results fetched",
      data: {
        employees: employees.map(e => ({
          _id: e._id,
          name: e.name,
          designation: e.designation?.name,
          department: e.department?.name,
          profilePhoto: e.profilePhoto,
          type: "employee",
        })),
        externals: externals.map(e => ({
          _id: e._id,
          name: e.name,
          organizationName: e.organizationName,
          profilePhoto: e.profilePhoto,
          type: "external",
        })),
      },
    });
  } catch (error) {
    console.error("Error in contact search:", error);
    res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};