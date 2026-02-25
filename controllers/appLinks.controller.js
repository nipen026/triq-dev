const AppLinks = require("../models/appLinks.model");


// =============================
// CREATE or UPDATE
// =============================
exports.upsertLinks = async (req, res) => {
  try {
    const { manufacturerUrl, processorUrl } = req.body;

    const links = await AppLinks.create(
      { manufacturerUrl, processorUrl }
    );

    res.json({
      status: 1,
      message: "Links saved successfully",
      data: links
    });

  } catch (err) {
    res.status(500).json({ status: 0, message: err.message });
  }
};


// =============================
// GET
// =============================
exports.getLinks = async (req, res) => {
  try {
    const links = await AppLinks.findOne();

    res.json({
      status: 1,
      data: links || { manufacturerUrl: "", processorUrl: "" }
    });

  } catch (err) {
    res.status(500).json({ status: 0, message: err.message });
  }
};


// =============================
// DELETE (optional)
// =============================
exports.deleteLinks = async (req, res) => {
  const id = req.params.id;
  try {
    await AppLinks.deleteOne({ _id: id });

    res.json({
      status: 1,
      message: "Links deleted successfully"
    });

  } catch (err) {
    res.status(500).json({ status: 0, message: err.message });
  }
};