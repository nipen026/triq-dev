const Department = require('../models/department.model')
const Employee = require('../models/employee.model')
// exports.addDepartment = async (req, res) => {
//   try {
//     const user = req.user;
//     let { name } = req.body;

//     if (!name) {
//       return res.status(400).json({ status: 0, message: "Missing required fields" });
//     }

//     // 🧠 Normalize department name & set icon
//     // let icon = "";
//     // switch (name.toLowerCase()) {
//     //   case "service department":
//     //     icon = "service";
//     //     break;
//     //   case "sales department":
//     //     icon = "sales";
//     //     break;
//     //   case "hr department":
//     //     icon = "hr";
//     //     break;
//     //   case "finance department":
//     //     icon = "finance";
//     //     break;
//     //   case "production department":
//     //     icon = "production";
//     //     break;
//     //   default:
//     //     icon = "default"; // fallback icon
//     //     break;
//     // }

//     const newDepartment = await Department.create({
//       name,
//       // icon,
//       user: user.id,
//     });

//     return res.status(201).json({
//       status: 1,
//       message: "Department added successfully",
//       data: newDepartment,
//     });
//   } catch (error) {
//     console.error("❌ Error adding department:", error);
//     return res.status(500).json({ status: 0, message: "Server error", error: error.message });
//   }
// };

exports.addDepartment = async (req, res) => {
  try {
    const user = req.user;
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ status: 0, message: "Missing required fields" });
    }

    // 🧠 Auto-append "Department" if missing
    if (!/department/i.test(name)) {
      name = `${name} Department`;
    }

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