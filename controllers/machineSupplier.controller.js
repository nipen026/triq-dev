const Customer = require("../models/customer.model");
const Machine = require("../models/machine.model");
const User = require("../models/user.model");

exports.getMachineSupplierList = async (req, res) => {
  try {
    const userId = req.user.id; // user id from token middleware
    const user = await User.findById(userId).populate("roles");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Extract role names
    const roleNames = user.roles.map(r => r.name);

    // ✅ Only processors can access
    if (!roleNames.includes("processor")) {
      return res.status(403).json({ message: "Only processor role can access this" });
    }

    // Find all customers linked to this processor
    const customers = await Customer.find({ users: userId, isActive: true })
      .populate({
        path: "organization", // organisation reference in Customer
        select: "fullName email phone"
      })
      .populate("machines.machine");

    if (!customers || customers.length === 0) {
      return res.status(404).json({ message: "No customers found for this processor" });
    }

    // Build result with all organisations + machines
    const result = customers.map(cust => ({
      organization: cust.organization,
      machines: cust.machines.map(m => m.machine),
    }));

    res.json({ data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

exports.getMachineOverview = async (req, res) => {
  try {
    const userId = req.user.id; // user id from token (processor/customer login)
    const user = await User.findById(userId).populate("roles");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure only processor/customer can access their machines
    const roleNames = user.roles.map(r => r.name);
    if (!roleNames.includes("processor")) {
      return res.status(403).json({ message: "Only processor role can access machine overview" });
    }

    // Find customer linked to this processor
    const customer = await Customer.findOne({ users: userId, isActive: true })
      .populate({
        path: "machines.machine",
        select: "machineName modelNumber serialNumber machine_type status isActive",
      });

    if (!customer) {
      return res.status(404).json({ message: "Customer not found for this processor" });
    }

    // Extract only machines
    const machines = customer.machines.map(m => ({
      machineId: m.machine?._id,
      machineName: m.machine?.machineName,
      modelNumber: m.machine?.modelNumber,
      serialNumber: m.machine?.serialNumber,
      machineType: m.machine?.machine_type,
      status: m.machine?.status,
      isActive: m.machine?.isActive,
      purchaseDate: m.purchaseDate,
      installationDate: m.installationDate,
      warrantyStart: m.warrantyStart,
      warrantyEnd: m.warrantyEnd,
      warrantyStatus: m.warrantyStatus,
      invoiceContractNo: m.invoiceContractNo,
    }));

    res.json({ data: machines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};