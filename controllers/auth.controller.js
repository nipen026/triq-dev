// controllers/auth.controller.js
const User = require("../models/user.model");
const Role = require("../models/role.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const sendEmailOTP = require("../utils/emailOtp");
const firebaseAdmin = require("../config/firebase");
const Customer = require("../models/customer.model");
const { getCountryFromPhone } = require("../utils/phoneHelper");
const Profile = require("../models/profile.model");
const VerifyCode = require("../models/verifyCode.model");
const ServicePricing = require('../models/servicePricing.model');
const Sound = require('../models/sound.model')
const sendSMS = require("../utils/smsOtp");
const sendMail = require("../utils/mailer");
const Employee = require("../models/employee.model");
const Ticket = require('../models/ticket.model');
const ChatRoom = require('../models/chatRoom.model');
const Machine = require('../models/machine.model');
const Notification = require('../models/notification.model');
const { default: axios } = require("axios");
const { DEFAULT_DEPARTMENTS } = require("../json/defaultDepartments");
const { DESIGNATIONS_BY_DEPARTMENT } = require("../json/defaultDesignations");

const Department = require("../models/department.model");
const Designation = require("../models/designation.model");
// Register new user
const CUSTOMER_ID = process.env.CUSTOMERID
const BASE_URL = "https://cpaas.messagecentral.com";
let authToken = process.env.AUTHTOKEN;

exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phone, countryCode, role, fcmToken, processorType } = req.body;

    if (!fullName || !email || !password || !phone || !countryCode || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    const phoneRegex = /^[0-9]{7,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    const existingUsers = await User.find({
      $or: [{ email }, { phone }]
    }).populate("roles");

    // If any user found
    if (existingUsers.length > 0) {
      // Collect all role names from all matched users
      const existingRoles = existingUsers.flatMap(user =>
        user.roles.map(role => role.name)
      );

      // 🔴 Processor: block duplicate processor
      if (role === "processor" && existingRoles.includes("processor")) {
        return res.status(400).json({
          error: "Processor with this email or phone already exists",
        });
      }

      // 🔴 Organization: block duplicate organization
      if (role === "organization" && existingRoles.includes("organization")) {
        return res.status(400).json({
          error: "Organization with this email or phone already exists",
        });
      }

      // 🔴 Employee: block duplicate employee
      if (role === "employee" && existingRoles.includes("employee")) {
        return res.status(400).json({
          error: "Employee with this email or phone already exists",
        });
      }
    }

    const hash = await bcrypt.hash(password, 10);

    let userRole = await Role.findOne({ name: role });
    if (!userRole) {
      userRole = await Role.create({ name: role });
    }

    // Default new user
    let isNewUser = true;

    // Create User (NOW we can use user._id)
    const user = new User({
      fullName,
      email,
      password: hash,
      phone,
      countryCode,
      roles: [userRole._id],
      emailOTP: "123456",
      fcmToken,
      isPhoneVerified: true,
      isNewUser
    });

    // Processor extra field
    if (role === "processor") {
      if (!processorType) {
        return res.status(400).json({ error: "Processor type is required for processor role" });
      }
      user.processorType = processorType;
    }
    // if (role === "organization") {
    const exists = await Department.findOne({ user: user._id });
    if (!exists) {
      await Department.insertMany(
        DEFAULT_DEPARTMENTS.map(name => ({
          name,
          user: user._id,
        }))
      );
    }
    // 🔥 Auto-create predefined designations for organization
    // if (role === "organization") {
    const createdDepartments = await Department.insertMany(
      DEFAULT_DEPARTMENTS.map(name => ({
        name,
        user: user._id
      }))
    );

    // 2️⃣ Create Designations Department Wise
    let allDesignations = [];

    for (const dept of createdDepartments) {
      const deptDesignations = DESIGNATIONS_BY_DEPARTMENT[dept.name];

      if (!deptDesignations) continue;

      const payload = Object.entries(deptDesignations).map(
        ([designationName, level]) => ({
          name: designationName,
          level,
          department: dept._id,
          user: user._id
        })
      );

      allDesignations.push(...payload);
    }

    // 3️⃣ Insert All Designations
    if (allDesignations.length > 0) {
      await Designation.insertMany(allDesignations);
    }
    // }

    // }
    // Save user
    await user.save();

    // 🔥 Employee check AFTER user exists
    if (role === "employee") {
      let employee = await Employee.findOne({ linkedUser: user._id });

      if (!employee) {
        employee = await Employee.create({
          name: fullName,
          email,
          phone,
          linkedUser: user._id,
          isActive: true
        });
      }
    }

    // Add default sounds
    const defaultSounds = [
      { user: user._id, soundName: "bell", type: "chat", channelId: "triq_custom_sound_channel" },
      { user: user._id, soundName: "bell", type: "voice_call", channelId: "triq_custom_sound_channel" },
      { user: user._id, soundName: "bell", type: "video_call", channelId: "triq_custom_sound_channel" },
      { user: user._id, soundName: "bell", type: "ticket_notification", channelId: "triq_custom_sound_channel" },
      { user: user._id, soundName: "bell", type: "alert", channelId: "triq_custom_sound_channel" },
    ];
    await Sound.insertMany(defaultSounds);

    await Profile.create({
      user: user._id,
      email: user.email,
      phone: user.phone,
      profileImage: "",
      chatLanguage: "en",
      corporateAddress: {},
      factoryAddress: {},
      designation: "",
      unitName: "",
    });

    if (role === "processor") {
      await Customer.create({
        customerName: fullName,
        contactPerson: fullName,
        email,
        phoneNumber: phone,
        organization: null,
        countryOrigin: getCountryFromPhone(countryCode + phone),
        users: [user._id],
      });
    }

    if (role === "organization") {
      await ServicePricing.create({
        organisation: user._id,
        pricing: [
          { supportMode: "Online", warrantyStatus: "In warranty", ticketType: "General Check Up", cost: 10, currency: "USD" },
          { supportMode: "Online", warrantyStatus: "In warranty", ticketType: "Full Machine Service", cost: 10, currency: "USD" },
          { supportMode: "Online", warrantyStatus: "Out Of Warranty", ticketType: "Full Machine Service", cost: 10, currency: "USD" },
          { supportMode: "Offline", warrantyStatus: "In warranty", ticketType: "General Check Up", cost: 10, currency: "USD" },
          { supportMode: "Offline", warrantyStatus: "In warranty", ticketType: "Full Machine Service", cost: 10, currency: "USD" },
          { supportMode: "Offline", warrantyStatus: "Out Of Warranty", ticketType: "Full Machine Service", cost: 10, currency: "USD" }
        ]
      });
    }

    const token = jwt.sign(
      { id: user._id, roles: userRole.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userData = await User.findById(user._id).populate("roles");

    res.status(200).json({
      success: true,
      token,
      user: userData
    });

  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error, please try again." });
  }
};

exports.sendOtp = async (req, res) => {
  try {
    const { email, phone, type, countryCode } = req.body;
    console.log(req.body, "send otp body");

    if (!type || (!email && !phone)) {
      return res.status(400).json({ msg: "Email or phone required" });
    }

    // ✅ STEP 1: Check if email or phone already exists
    const existingUser = await User.findOne({
      $or: [
        email ? { email } : null,
        phone ? { phone } : null
      ].filter(Boolean)
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        msg: `${email ? "Email" : "Phone number"} already registered. OTP not sent.`
      });
    }

    const code = "123456"; // you can randomize later

    // ✅ STEP 2: Remove previous OTPs
    await VerifyCode.deleteMany({
      $or: [{ email }, { phone }],
      type
    });

    // ✅ STEP 3: Send OTP
    if (type === "email" && email) {
      await sendEmailOTP(email, code);

      await VerifyCode.create({
        email,
        type,
        code
      });
    }

    if (type === "phone" && phone) {
      const smsRes = await sendSMS(phone, countryCode);

      await VerifyCode.create({
        phone,
        type,
        code,
        verificationId: smsRes?.data?.verificationId,
        countryCode
      });
    }

    console.log(`OTP sent to ${email || phone}: ${code}`);

    return res.status(200).json({
      success: true,
      msg: "OTP sent successfully"
    });

  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ error: "Server error" });
  }
};


function splitPhone(fullNumber) {
  const clean = fullNumber.replace("+", "").trim();

  // India has 2-digit country code (91)
  // But handle generically for other countries too
  let countryCode2 = "";
  let mobileNumber = "";

  if (clean.length > 10) {
    countryCode2 = clean.slice(0, clean.length - 10);
    mobileNumber = clean.slice(clean.length - 10);
  } else {
    // Fallback
    mobileNumber = clean;
  }

  return { countryCode2, mobileNumber };
}
exports.verifyOtp = async (req, res) => {
  try {
    const { email, phone, otp, code } = req.body;
    console.log(req.body, "verify otp body");

    if (!email && !phone) {
      return res.status(400).json({ msg: "Email or phone is required" });
    }

    if (!otp && !code) {
      return res.status(400).json({ msg: "OTP is required" });
    }

    const { countryCode2, mobileNumber } = splitPhone(phone);
    const type = email ? "email" : "phone";

    const query = email
      ? { email, type: "email" }
      : { phone: mobileNumber, type: "phone" };

    const verifyData = await VerifyCode.findOne(query)
      .sort({ createdAt: -1 });

    console.log(verifyData, "verify data");

    if (!verifyData) {
      return res.status(400).json({ msg: "OTP expired or not found" });
    }

    // ================= PHONE OTP (3rd party verify) =================
    if (type === "phone") {
      const AUTH_TOKEN = process.env.AUTHTOKEN;

      const url = `${BASE_URL}/verification/v3/validateOtp` +
        `?countryCode=${verifyData.countryCode}` +
        `&mobileNumber=${phone}` +
        `&verificationId=${verifyData.verificationId}` +
        `&customerId=C-8A37F23E5257494` +
        `&code=${otp ? otp : code}`;

      const otpRes = await axios.get(url, {
        headers: { authToken: AUTH_TOKEN }
      });

      if (otpRes.data.responseCode !== 200) {
        return res.status(400).json({
          status: 0,
          message: otpRes.data.message || "Invalid or expired OTP"
        });
      }

      if (otpRes.data.data.verificationStatus !== "VERIFICATION_COMPLETED") {
        return res.status(400).json({ status: 0, msg: "Invalid OTP" });
      }
    }

    // ================= EMAIL OTP (local verify) =================
    if (type === "email") {
      if (verifyData.code !== code && verifyData.code !== otp) {
        return res.status(400).json({ msg: "Invalid OTP" });
      }
    }

    // Cleanup all OTPs for this user
    await VerifyCode.deleteMany(query);

    return res.status(200).json({
      success: true,
      msg: "OTP verified successfully"
    });

  } catch (err) {
    console.error("verifyOtp error:", err.response?.data || err);
    return res.status(500).json({ error: "Server error" });
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
  try {
    const { email, phone, password, fcmToken, role } = req.body;
    console.log(req.body, "frontend side thi login ma");

    // 1️⃣ Find user (DO NOT filter by role here)
    let user;
    if (email) {
      user = await User.findOne({ email }).populate("roles");
    } else if (phone) {
      user = await User.findOne({ phone }).populate("roles");
    }

    console.log(user, "user found at login");

    // 2️⃣ Credential check
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // 3️⃣ Verification check
    if (!user.isEmailVerified && !user.isPhoneVerified) {
      return res.status(403).json({ msg: "Please verify your account" });
    }

    // 4️⃣ Update FCM token
    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    // 5️⃣ Extract roles from DB
    const userRoles = user.roles.map(r => r.name);

    // 6️⃣ Validate requested role
    if (role && !userRoles.includes(role)) {
      return res.status(403).json({
        msg: "You are not authorized for this role"
      });
    }

    // 7️⃣ Decide active role
    const activeRole = role || userRoles[0];

    // 8️⃣ Create JWT
    const token = jwt.sign(
      {
        id: user._id,
        role: activeRole,
        roles: userRoles
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      token,
      user,
      activeRole
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
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
    console.log(query);

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } } // optional
      ];
    }

    const users = await User.find(query).populate("roles", "name");
    console.log(users, "users");

    if (!users.length) {
      return res.status(404).json({ message: "No organization users found" });
    }

    res.json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.logout = async (req, res) => {
  try {
    // req.user.id comes from your JWT middleware
    await User.findByIdAndUpdate(req.user.id, { $unset: { fcmToken: "" } });
    res.status(200).json({ success: true, msg: "Logged out and FCM token removed" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// ===================== FORGOT PASSWORD FLOW =====================

// 1️⃣ Send OTP for Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email, phone, countryCode } = req.body;
    // if (!email) return res.status(400).json({ msg: "Email is required" });
    console.log(req.body, "forgot password body");

    let user;
    if (email) {
      user = await User.findOne({ email });
    }
    if (phone) {
      user = await User.findOne({ phone });
    }
    if (!user) return res.status(404).json({ msg: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // valid for 10 min
    await user.save();
    if (email) {
      await sendEmailOTP(user.email, otp);
      res.status(200).json({ msg: "OTP sent to registered email" });

    }
    if (phone) {
      const cleanCountryCode = countryCode?.replace("+", ""); // "+91" → "91"
      sendSMS(phone, cleanCountryCode).then(async (res) => {
        console.log(res, "response from sms otp");
        await VerifyCode.create({
          email,
          phone,
          type: "phone",
          code: otp,
          verificationId: res?.data?.verificationId,
          countryCode: countryCode
        });
      });
      res.status(200).json({ msg: "OTP sent to registered phone number" });
    }
    // 📧 Send OTP via email


  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// 2️⃣ Verify OTP
exports.verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ msg: "Email & OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.resetPasswordOTP !== otp || Date.now() > user.resetPasswordExpires) {
      return res.status(400).json({ msg: "Invalid or expired OTP" });
    }

    user.resetPasswordOTP = null;
    user.resetPasswordExpires = null;
    user.isOtpVerifiedForReset = true; // ✅ allow password reset
    await user.save();

    res.status(200).json({ msg: "OTP verified. You can now reset your password." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3️⃣ Reset Password after OTP verification
exports.resetPassword = async (req, res) => {
  try {
    const { email, phone, newPassword } = req.body;

    console.log(req.body, "req.body");

    // Validation
    if (!newPassword) {
      return res.status(400).json({ msg: "New password is required" });
    }

    if (!email && !phone) {
      return res.status(400).json({ msg: "Email or phone is required" });
    }

    // Find user (email OR phone)
    const user = await User.findOne({
      $or: [
        email ? { email } : null,
        phone ? { phone } : null
      ].filter(Boolean),
    });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Optional OTP verification (recommended)
    // if (!user.isOtpVerifiedForReset) {
    //   return res.status(403).json({ msg: "OTP verification required" });
    // }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    user.password = hashedPassword;
    user.isOtpVerifiedForReset = false;

    await user.save();

    console.log("Password reset successful for:", user.email || user.phone);

    res.status(200).json({ msg: "Password reset successful" });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ msg: "Internal server error" });
  }
};

exports.resetNewPassword = async (req, res) => {
  try {
    const { email, phone, oldPassword, newPassword } = req.body;

    if (!newPassword || !oldPassword) {
      return res.status(400).json({ msg: "Old and new password are required" });
    }

    let user;
    if (email) user = await User.findOne({ email });
    if (phone) user = await User.findOne({ phone });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // 🔐 Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Old password is incorrect" });
    }

    // 🚫 Prevent same password reuse
    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({
        msg: "New password must be different from old password"
      });
    }

    // 🔒 Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    user.isOtpVerifiedForReset = false;

    await user.save();

    return res.status(200).json({ msg: "Password updated successfully" });

  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: err.message });
  }
};

exports.sendVerifyEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (user.isEmailVerified) {
      return res.status(400).json({ msg: "Email already verified" });
    }

    // Generate token valid for 1 day
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Create verification link (same backend route)
    const verifyUrl = `${process.env.API_BASE_URL}/auth/auto-verify?token=${token}`;

    // Email content
    const subject = "Verify your email address";
    const html = `
      <h3>Hello ${user.fullName || "User"},</h3>
      <p>Click below to verify your email:</p>
      <a href="${verifyUrl}"
         style="background:#28a745;color:#fff;padding:10px 18px;text-decoration:none;border-radius:6px;">
         Verify My Email
      </a>
    `;

    await sendMail({ to: email, subject: subject, html: html });
    res.json({ success: true, msg: "Verification email sent successfully" });
  } catch (err) {
    console.error("sendVerifyEmail error:", err);
    res.status(500).json({ msg: "Error sending verification email" });
  }
};

// 🔹 Auto verify directly when link clicked
exports.autoVerify = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).send("Invalid verification link");

    // Decode and verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) return res.status(404).send("User not found");

    if (user.isEmailVerified) {
      return res.send(`
        <div style="text-align:center;padding:40px;font-family:sans-serif">
          <h2>Email already verified ✅</h2>
          <script>
            setTimeout(() => window.close(), 1000);
          </script>
        </div>
      `);
    }

    // Mark verified
    user.isEmailVerified = true;
    await user.save();

    // Return a simple HTML confirmation + auto-close after 10 sec
    res.send(`
      <div style="text-align:center;padding:40px;font-family:sans-serif">
        <h2>🎉 Email Verified Successfully!</h2>
        <p>You can now close this tab and return to the app.</p>
        <script>
          setTimeout(() => window.close(), 1000);
        </script>
      </div>
    `);
  } catch (err) {
    console.error("autoVerify error:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(400).send(`
        <div style="text-align:center;padding:40px;font-family:sans-serif">
          <h3>Verification link expired ⏰</h3>
          <script>setTimeout(() => window.close(), 1000);</script>
        </div>
      `);
    }
    res.status(400).send(`
      <div style="text-align:center;padding:40px;font-family:sans-serif">
        <h3>Invalid or expired link ❌</h3>
        <script>setTimeout(() => window.close(), 1000);</script>
      </div>
    `);
  }
};
exports.DeleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // 🔎 Find customers linked to this user
    const customers = await Customer.find({ users: userId });

    // 🔄 Reset machines + customer assignment
    for (const customer of customers) {
      // Reset machines
      for (const m of customer.machines || []) {
        await Machine.findByIdAndUpdate(m.machine, {
          status: "Available"
        });
      }

      // Reset customer
      customer.users = undefined;
      customer.assignmentStatus = "Rejected"; // or "Unassigned"
      await customer.save();
    }

    // 🧹 Cleanup relations
    await Promise.all([
      Profile.deleteOne({ user: userId }),
      Sound.deleteMany({ user: userId }),
      VerifyCode.deleteMany({
        $or: [{ email: user.email }, { phone: user.phone }]
      }),
      // Employee.deleteOne({ linkedUser: userId }),
      ServicePricing.deleteOne({ organisation: userId }),
      Ticket.deleteMany({
        $or: [{ organisation: userId }, { processor: userId }]
      }),
      ChatRoom.deleteMany({
        $or: [{ organisation: userId }, { processor: userId }]
      }),
      Notification.deleteMany({
        $or: [{ receiver: userId }, { sender: userId }]
      }),
      Customer.updateMany(
        { users: userId },
        { $pull: { users: userId } }
      )
    ]);

    // ❌ Finally delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      msg: "User permanently deleted with cleanup"
    });

  } catch (err) {
    console.error("Hard delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.checkPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const userToken = req.user;
    if (!password) {
      return res.status(400).json({ msg: "Password is required" });
    }

    const user = await User.findById(userToken.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }
    const isSame = await bcrypt.compare(password, user.password);
    if (isSame) {
      return res.status(200).json({ success: true, msg: "Password authenticated successfully" });
    } else {
      return res.status(400).json({ success: false, msg: "Incorrect password" });
    }

  } catch (err) {
    console.error("resetPassword error:", err);
    return res.status(500).json({ error: err.message });
  }
};
exports.sendOtpForLogin = async (req, res) => {
  try {
    const { email, phone, type, countryCode } = req.body;

    if (!type || (!email && !phone)) {
      return res.status(400).json({ msg: "Email or phone required" });
    }

    // 1️⃣ Find existing user
    const user = await User.findOne({
      $or: [
        email ? { email } : null,
        phone ? { phone } : null
      ].filter(Boolean)
    });

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 2️⃣ Remove old OTP
    await VerifyCode.deleteMany({
      $or: [{ email }, { phone }],
      type
    });

    // ================= EMAIL OTP =================
    if (type === "email" && email) {
      await sendEmailOTP(email, code);

      await VerifyCode.create({
        email,
        type: "email",
        code
      });
    }

    // ================= PHONE OTP =================
    if (type === "phone" && phone) {
      const smsRes = await sendSMS(phone, countryCode);

      await VerifyCode.create({
        phone,
        type: "phone",
        code,
        verificationId: smsRes?.data?.verificationId,
        countryCode
      });
    }

    return res.status(200).json({
      success: true,
      msg: "OTP sent successfully"
    });

  } catch (err) {
    console.error("sendOtpForLogin error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.loginWithOtp = async (req, res) => {
  try {
    const { email, phone, otp, role, fcmToken } = req.body;

    if ((!email && !phone) || !otp) {
      return res.status(400).json({ msg: "Email or phone and OTP required" });
    }

    const type = email ? "email" : "phone";

    // 1️⃣ Find OTP record
    const verifyData = await VerifyCode.findOne({
      $or: [
        email ? { email } : null,
        phone ? { phone } : null
      ].filter(Boolean),
      type
    }).sort({ createdAt: -1 });

    if (!verifyData) {
      return res.status(400).json({ msg: "OTP expired or not found" });
    }

    // ================= EMAIL VERIFY =================
    if (type === "email") {
      if (verifyData.code !== otp) {
        return res.status(400).json({ msg: "Invalid OTP" });
      }
    }

    // ================= PHONE VERIFY (3rd party) =================
    if (type === "phone") {
      const AUTH_TOKEN = process.env.AUTHTOKEN;

      const url = `${BASE_URL}/verification/v3/validateOtp` +
        `?countryCode=${verifyData.countryCode}` +
        `&mobileNumber=${phone}` +
        `&verificationId=${verifyData.verificationId}` +
        `&customerId=${CUSTOMER_ID}` +
        `&code=${otp}`;

      const otpRes = await axios.get(url, {
        headers: { authToken: AUTH_TOKEN }
      });

      if (
        otpRes.data.responseCode !== 200 ||
        otpRes.data.data.verificationStatus !== "VERIFICATION_COMPLETED"
      ) {
        return res.status(400).json({ msg: "Invalid or expired OTP" });
      }
    }

    // 2️⃣ Delete OTP after success
    await VerifyCode.deleteMany({
      $or: [{ email }, { phone }],
      type
    });

    // 3️⃣ Find user
    const user = await User.findOne({
      $or: [
        email ? { email } : null,
        phone ? { phone } : null
      ].filter(Boolean)
    }).populate("roles");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const userRoles = user.roles.map(r => r.name);

    if (role && !userRoles.includes(role)) {
      return res.status(403).json({
        msg: "You are not authorized for this role"
      });
    }

    const activeRole = role || userRoles[0];

    if (fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: activeRole,
        roles: userRoles
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      token,
      user,
      activeRole
    });

  } catch (err) {
    console.error("loginWithOtp error:", err.response?.data || err);
    return res.status(500).json({ error: "Server error" });
  }
};
