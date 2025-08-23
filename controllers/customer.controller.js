const Customer = require("../models/customer.model");
const Machine = require("../models/machine.model");

// Helper: pick only allowed fields
const pickCustomerFields = (body) => {
  return {
    organizationName: body.organizationName,
    phoneNumber: body.phoneNumber,
    email: body.email,
    contactPerson: body.contactPerson,
    designation: body.designation,
    machines: body.machines // will validate in schema
  };
};

// ✅ Create Customer
exports.createCustomer = async (req, res) => {
  try {
    const customerData = pickCustomerFields(req.body);
    const customer = new Customer(customerData);

    // If machines assigned, update their status
    if (customerData.machines && customerData.machines.length > 0) {
      for (let m of customerData.machines) {
        await Machine.findByIdAndUpdate(m.machine, { status: "Assigned" });
      }
    }

    await customer.save();
    res.status(201).json({ message: "Customer created successfully", data: customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get All Active Customers
exports.getCustomers = async (req, res) => {
  try {
    const customers = await Customer.find({ isActive: true }).populate("machines.machine");
    res.json({ count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Get Single Customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findOne({ _id: req.params.id, isActive: true })
      .populate("machines.machine");

    if (!customer) return res.status(404).json({ message: "Customer not found or inactive" });

    res.json(customer);
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
