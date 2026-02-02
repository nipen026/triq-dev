const Department = require('../models/department.model')
const Employee = require('../models/employee.model')


exports.addDepartment = async (req, res) => {
  try {
    const user = req.user;
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ status: 0, message: "Missing required fields" });
    }
    name = name.trim();
    // 🧠 Auto-append "Department" if missing
    if (!/department/i.test(name)) {
      name = `${name} Department`;
    }
    name = name
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
    const newDepartment = await Department.create({
      name,
      user: user.id,
    });

    return res.status(201).json({
      status: 1,
      message: "Department added successfully",
      data: newDepartment,
    });
  } catch (error) {
    console.error("❌ Error adding department:", error);
    return res.status(500).json({ status: 0, message: "Server error", error: error.message });
  }
};

exports.getAllDepartment = async (req, res) => {
  try {
    const user = req.user;
    if (user.roles == 'employee') {
      const employeData = await Employee.findOne({ linkedUser: user.id });
      const department = await Department.find({ user: employeData.user }).select("name id").sort({ createdAt: -1 });
      return res.status(200).json({ status: 1, data: department });
    }
    const department = await Department.find({ user: user.id }).select("name id").sort({ createdAt: -1 });
    return res.status(200).json({ status: 1, data: department });
  } catch (error) {
    console.error("❌ Error fetching department:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};