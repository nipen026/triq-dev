const mongoose = require("mongoose");
const User = require("../models/user.model");
const Role = require("../models/role.model");
const ServicePricing = require("../models/servicePricing.model");
require("dotenv").config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const orgRole = await Role.findOne({ name: "organization" });
    if (!orgRole) {
      console.log("No 'organization' role found.");
      process.exit(0);
    }

    const orgUsers = await User.find({ roles: orgRole._id });

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

    let addedCount = 0;

    for (const org of orgUsers) {
      const exists = await ServicePricing.findOne({ organisation: org._id });
      if (!exists) {
        await ServicePricing.create({
          organisation: org._id,
          pricing: staticPricing,
        });
        addedCount++;
      }
    }

    console.log(`✅ Added default pricing for ${addedCount} organization(s).`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
