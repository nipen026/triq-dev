const Sound = require("../models/sound.model");

// Add new sound
exports.addSound = async (req, res) => {
  try {
    const user = req.user;
    console.log(user,"user")
    const { soundName, androidSound, iosSound } = req.body;

    if (!soundName || !androidSound || !iosSound) {
      return res.status(400).json({ status: 0, message: "Missing required fields" });
    }




    const newSound = await Sound.create({
      soundName,
      androidSound,
      iosSound,
      user:user.id
    });

    return res.status(201).json({
      status: 1,
      message: "Sound added successfully",
      data: newSound,
    });
  } catch (error) {
    console.error("❌ Error adding sound:", error);
    return res.status(500).json({ status: 0, message: "Server error", error: error.message });
  }
};

// Get all sounds
exports.getAllSounds = async (req, res) => {
  try {
    const user = req.user
    const sounds = await Sound.find({user:user.id}).sort({ createdAt: -1 });
    return res.status(200).json({ status: 1, data: sounds });
  } catch (error) {
    console.error("❌ Error fetching sounds:", error);
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};

exports.updateSound = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedSound = await Sound.findByIdAndUpdate(id, req.body, { new: true });
    if (!updatedSound) {
      return res.status(404).json({ status: 0, message: "Sound not found" });
    }
    return res.status(200).json({ status: 1, message: "Sound updated", data: updatedSound });
  } catch (error) {
    return res.status(500).json({ status: 0, message: "Server error" });
  }
};
