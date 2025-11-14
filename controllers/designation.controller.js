const Designation = require('../models/designation.model')
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
  // Common Across Departments
  "Director": 1,
  "CEO": 2,

  // Service Department
  "Head of Global Services": 3,
  "Country Service Head India": 4,
  "Service Executive Delhi, India": 5,
  "Country Service Head AUS": 6,
  "Service Manager, Perth, AUS": 7,
  "Service Executive, Sydney, AUS": 8,
  "Country Service Head GER": 9,
  "Service Executive": 10,

  // Sales Department
  "Head of Global Sales": 3,
  "Sales Head":3,
  "Country Sales Head India": 4,
  "Sales Executive Delhi, India": 5,
  "Country Sales Head AUS": 6,
  "Sales Manager, Perth, AUS": 7,
  "Sales Executive, Sydney, AUS": 8,
  "Country Sales Head GER": 9,
  "Sales Executive": 10,

  // HR Department
  "HR Head": 3,
  "HR Manager": 4,
  "HR Executive": 5,

  // Finance Department
  "Finance Head": 3,
  "Finance Manager": 4,
  "Finance Executive": 5,

  // Production Department
  "Plant / Unit Head": 3,
  "Production Supervisor Head": 4,
  "Production Supervisor": 5,
  "Quality Control Engineer": 6,
  "Production Executive": 7,
  "Machine Operator": 7
};

exports.addDesignation = async (req, res) => {
  try {
    const user = req.user;
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ status: 0, message: "Missing required field: name" });
    }

    // Normalize name
    name = name.trim();

    // If designation not in mapping → auto-generate next level
    let level = DESIGNATION_LEVELS[name];

    if (!level) {
      // find next highest level
      const maxLevel = Math.max(...Object.values(DESIGNATION_LEVELS));
      level = maxLevel + 1;

      // Add new designation to mapping for system usage
      DESIGNATION_LEVELS[name] = level;
    }

    // Check duplicates inside DB for this user
    const existing = await Designation.findOne({ user: user.id, name });
    if (existing) {
      return res.status(400).json({
        status: 0,
        message: `Designation '${name}' already exists`
      });
    }

    // Create designation
    const newDesignation = await Designation.create({
      name,
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
    const designation = await Designation.find({ user: user.id }).select("name id").sort({ createdAt: -1 });
    return res.status(200).json({ status: 1, data: designation });
  } catch (error) {
    console.error("❌ Error fetching department:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};
