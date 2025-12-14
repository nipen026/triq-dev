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
const ChatRoom = require('../models/chatRoom.model')
const { default: axios } = require("axios");
// Register new user
const CUSTOMER_ID = process.env.CUSTOMERID
const BASE_URL = "https://cpaas.messagecentral.com";
let authToken = process.env.AUTHTOKEN;


// exports.register = async (req, res) => {
//   try {
//     const { fullName, email, password, phone, countryCode, role, fcmToken, processorType } = req.body;
//     console.log(fcmToken, "frontend side fcmtoken");

//     // 1️⃣ Required fields check
//     if (!fullName || !email || !password || !phone || !countryCode || !role) {
//       return res.status(400).json({ error: "All fields are required" });
//     }

//     // 2️⃣ Email format validation
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ error: "Invalid email format" });
//     }

//     // 3️⃣ Password strength validation
//     if (password.length < 6) {
//       return res.status(400).json({ error: "Password must be at least 6 characters long" });
//     }

//     // 4️⃣ Phone validation
//     const phoneRegex = /^[0-9]{7,15}$/;
//     if (!phoneRegex.test(phone)) {
//       return res.status(400).json({ error: "Invalid phone number" });
//     }

//     // 5️⃣ Check if email/phone already exists
//     const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
//     if (existingUser) {
//       return res.status(400).json({ error: "Email or phone already registered" });
//     }

//     // 🔑 Hash password
//     const hash = await bcrypt.hash(password, 10);

//     // 6️⃣ Check or create role
//     let userRole = await Role.findOne({ name: role });
//     if (!userRole) {
//       userRole = await Role.create({ name: role });
//     }
//     let isNewUser = true;


//     // 7️⃣ Create user
//     const user = new User({
//       fullName,
//       email,
//       password: hash,
//       phone,
//       countryCode,
//       roles: [userRole._id],
//       emailOTP: "123456",
//       fcmToken,
//       isPhoneVerified: true,
//       isNewUser
//     });
//     if (role === "employee") {
//       const empExists = await Employee.findOne({ linkedUser: user._id });
//       if (empExists) {
//         isNewUser = false;
//       } else {
//         isNewUser = true;
//       }
//     }
//     if (role === "processor") {
//       if (!processorType) {
//         return res.status(400).json({ error: "Processor type is required for processor role" });
//       }
//       user.processorType = processorType; // 👈 Add field dynamically
//     }
//     const defaultSounds = [
//       {
//         user: user._id,
//         soundName: "bell",
//         type: "chat",
//         channelId: "triq_custom_sound_channel",
//       },
//       {
//         user: user._id,
//         soundName: "bell",
//         type: "voice_call",
//         channelId: "triq_custom_sound_channel",
//       },
//       {
//         user: user._id,
//         soundName: "bell",
//         type: "video_call",
//         channelId: "triq_custom_sound_channel",
//       },
//       {
//         user: user._id,
//         soundName: "bell",
//         type: "ticket_notification",
//         channelId: "triq_custom_sound_channel",
//       },
//       {
//         user: user._id,
//         soundName: "bell",
//         type: "alert",
//         channelId: "triq_custom_sound_channel",
//       },
//     ];
//     await Sound.insertMany(defaultSounds);


//     await user.save();

//     // 8️⃣ Create default profile
//     await Profile.create({
//       user: user._id,
//       email: user.email,
//       phone: user.phone,
//       profileImage: "",
//       chatLanguage: 'en',
//       corporateAddress: {},
//       factoryAddress: {},
//       designation: "",
//       unitName: "",
//     });

//     // 9️⃣ If role is processor, create customer entry
//     if (role === "processor") {
//       const customerData = {
//         customerName: fullName,
//         contactPerson: fullName,
//         email,
//         phoneNumber: phone,
//         organization: null,
//         countryOrigin: getCountryFromPhone(countryCode + phone),
//         users: [user._id],
//       };
//       await Customer.create(customerData);
//     }

//     // 🔟 If role is organization, create static pricing
//     if (role === "organization") {
//       const staticPricing = [
//         {
//           supportMode: "Online",
//           warrantyStatus: "In warranty",
//           ticketType: "General Check Up",
//           cost: 10,
//           currency: "USD",
//         },
//         {
//           supportMode: "Online",
//           warrantyStatus: "In warranty",
//           ticketType: "Full Machine Service",
//           cost: 10,
//           currency: "USD",
//         },
//         {
//           supportMode: "Online",
//           warrantyStatus: "Out Of Warranty",
//           ticketType: "Full Machine Service",
//           cost: 10,
//           currency: "USD",
//         },
//         {
//           supportMode: "Offline",
//           warrantyStatus: "In warranty",
//           ticketType: "General Check Up",
//           cost: 10,
//           currency: "USD",
//         },
//         {
//           supportMode: "Offline",
//           warrantyStatus: "In warranty",
//           ticketType: "Full Machine Service",
//           cost: 10,
//           currency: "USD",
//         },
//         {
//           supportMode: "Offline",
//           warrantyStatus: "Out Of Warranty",
//           ticketType: "Full Machine Service",
//           cost: 10,
//           currency: "USD",
//         },
//       ];

//       await ServicePricing.create({
//         organisation: user._id,
//         pricing: staticPricing,
//       });
//     }

//     // 🔐 Generate token
//     const token = jwt.sign(
//       { id: user._id, roles: userRole.name },
//       process.env.JWT_SECRET,
//       { expiresIn: "7d" }
//     );

//     const userData = await User.findById(user._id).populate("roles");

//     res.status(200).json({
//       success: true,
//       token,
//       user: userData,
//     });
//   } catch (err) {
//     console.error("Registration error:", err);
//     res.status(500).json({ error: "Server error, please try again." });
//   }
// };
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

    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ error: "Email or phone already registered" });
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

    // Save user
    await user.save();

    // 🔥 Employee check AFTER user exists
    if (role === "employee") {
      const empExists = await Employee.findOne({ linkedUser: user._id });

      if (empExists) {
        // Update user flag
        await User.findByIdAndUpdate(user._id, { isNewUser: false });
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

    const code = "123456";

    // Remove any previous OTP for same user/type
    await VerifyCode.deleteMany({ $or: [{ email }, { phone }], type });

    // Save new OTP
    // 

    // Send OTP (email or SMS)
    if (type === "email" && email) {
      await sendEmailOTP(email, code);
    } if (type === "phone" && phone) {
      sendSMS(phone).then(async (res) => {
        console.log(res);
        await VerifyCode.create({ email, phone, type, code, verficationid: res.data.verificationId, countryCode });
      });
    }

    console.log(`OTP sent to ${email || phone}: ${code}`);

    res.status(200).json({ success: true, msg: "OTP sent successfully" });
  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ error: "Server error" });
  }
};


exports.verifyOtp = async (req, res) => {
  try {
    const { email, type, code, phone } = req.body;

    const verifyData = await VerifyCode.findOne({
      $or: [{ email }, { phone }],
      type
    });

    if (!verifyData) {
      return res.status(400).json({ msg: "OTP not found" });
    }

    // Ensure auth token exists
    const AUTH_TOKEN = process.env.AUTHTOKEN;

    const url = `${BASE_URL}/verification/v3/validateOtp?countryCode=${verifyData.countryCode}&mobileNumber=${phone}&verificationId=${verifyData.verficationid}&customerId=C-8A37F23E5257494&code=${code}`;

    const otpRes = await axios.get(
      url,
      {
        headers: {
          authToken: AUTH_TOKEN,
          // "Content-Type": "application/json",
        },
      }
    );

    if (otpRes.data.responseCode !== 200) {
      return res.status(400).json({
        status: 0,
        message: otpRes.data.message || "Invalid or expired OTP",
      });
    }

    const status = otpRes.data.data.verificationStatus;

    if (status !== "VERIFICATION_COMPLETED") {
      return res.status(400).json({ status: 0, msg: "Invalid OTP" });
    }

    // Remove OTP after successful verification
    await VerifyCode.deleteOne({ _id: verifyData._id });

    res.status(200).json({ success: true, msg: "OTP verified successfully" });

  } catch (err) {
    console.error("verifyOtp error:", err.response?.data || err);
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

exports.login = async (req, res) => {
  try {
    const { email, password, fcmToken, role } = req.body;
    console.log(req.body, "frontend side thi login ma")
    // 1️⃣ Find user with roles
    const user = await User.findOne({ email }).populate("roles");
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ msg: "Invalid credentials" });
    }

    // 2️⃣ Email verification check
    if (!user.isEmailVerified && !user.isPhoneVerified) {
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

    // 🧹 Cleanup relations
    await Promise.all([
      Profile.deleteOne({ user: userId }),
      Sound.deleteMany({ user: userId }),
      VerifyCode.deleteMany({ $or: [{ email: user.email }, { phone: user.phone }] }),
      Customer.updateMany({ users: userId }, { $pull: { users: userId } }),
      Employee.deleteOne({ linkedUser: userId }),
      ServicePricing.deleteOne({ organisation: userId }),
      Ticket.deleteMany({ $or: [{ organisation: userId }, { processor: userId }] }),
      ChatRoom.deleteMany({ $or: [{ organisation: userId }, { processor: userId }] })
    ]);

    await User.findByIdAndDelete(userId);

    res.status(200).json({
      success: true,
      msg: "User permanently deleted"
    });
  } catch (err) {
    console.error("Hard delete error:", err);
    res.status(500).json({ error: "Server error" });
  }
};
