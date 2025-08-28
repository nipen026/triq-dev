const Customer = require("../models/customer.model");
const Machine = require("../models/machine.model");
const User = require("../models/user.model");
const { getFlag } = require("../utils/flagHelper");
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



exports.createCustomer = async (req, res) => {
  try {
    const customerData = pickCustomerFields(req.body);

    // ✅ Filter users to only those belonging to the organization
    if (req.user && req.user.id) {
      console.log(req.user.id);

      // Fetch users from DB by IDs
      const validUser = await User.findById(req.user.id, "fullName email");

      // Only add one organization user
      if (validUser) {
        customerData.users = validUser._id;
      } else {
        customerData.users = {};
      }
    }

    const customer = new Customer(customerData);

    // If machines assigned, update their status
    if (customerData.machines && customerData.machines.length > 0) {
      for (let m of customerData.machines) {
        await Machine.findByIdAndUpdate(m.machine, { status: "Assigned" });
      }
    }

    await customer.save();

    // Populate machines & users for response
    const populatedCustomer = await Customer.findById(customer._id)
      .populate("machines.machine")
      .populate("users", "fullName email");

    res.status(201).json({ message: "Customer created successfully", data: populatedCustomer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ Get All Active Customers
// exports.getCustomers = async (req, res) => {
//   try {
//     const customers = await Customer.find({ isActive: true }).populate("machines.machine").populate("users", "fullName email");
//     res.json({ count: customers.length, data: customers });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

// // ✅ Get Single Customer by ID
// exports.getCustomerById = async (req, res) => {
//   try {
//     const customer = await Customer.findOne({ _id: req.params.id, isActive: true })
//       .populate("machines.machine");

//     if (!customer) return res.status(404).json({ message: "Customer not found or inactive" });

//     res.json(customer);
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
exports.getCustomers = async (req, res) => {
  try {
    let customers = await Customer.find({ isActive: true })
      .populate("machines.machine")
      .populate("users", "fullName email");

    // Add flag for each customer
    customers = customers.map(c => {
      const obj = c.toObject();
      obj.flag = getFlag(c.countryOrigin);  // attach flag svg
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
