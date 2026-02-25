const Designation = require('../models/designation.model');
const Employee = require('../models/employee.model');
// const DESIGNATION_LEVELS = {
//   // Common Across Departments
//   "Director": 1,
//   "CEO": 2,

//   // Service Department
//   "Head of Global Services": 3,
//   "Country Service Head India": 4,
//   "Service Executive Delhi, India": 5,
//   "Country Service Head AUS": 6,
//   "Service Manager, Perth, AUS": 7,
//   "Service Executive, Sydney, AUS": 8,
//   "Country Service Head GER": 9,
//   "Service Executive": 10,

//   // Sales Department
//   "Head of Global Sales": 3,
//   "Country Sales Head India": 4,
//   "Sales Executive Delhi, India": 5,
//   "Country Sales Head AUS": 6,
//   "Sales Manager, Perth, AUS": 7,
//   "Sales Executive, Sydney, AUS": 8,
//   "Country Sales Head GER": 9,
//   "Sales Executive": 10,

//   // HR Department
//   "HR Head": 3,
//   "HR Manager": 4,
//   "HR Executive": 5,

//   // Finance Department
//   "Finance Head": 3,
//   "Finance Manager": 4,
//   "Finance Executive": 5,

//   // Production Department
//   "Plant / Unit Head": 3,
//   "Production Supervisor Head": 4,
//   "Production Supervisor": 5,
//   "Quality Control Engineer": 6,
//   "Production Executive": 7
// };
// exports.addDesignation = async (req, res) => {
//   try {
//     const user = req.user;
//     let { name } = req.body;

//     if (!name) {
//       return res.status(400).json({ status: 0, message: "Missing required field: name" });
//     }

//     // Normalize name (case-insensitive)
//     name = name.trim();

//     // Auto-assign level
//     const level = DESIGNATION_LEVELS[name];
//     if (!level) {
//       return res.status(400).json({
//         status: 0,
//         message: `No level mapping found for designation: ${name}`
//       });
//     }

//     // Check duplicates
//     const existing = await Designation.findOne({ user: user.id, name });
//     if (existing) {
//       return res.status(400).json({
//         status: 0,
//         message: `Designation '${name}' already exists`
//       });
//     }

//     // Create designation
//     const newDesignation = await Designation.create({
//       name,
//       level,
//       user: user.id,
//     });

//     return res.status(201).json({
//       status: 1,
//       message: "Designation added successfully",
//       data: newDesignation,
//     });
//   } catch (error) {
//     console.error("❌ Error adding designation:", error);
//     return res.status(500).json({ status: 0, message: "Server error", error: error.message });
//   }
// };

const DESIGNATION_LEVELS = {
  "director": 1,
  "ceo": 2,

  // Service
  "head of global services": 3,
  "country service head india": 4,
  "service executive delhi, india": 5,
  "country service head aus": 6,
  "service manager, perth, aus": 7,
  "service executive, sydney, aus": 8,
  "country service head ger": 9,
  "service executive": 10,

  // Sales
  "head of global sales": 3,
  "sales head": 3,
  "sales manager": 4,
  "sales executive": 4,
  "sales intern": 4,
  "customer relationship manager": 3,
  "country sales head india": 4,
  "sales executive delhi, india": 5,
  "country sales head aus": 6,
  "sales manager, perth, aus": 7,
  "sales executive, sydney, aus": 8,
  "country sales head ger": 9,

  // HR
  "hr head": 3,
  "hr manager": 4,
  "hr executive": 5,

  // Finance
  "finance head": 3,
  "finance manager": 4,
  "finance executive": 5,

  // Production
  "plant / unit head": 3,
  "dispatch head/coordinator": 4,
  'dispatch executive': 5,
  'account manager': 4,
  'admin / accounts': 3,
  'pi executive': 5,
  'account executive': 5,
  'intern/ executive': 5,
  "production supervisor head": 4,
  "production supervisor": 5,
  "quality control engineer": 6,
  "production executive": 7,
  "machine operator": 7,
  "line incharge": 5,
  "labour": 5,
  "worker": 5,
  "maintenance head": 5,
};

exports.addDesignation = async (req, res) => {
  try {
    const user = req.user;
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ status: 0, message: "Missing required field: name" });
    }

    // Normalize
    const originalName = name.trim();
    const keyName = originalName.toLowerCase(); // for matching case-insensitive

    // Fetch level (case insensitive)
    let level = DESIGNATION_LEVELS[keyName];

    if (!level) {
      // Auto-assign next level
      const maxLevel = Math.max(...Object.values(DESIGNATION_LEVELS));
      level = maxLevel + 1;

      // Store new designation in mapping (lowercase)
      DESIGNATION_LEVELS[keyName] = level;
    }

    // Check duplicates (case-insensitive)
    const existing = await Designation.findOne({
      user: user.id,
      name: { $regex: new RegExp(`^${originalName}$`, 'i') }
    });

    if (existing) {
      return res.status(400).json({
        status: 0,
        message: `Designation '${originalName}' already exists`
      });
    }

    // Create designation
    const newDesignation = await Designation.create({
      name: originalName, // save original case
      level,
      user: user.id,
    });

    return res.status(201).json({
      status: 1,
      message: "Designation added successfully",
      data: newDesignation,
    });

  } catch (error) {
    console.error("❌ Error adding designation:", error);
    return res.status(500).json({ status: 0, message: "Server error", error: error.message });
  }
};


exports.getAllDesignation = async (req, res) => {
  try {
    const user = req.user;
    if (user.roles.includes('employee')) {
      const designation = await Designation.find({ user: user.id }).select("name id").sort({ createdAt: -1 });
      return res.status(200).json({ status: 1, data: designation });
    }
    const designation = await Designation.find({ user: user.id }).select("name id").sort({ createdAt: -1 });
    return res.status(200).json({ status: 1, data: designation });
  } catch (error) {
    console.error("❌ Error fetching department:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};

exports.getDesignationByDepartment = async (req, res) => {
  try {
    const user = req.user;
    const { departmentId } = req.params;

    if (!departmentId) {
      return res.status(400).json({ status: 0, message: "Missing required field: departmentId" });
    }

    const designation = await Designation.find({ user: user.id, department: departmentId }).select("name id").sort({ createdAt: -1 });
    return res.status(200).json({ status: 1, data: designation });
  } catch (error) {
    console.error("❌ Error fetching designation by department:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};
