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
const sendSMS = require("../utils/smsOtp");
const sendMail = require("../utils/mailer");
// Register new user

exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phone, countryCode, role, fcmToken, processorType } = req.body;
    console.log(fcmToken, "frontend side fcmtoken");

    // 1️⃣ Required fields check
    if (!fullName || !email || !password || !phone || !countryCode || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // 2️⃣ Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    // 3️⃣ Password strength validation
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters long" });
    }

    // 4️⃣ Phone validation
    const phoneRegex = /^[0-9]{7,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: "Invalid phone number" });
    }

    // 5️⃣ Check if email/phone already exists
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: "Email or phone already registered" });
    }

    // 🔑 Hash password
    const hash = await bcrypt.hash(password, 10);

    // 6️⃣ Check or create role
    let userRole = await Role.findOne({ name: role });
    if (!userRole) {
      userRole = await Role.create({ name: role });
    }

    // 7️⃣ Create user
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
    });
    if (role === "processor") {
      if (!processorType) {
        return res.status(400).json({ error: "Processor type is required for processor role" });
      }
      user.processorType = processorType; // 👈 Add field dynamically
    }
    await user.save();

    // 8️⃣ Create default profile
    await Profile.create({
      user: user._id,
      email: user.email,
      phone: user.phone,
      profileImage: "",
      chatLanguage: 'en',
      corporateAddress: {},
      factoryAddress: {},
      designation: "",
      unitName: "",
    });

    // 9️⃣ If role is processor, create customer entry
    if (role === "processor") {
      const customerData = {
        customerName: fullName,
        contactPerson: fullName,
        email,
        phoneNumber: phone,
        organization: null,
        countryOrigin: getCountryFromPhone(countryCode + phone),
        users: [user._id],
      };
      await Customer.create(customerData);
    }

    // 🔟 If role is organization, create static pricing
    if (role === "organization") {
      const staticPricing = [
        {
          supportMode: "Online",
          warrantyStatus: "In warranty",
          ticketType: "General Check Up",
          cost: 10,
          currency: "USD",
        },
        {
          supportMode: "Online",
          warrantyStatus: "In warranty",
          ticketType: "Full Machine Service",
          cost: 10,
          currency: "USD",
        },
        {
          supportMode: "Online",
          warrantyStatus: "Out Of Warranty",
          ticketType: "Full Machine Service",
          cost: 10,
          currency: "USD",
        },
        {
          supportMode: "Offline",
          warrantyStatus: "In warranty",
          ticketType: "General Check Up",
          cost: 10,
          currency: "USD",
        },
        {
          supportMode: "Offline",
          warrantyStatus: "In warranty",
          ticketType: "Full Machine Service",
          cost: 10,
          currency: "USD",
        },
        {
          supportMode: "Offline",
          warrantyStatus: "Out Of Warranty",
          ticketType: "Full Machine Service",
          cost: 10,
          currency: "USD",
        },
      ];

      await ServicePricing.create({
        organisation: user._id,
        pricing: staticPricing,
      });
    }

    // 🔐 Generate token
    const token = jwt.sign(
      { id: user._id, roles: userRole.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const userData = await User.findById(user._id).populate("roles");

    res.status(200).json({
      success: true,
      token,
      user: userData,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Server error, please try again." });
  }
};
// exports.sendOtp = async (req, res) => {
//   try {
//     const { email, phone, type } = req.body; // type = "email" | "phone"

//     if (!email && !phone) {
//       return res.status(400).json({ error: "Email or Phone is required" });
//     }

//     // Generate 6-digit OTP
//     // const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otp = 123456

//     if (type === "email" && email) {
//       // Save OTP to DB (temporary collection or User if already created)
//       await User.findOneAndUpdate(
//         { email },
//         { emailOTP: otp, otpExpiry: Date.now() + 5 * 60 * 1000 }, // 5 min expiry
//         { new: true, upsert: true }
//       );

//       // Send email OTP
//       // await sendMail(email, "Your OTP Code", `Your OTP is: ${otp}`);
//       return res.json({ msg: "OTP sent to email" });
//     }

//     if (type === "phone" && phone) {
//       await User.findOneAndUpdate(
//         { phone },
//         { phoneOTP: otp, otpExpiry: Date.now() + 5 * 60 * 1000 },
//         { new: true, upsert: true }
//       );

//       // TODO: integrate SMS provider like Twilio / MSG91
//       console.log(`OTP for ${phone}: ${otp}`);
//       return res.json({ msg: "OTP sent to phone" });
//     }

//     res.status(400).json({ error: "Invalid request" });
//   } catch (err) {
//     console.error("sendOtp error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };
// exports.verifyEmail = async (req, res) => {
//   try {
//     const { email, otp } = req.body;
//     const user = await User.findOne({ email }).populate("roles");

//     if (!user) {
//       return res.status(400).json({ msg: "User not found" });
//     }

//     // ✅ Check OTP
//     if (user.emailOTP !== otp) {
//       return res.status(400).json({ msg: "Invalid OTP" });
//     }


//     const token = jwt.sign({ id: user._id, roles: user.roles.map(r => r.name) }, process.env.JWT_SECRET, {
//       expiresIn: "7d",
//     });

//     // ✅ If OTP matches, verify email

//     user.isEmailVerified = true;
//     await user.save();

//     res.status(200).json({ msg: "Email verified successfully", token, user });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// exports.sendOtp = async (req, res) => {
//   try {
//     const { email, phone, type } = req.body;
//     if (!type || (!email && !phone)) {
//       return res.status(400).json({ msg: "Email or phone required" });
//     }

//     // const code = Math.floor(100000 + Math.random() * 900000).toString();
// const code = '123456'; // for testing
//     // Delete any old OTP for this user/type
//     await VerifyCode.deleteMany({ $or: [{ email }, { phone }], type });

//     // Save new OTP
//     await VerifyCode.create({ email, phone, code, type });

//     console.log(`OTP for ${type}: ${email || phone} => ${code}`);

//     return res.status(200).json({ msg: "OTP sent successfully" });
//   } catch (err) {
//     console.error("sendOtp error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };
exports.sendOtp = async (req, res) => {
  try {
    const { email, phone, type } = req.body;
    console.log(req.body, "send otp body");

    if (!type || (!email && !phone)) {
      return res.status(400).json({ msg: "Email or phone required" });
    }

    const code = "123456";

    // Remove any previous OTP for same user/type
    await VerifyCode.deleteMany({ $or: [{ email }, { phone }], type });

    // Save new OTP
    await VerifyCode.create({ email, phone, type, code });

    // Send OTP (email or SMS)
    if (type === "email" && email) {
      await sendEmailOTP(email, code);
    } if (type === "phone" && phone) {
      sendSMS(phone, code);
    }

    console.log(`OTP sent to ${email || phone}: ${code}`);

    res.status(200).json({ success: true, msg: "OTP sent successfully" });
  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
// ===================== VERIFY OTP =====================
// exports.verifyOtp = async (req, res) => {
//   try {
//     const { email, phone, type, code } = req.body;
//     if (!type || !email || !code) {
//       return res.status(400).json({ msg: "Email, type, and code required" });
//     }

//     const otpDoc = await VerifyCode.findOne({ $or: [{ email }, { phone }], type });
//     if (!otpDoc || otpDoc.code !== code) {
//       return res.status(400).json({ msg: "Invalid or expired OTP" });
//     }

//     // OTP verified → delete record
//     await VerifyCode.deleteOne({ _id: otpDoc._id });
//     console.log(email,"email");

//     // Optionally mark user verified
//     let user = await User.findOne({email:email}).populate("roles");
//     if (!user) {
//       return res.status(404).json({ msg: "User not found" });
//     }
//     console.log(email,"user");

//     if (type === "email") user.isEmailVerified = true;
//     if (type === "phone") user.isPhoneVerified = true;
//     await user.save();

//     // Generate token if needed
//     const token = jwt.sign(
//       { id: user._id, roles: user.roles.map(r => r.name) },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     res.status(200).json({
//       success: true,
//       msg: "OTP verified successfully",
//       token,
//       user,
//     });
//   } catch (err) {
//     console.error("verifyOtp error:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// };

exports.verifyOtp = async (req, res) => {
  try {
    const { email, type, code, phone } = req.body;

    // if (!code || (!email) || !type) {
    //   return res.status(400).json({ msg: "Missing required fields" });
    // }

    const verifyData = await VerifyCode.findOne({ $or: [{ email }, { phone }], type });

    if (!verifyData) {
      return res.status(400).json({ msg: "OTP not found or expired" });
    }

    if (verifyData.code !== code) {
      return res.status(400).json({ msg: "Invalid OTP" });
    }

    // ✅ OTP verified → delete record to prevent reuse
    await VerifyCode.deleteOne({ _id: verifyData._id });

    res.status(200).json({ success: true, msg: "OTP verified successfully" });
  } catch (err) {
    console.error("verifyOtp error:", err);
    res.status(500).json({ error: "Server error" });
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


// exports.login = async (req, res) => {
//   const { email, password, fcmToken,role } = req.body;
//   const user = await User.findOne({ email }).populate("roles");

//   if (!user || !(await bcrypt.compare(password, user.password))) {
//     return res.status(401).json({ msg: "Invalid credentials" });
//   }
//   console.log(user, "user2");

//   if (!user.isEmailVerified) {
//     return res.status(403).json({ msg: "Please verify your account" });
//   }
//   if (fcmToken) {
//     user.fcmToken = fcmToken; // or push into array
//     await user.save();
//   }

//   const token = jwt.sign({ id: user._id, roles: user.roles.map(r => r.name) }, process.env.JWT_SECRET, {
//     expiresIn: "7d",
//   });

//   res.status(200).json({ success: true, token, user });
// };
exports.login = async (req, res) => {
  try {
    const { email, password, fcmToken, role } = req.body;
    console.log(fcmToken, "frontend side thi login ma")
    // 1️⃣ Find user with roles
    const user = await User.findOne({ email }).populate("roles");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // 2️⃣ Email verification check
    if (!user.isEmailVerified) {
      return res.status(403).json({ msg: "Please verify your account" });
    }

    // 3️⃣ Check if role matches (optional: allow multiple roles per user)
    const userRoles = user.roles.map(r => r.name);
    if (role && !userRoles.includes(role)) {
      return res.status(403).json({ msg: `Invalid Role` });
    }

    // 4️⃣ Update FCM token if provided
    if (fcmToken) {
      user.fcmToken = fcmToken; // or push into array if multiple allowed
      await user.save();
    }

    // 5️⃣ Create JWT token
    const token = jwt.sign(
      { id: user._id, roles: userRoles },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    console.log(user, "login time user data");

    res.status(200).json({
      success: true,
      token,
      user
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error, please try again." });
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
    const { email } = req.body;
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
    user.resetPasswordOTP = '123456';
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000; // valid for 10 min
    await user.save();

    // 📧 Send OTP via email
    await sendEmailOTP(user.email, '123456');

    res.status(200).json({ msg: "OTP sent to registered email" });
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
    const { email, newPassword } = req.body;
    if (!email || !newPassword) return res.status(400).json({ msg: "Email & new password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (!user.isOtpVerifiedForReset) {
      return res.status(403).json({ msg: "OTP verification required" });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    user.isOtpVerifiedForReset = false; // reset flag
    await user.save();

    res.status(200).json({ msg: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

    await sendMail(email, subject, html);
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
      return res.send(`<h2>Email already verified ✅</h2>`);
    }

    // Mark verified
    user.isEmailVerified = true;
    await user.save();

    // Return a simple HTML confirmation
    res.send(`
      <div style="text-align:center;padding:40px;font-family:sans-serif">
        <h2>🎉 Email Verified Successfully!</h2>
        <p>You can now close this tab and return to the app.</p>
      </div>
    `);
  } catch (err) {
    console.error("autoVerify error:", err);
    if (err.name === "TokenExpiredError") {
      return res.status(400).send("<h3>Verification link expired ⏰</h3>");
    }
    res.status(400).send("<h3>Invalid or expired link ❌</h3>");
  }
};