const Profile = require("../models/profile.model");
const Customer = require("../models/customer.model");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const QRCode = require("qrcode");

function calculateProfileCompletion(profile, user) {
  let totalPercent = 0;

  // 1️⃣ User Basic Info (20%)
  const userBasicFields = ["fullName", "email", "phone"];
  const filledUserBasic = userBasicFields.filter(
    (f) => user && user[f] && user[f].toString().trim() !== ""
  ).length;
  const userBasicPercent = (filledUserBasic / userBasicFields.length) * 20;
  totalPercent += userBasicPercent;

  // 2️⃣ Profile Image (20%)
  if (profile?.profileImage && profile.profileImage.trim() !== "") {
    totalPercent += 20;
  }

  // 3️⃣ Verification (20%)
  let verifyCount = 0;
  if (user?.isEmailVerified) verifyCount++;
  if (user?.isPhoneVerified) verifyCount++;
  const verifyPercent = (verifyCount / 2) * 20;
  totalPercent += verifyPercent;

  // 4️⃣ Personal Address (factoryAddress = your personal)
  const personalAddress = profile?.factoryAddress || {};
  const personalFields = ["addressLine1", "city", "state", "country", "pincode"];
  const filledPersonal = personalFields.filter(
    (f) => personalAddress[f] && personalAddress[f].toString().trim() !== ""
  ).length;
  const personalPercent = (filledPersonal / personalFields.length) * 20;
  totalPercent += personalPercent;

  // 5️⃣ Corporate Address
  const corporateAddress = profile?.corporateAddress || {};
  const corporateFields = ["addressLine1", "city", "state", "country", "pincode"];
  const filledCorporate = corporateFields.filter(
    (f) => corporateAddress[f] && corporateAddress[f].toString().trim() !== ""
  ).length;
  const corporatePercent = (filledCorporate / corporateFields.length) * 20;
  totalPercent += corporatePercent;
  console.log("Profile Completion Percentage:", totalPercent);
  return Math.min(Math.round(totalPercent), 100);
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
const getMissingProfileFields = (profile, user) => {
  const missing = [];

  // User fields
  if (!user.fullName) missing.push("Full Name");
  if (!user.email) missing.push("Email");
  if (!user.phone) missing.push("Phone");
  if (!user.countryCode) missing.push("Country Code");
  if (!user.isEmailVerified) missing.push("Email Verification");

  // Profile fields
  if (!profile.profileImage) missing.push("Profile Image");
  if (!profile.chatLanguage) missing.push("Chat Language");
  if (!profile.designation) missing.push("Designation");
  // if (!profile.unitName) missing.push("Unit Name");

  // 🏢 Corporate Address (GROUPED)
  const corporate = profile.corporateAddress || {};
  const corporateFields = [
    corporate.addressLine1,
    corporate.city,
    corporate.state,
    corporate.country,
    corporate.pincode,
  ];

  if (corporateFields.some(field => !field)) {
    missing.push("Corporate Address");
  }

  // 🏭 Factory Address (GROUPED)
  const factory = profile.factoryAddress || {};
  const factoryFields = [
    factory.addressLine1,
    factory.city,
    factory.state,
    factory.country,
    factory.pincode,
  ];

  if (factoryFields.some(field => !field)) {
    missing.push("Factory Address");
  }

  return missing;
};


// READ profile (current user)
exports.getProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ user: req.user.id }).populate("user");
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const user = await User.findById(req.user.id).populate("roles", "name");
    const customer = await Customer.findOne({ users: req.user.id });

    const completionPercentage = calculateProfileCompletion(profile, user);

    // 🔍 Find missing fields
    const missingFields = getMissingProfileFields(profile, user);

    // QR code logic
    const qrCode = customer
      ? await QRCode.toDataURL(customer.id)
      : await QRCode.toDataURL(user.id);

    // 🧾 Message if fields missing
    let message = "Profile is complete";
    if (missingFields.length > 0) {
      message = `Profile information pending: ${missingFields.join(", ")}`;
    }

    res.json({
      success: true,
      profile,
      qrCode,
      completionPercentage,
      missingFields,
      message
    });

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
    
    if (req.body.fullName) {
      const userData = await User.findOne({ _id: req.user.id });
      userData.fullName = req.body.fullName;
     
      userData.processorType = req.body.processorType;
       const customer = await Customer.findOne({ users: req.user.id });
       console.log(customer, "customer");
       
      if (customer) {
        customer.contactPerson = req.body.fullName;
        await customer.save();
      }
      if(userData.isEmailVerified === false){
        userData.email = req.body.email;
      }else{
        res.json({message: "Email cannot be changed as it is already verified"});
      }
      await userData.save();
      console.log(userData, "userData");
    }
    if (req.file) {
      updateData.profileImage = `/uploads/profile/${req.file.filename}`;
    }
    if (req.body.isSameAddress === 'true' || req.body.isSameAddress === true) {
      updateData.isSameAddress = true;
    }

    const updated = await Profile.findOneAndUpdate(
      { user: req.user.id },
      updateData,
      { new: true, upsert: true }
    );

    const user = await User.findById(req.user.id);
    const completionPercentage = calculateProfileCompletion(updated, user);

    res.json({ updated });
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
