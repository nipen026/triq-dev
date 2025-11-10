const Designation = require('../models/designation.model')

exports.addDesignation = async (req, res) => {
  try {
    const user = req.user;
    let { name } = req.body;

    if (!name) {
      return res.status(400).json({ status: 0, message: "Missing required fields" });
    }

    const newDesignation = await Designation.create({
      name,
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