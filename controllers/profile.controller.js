const Profile = require("../models/profile.model");
const Customer = require("../models/customer.model");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const QRCode = require("qrcode");

function calculateProfileCompletion(profile, user) {
  let totalFields = 0;
  let filledFields = 0;

  // ✅ Profile fields to consider
  const profileFields = [
    "profileImage",
    "dob",
    "gender",
    "address",
    "city",
    "state",
    "country",
    "zipcode",
    "bio",
  ];

  // ✅ User fields to consider
  const userFields = ["fullName", "email", "phone"];

  // Check profile fields
  profileFields.forEach((field) => {
    totalFields++;
    if (profile && profile[field]) filledFields++;
  });

  // Check user fields
  userFields.forEach((field) => {
    totalFields++;
    if (user && user[field]) filledFields++;
  });

  // ✅ Calculate percentage
  const percentage = Math.round((filledFields / totalFields) * 100);
  return percentage;
}

// CREATE profile
exports.createProfile = async (req, res) => {
  try {
    const profileData = {
      ...req.body,
      user: req.user.id,
      profileImage: req.file ? `/uploads/profile/${req.file.filename}` : ""
    };

    const profile = await Profile.create(profileData);
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// READ profile (current user)
exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate("user");
    console.log(req.user.id, "profile");
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    const customer = await Customer.findOne({ users: req.user.id });
    console.log(customer, "customer");
    if (!customer) {
      const orgRole = await Role.findOne({ name: "organization" });
      console.log(orgRole, "orgRole");

      const users = await User.findOne({ _id: req.user.id })
        .populate("roles", "name"); // optional populate
      console.log(users, "users");
      const completionPercentage = calculateProfileCompletion(profile, users);
      const qrCode = await QRCode.toDataURL(users.id);
      res.json({ profile, qrCode, completionPercentage });
    } else {
      const qrCode = await QRCode.toDataURL(customer.id);
      res.json({ profile, qrCode });
    }

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getProfileDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const profile = await Profile.findOne({ user: id }).populate("user");

    if (!profile) return res.status(404).json({ message: "Profile not found" });

    res.json({ profile });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// UPDATE profile
exports.updateProfile = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
    };
    console.log(updateData, "body");
    if (req.body.fullName) {
      const userData = await User.findOne({ _id: req.user.id });
      userData.fullName = req.body.fullName;
      await userData.save();
      console.log(userData, "userData");

    }
    if (req.file) {
      updateData.profileImage = `/uploads/profile/${req.file.filename}`;
    }

    const updated = await Profile.findOneAndUpdate(
      { user: req.user.id },
      updateData,
      { new: true, upsert: true }
    );
    const user = await User.findById(req.user.id);
    const completionPercentage = calculateProfileCompletion(updated, user);

    res.json({ updated, completionPercentage });
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
