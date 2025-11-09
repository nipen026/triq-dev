const Department = require('../models/department.model')

exports.addDepartment = async (req, res) => {
  try {
    const user = req.user;
    const {  name } = req.body;

    if (!name) {
      return res.status(400).json({ status: 0, message: "Missing required fields" });
    }

    const newDepartment = await Department.create({
      name,
      user: user.id
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

exports.getAllDepartment = async(req,res) =>{
    try {
        const user = req.user
        const department = await Department.find({ user: user.id }).sort({ createdAt: -1 });
        return res.status(200).json({ status: 1, data: department });
      } catch (error) {
        console.error("❌ Error fetching department:", error);
        return res.status(500).json({ status: 0, message: "Server error" });
      }
}