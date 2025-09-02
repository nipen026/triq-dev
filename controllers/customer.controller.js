  const Customer = require("../models/customer.model");
  const Machine = require("../models/machine.model");
  const Role = require("../models/role.model");
  const User = require("../models/user.model");
  const bcrypt = require("bcryptjs");
  const crypto = require("crypto");
  const { getFlag } = require("../utils/flagHelper");
  const sendMail = require("../utils/mailer");
  // Helper: pick only allowed fields
  const pickCustomerFields = (body) => {
    return {
      organization: body.organization,  // organization ID
      phoneNumber: body.phoneNumber,
      email: body.email,
      contactPerson: body.contactPerson,
      designation: body.designation,
      customerName: body.customerName,
      machines: body.machines,
      countryOrigin: body.countryOrigin
    };
  };



  // exports.createCustomer = async (req, res) => {
  //   try {
  //     const customerData = pickCustomerFields(req.body);

  //     // ✅ Filter users to only those belonging to the organization
  //     if (req.user && req.user.id) {
  //       console.log(req.user.id);

  //       // Fetch users from DB by IDs
  //       const validUser = await User.findById(req.user.id, "fullName email");

  //       // Only add one organization user
  //       if (validUser) {
  //         customerData.users = validUser._id;
  //       } else {
  //         customerData.users = {};
  //       }
  //     }

  //     const customer = new Customer(customerData);

  //     // If machines assigned, update their status
  //     if (customerData.machines && customerData.machines.length > 0) {
  //       for (let m of customerData.machines) {
  //         await Machine.findByIdAndUpdate(m.machine, { status: "Assigned" });
  //       }
  //     }

  //     await customer.save();

  //     // Populate machines & users for response
  //     const populatedCustomer = await Customer.findById(customer._id)
  //       .populate("machines.machine")
  //       .populate("users", "fullName email");

  //     res.status(201).json({ message: "Customer created successfully", data: populatedCustomer });
  //   } catch (err) {
  //     res.status(500).json({ error: err.message });
  //   }
  // };
exports.createCustomer = async (req, res) => {
  const session = await Customer.startSession();
  session.startTransaction();

  try {
    const customerData = pickCustomerFields(req.body);
if (req.user && req.user.id) {
        console.log(req.user.id);

        // Fetch users from DB by IDs
        const validUser = await User.findById(req.user.id, "fullName email");

        // Only add one organization user
        if (validUser) {
          customerData.organization = validUser._id;
        } else {
          customerData.users = {};
        }
      }
    // ✅ Check duplicate email or phone for User before proceeding
    const existingUser = await User.findOne({
      $or: [
        { email: customerData.email },
        { phone: customerData.phoneNumber }
      ]
    });

    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: "User already exists with this email or phone number"
      });
    }

    // ✅ Create Customer first
    const customer = new Customer(customerData);
    // console.log(customer,"customer");
    
    // If machines assigned, update their status
    if (customerData.machines && customerData.machines.length > 0) {
      for (let m of customerData.machines) {
        await Machine.findByIdAndUpdate(m.machine, { status: "Assigned" });
      }
    }

    await customer.save({ session });

    // ✅ Find processor role, if not exist → create it
    let processorRole = await Role.findOne({ name: "processor" });
    if (!processorRole) {
      processorRole = new Role({ name: "processor" });
      await processorRole.save({ session });
    }
    console.log(processorRole,"processorRole`");
    
    // ✅ Generate random password
    const plainPassword = crypto.randomBytes(6).toString("hex"); // 12-char random password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // ✅ Create linked user
    const user = new User({
      fullName: customer.contactPerson || customer.customerName,
      email: customer.email,
      password: hashedPassword,
      phone: customer.phoneNumber,
      isEmailVerified:true,
      isPhoneVerified:true,
      countryCode: "+91", // or dynamic from req.body
      roles: [processorRole._id],
    });
    await user.save({ session });

    // ✅ Link user to customer
    customer.users = [user._id];
    await customer.save({ session });

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();

    // ✅ Send email with new password
    await sendMail({
      to: customer.email,
      subject: "Welcome! Your Processor Account is Ready",
      html: `
        <p>Hello ${customer.contactPerson || customer.customerName},</p>
        <p>Your processor account has been created.</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Password:</strong> ${plainPassword}</p>
        <p>Please log in and change your password immediately.</p>
      `,
    });

    // ✅ Populate response
    const populatedCustomer = await Customer.findById(customer._id)
      .populate("machines.machine")
      .populate("users", "fullName email roles");

    res.status(201).json({
      message: "Customer & user created successfully",
      data: populatedCustomer
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ from token (organization role user)

    // Find only customers linked to this organization user
    let customers = await Customer.find({
        isActive: true,
        organization: userId   // ✅ filter by org user
      })
      .populate("machines.machine")
      .populate("users", "fullName email");

    // Add flag for each customer
    customers = customers.map(c => {
      const obj = c.toObject();
      obj.flag = getFlag(c.countryOrigin);
      return obj;
    });

    res.json({ count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


  // ✅ Get Single Customer by ID
  exports.getCustomerById = async (req, res) => {
    try {
      const customer = await Customer.findOne({ _id: req.params.id, isActive: true })
        .populate("machines.machine")
        .populate("users", "fullName email");

      if (!customer) return res.status(404).json({ message: "Customer not found or inactive" });

      const obj = customer.toObject();
      obj.flag = getFlag(customer.countryOrigin);  // attach flag svg

      res.json(obj);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
  // ✅ Update Customer
  exports.updateCustomer = async (req, res) => {
    try {
      const customerData = pickCustomerFields(req.body);

      const customer = await Customer.findOneAndUpdate(
        { _id: req.params.id, isActive: true },
        customerData,
        { new: true }
      ).populate("machines.machine");

      if (!customer) return res.status(404).json({ message: "Customer not found or inactive" });

      res.json({ message: "Customer updated successfully", data: customer });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

  // ✅ Soft Delete Customer
  exports.deleteCustomer = async (req, res) => {
    try {
      const customer = await Customer.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!customer) return res.status(404).json({ message: "Customer not found" });

      res.json({ message: "Customer deactivated (soft deleted)", data: customer });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
// ✅ Search Customers by email or phone (only within the logged-in user's organization)
exports.searchCustomers = async (req, res) => {
  try {
    const { search } = req.query; // one query param
    const loggedInUserId = req.user?.id;

    // ✅ Get logged-in user's organization
    const user = await User.findById(loggedInUserId).populate("roles", "name");
    
    if (!user || !user.roles.map(r => r.name).includes("organization")) {
      return res.status(403).json({ message: "User does not belong to an organization" });
    }

    // Build query
    const query = {
      organization: user.organization,  // only same org
      isActive: true,
    };

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ];
    }

    let customers = await Customer.find(query)
      .populate("machines.machine")
      .populate("users", "fullName email");

    // Add flags
    customers = customers.map(c => {
      const obj = c.toObject();
      obj.flag = getFlag(c.countryOrigin);
      return obj;
    });

    res.json({ count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Remove a machine from customer
exports.removeMachineFromCustomer = async (req, res) => {
  try {
    const { customerId, machineId } = req.params;

    // ✅ Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // ✅ Check if machine is assigned to this customer
    const machineIndex = customer.machines.findIndex(
      (m) => m.machine.toString() === machineId
    );
    if (machineIndex === -1) {
      return res.status(400).json({ message: "Machine not assigned to this customer" });
    }

    // ✅ Remove machine from customer
    customer.machines.splice(machineIndex, 1);
    await customer.save();

    // ✅ Update machine status back to "Available"
    await Machine.findByIdAndUpdate(machineId, { status: "Available" });

    // ✅ Populate response
    const updatedCustomer = await Customer.findById(customerId)
      .populate("machines.machine")
      .populate("users", "fullName email");

    res.json({ message: "Machine removed from customer", data: updatedCustomer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
