const Designation = require('../models/designation.model')
const DESIGNATION_LEVELS = {
  "Director": 1,
  "CEO": 2,
  "Head of Global Services": 3,
  "Country Sales Head India": 4,
  "Country Sales Head AUS": 5,
  "Sales Executive": 6,
  "HR Head": 3,
  "HR Manager": 4,
  "HR Executive": 5,
  "Finance Head": 3,
  "Finance Manager": 4,
  "Finance Executive": 5,
  "Production Head": 3,
  "Production Supervisor Head": 4,
  "Quality Control Engineer": 5,
  "Dispatch Executive": 6
};
exports.addDesignation = async (req, res) => {
  try {
    const user = req.user;
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ status: 0, message: "Missing required field: name" });
    }

    // Normalize name (case-insensitive)
    name = name.trim();

    // Auto-assign level
    const level = DESIGNATION_LEVELS[name];
    if (!level) {
      return res.status(400).json({
        status: 0,
        message: `No level mapping found for designation: ${name}`
      });
    }

    // Check duplicates
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
