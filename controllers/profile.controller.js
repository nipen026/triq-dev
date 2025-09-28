const Profile = require("../models/profile.model");

// CREATE profile
exports.createProfile = async (req, res) => {
  try {
    const profile = await Profile.create({
      ...req.body,
      user: req.user.id // from auth middleware
    });
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ profile (current user)
exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate("user");
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  try {
    const updated = await Profile.findOneAndUpdate(
      { user: req.user.id },
      req.body,
      { new: true, upsert: true } // create if not exists
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE profile
exports.deleteProfile = async (req, res) => {
  try {
    await Profile.findOneAndDelete({ user: req.user.id });
    res.json({ message: "Profile deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
