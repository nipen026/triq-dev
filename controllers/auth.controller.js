// controllers/auth.controller.js
const User = require("../models/user.model");
const Role = require("../models/role.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmailOTP = require("../utils/emailOtp");
const firebaseAdmin = require("../config/firebase");

exports.register = async (req, res) => {
  const { fullName, email, password, phone, countryCode, role } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);
    const emailOTP = '123456';

    // 🔄 Check if role exists; if not, create it
    let userRole = await Role.findOne({ name: role });

    if (!userRole) {
      userRole = await Role.create({ name: role });
    }

    // 🧾 Create new user
    const user = new User({
      fullName,
      email,
      password: hash,
      phone,
      countryCode,
      roles: [userRole._id],
      emailOTP: emailOTP,
    });
    console.log(user, email, emailOTP, "create");

    await user.save();

    // ✉️ Send OTP via email
    await sendEmailOTP(email, emailOTP);

    res.status(200).json({ msg: "Registered. Verify email and phone OTP." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }

};

exports.verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: "User not found" });
    }

    // ✅ Check OTP
    if (user.emailOTP !== otp) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }


    const token = jwt.sign({ id: user._id, roles: user.roles.map(r => r.name) }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ✅ If OTP matches, verify email
    user.isEmailVerified = true;
    await user.save();

    res.status(200).json({ msg: "Email verified successfully", token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



exports.verifyPhone = async (req, res) => {
  const { phone, firebaseToken } = req.body;

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(firebaseToken);

    // decodedToken.phone_number contains the phone number from Firebase
    if (decodedToken.phone_number !== phone) {
      return res.status(400).json({ msg: "Phone number does not match token" });
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.isPhoneVerified = true;
    await user.save();

    res.status(200).json({ msg: "Phone number verified" });
  } catch (error) {
    res.status(401).json({ msg: "Invalid or expired token", error: error.message });
  }
};


exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).populate("roles");
  console.log(await bcrypt);

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ msg: "Invalid credentials" });
  }
  console.log(user, "user2");

  if (!user.isEmailVerified) {
    return res.status(403).json({ msg: "Please verify your account" });
  }

  const token = jwt.sign({ id: user._id, roles: user.roles.map(r => r.name) }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  res.status(200).json({ success: true, token, user });
};


exports.getOrganizationUsers = async (req, res) => {
  try {
    // find the Organization role _id
    const orgRole = await Role.findOne({ name: "organization" });
    if (!orgRole) {
      return res.status(404).json({ message: "Organization role not found" });
    }

    // find all users who have that role
    const users = await User.find({ roles: orgRole._id })
      .populate("roles", "name"); // optional populate

    res.json({ count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchOrganizationUser = async (req, res) => {
  try {
    const { search } = req.query; // 👈 single key
    const loggedInUserId = req.user?.id;

    // find the Organization role
    const orgRole = await Role.findOne({ name: "organization" });
    if (!orgRole) {
      return res.status(404).json({ message: "Organization role not found" });
    }

    // build query
    const query = {
      roles: orgRole._id,
      _id: { $ne: loggedInUserId } // exclude current user
    };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } } // optional
      ];
    }

    const users = await User.find(query).populate("roles", "name");

    if (!users.length) {
      return res.status(404).json({ message: "No organization users found" });
    }

    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
