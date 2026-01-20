const Customer = require("../models/customer.model");
const Machine = require("../models/machine.model");
const User = require("../models/user.model");
const { getFlag, getFlagWithCountryCode } = require("../utils/flagHelper");

exports.getMachineSupplierList = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("userId", userId);

    const user = await User.findById(userId).populate("roles");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roleNames = user.roles.map(r => r.name);

    // ✅ Only processor can access
    if (!roleNames.includes("processor")) {
      return res.status(403).json({ message: "Only processor role can access this" });
    }

    // ✅ Find customers with organization not null
    const customers = await Customer.find({
      users: userId,
      isActive: true,
      organization: { $ne: null }, // <-- filter out null organizations
    })
      .populate({
        path: "organization",
        select: "fullName email phone countryCode",
      })
      .populate("machines.machine");



    if (!customers || customers.length === 0) {
      return res.status(200).json({ message: "No customers with organization found for this processor" });
    }
    // const result = customers.map(cust => ({
    //   customer: cust,
    //   // organization: cust.organization,
    //   // machines: cust.machines.map(m => m.machine),
    // }));
    const result = customers.map(cust => {
      const customerObj = cust.toObject(); // Convert Mongoose doc → plain JS
      customerObj.flag = getFlagWithCountryCode(customerObj.organization.countryCode);
      return { customer: customerObj };
    });

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error("Error in getMachineSupplierList:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.getMachineOverview = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate("roles");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roleNames = user.roles.map(r => r.name);
    if (!roleNames.includes("processor")) {
      return res.status(403).json({ message: "Only processor role can access machine overview" });
    }

    // ✅ Use find to get all customers linked to this user
    const customers = await Customer.find({ users: userId, isActive: true })
      .populate({
        path: "machines.machine",
        select: "machineName modelNumber machine_type status isActive remarks",
      });

    if (!customers || customers.length === 0) {
      return res.status(404).json({ message: "Customer not found for this processor" });
    }

    // ✅ Flatten all machines from all customers
    const machines = customers.flatMap(customer =>
      customer.machines.map(m => ({
        machineId: m.machine?._id,
        machineName: m.machine?.machineName,
        modelNumber: m.machine?.modelNumber,
        // serialNumber: m.machine?.serialNumber,
        machineType: m.machine?.machine_type,
        status: m.machine?.status,
        isActive: m.machine?.isActive,
        purchaseDate: m.purchaseDate,
        installationDate: m.installationDate,
        warrantyStart: m.warrantyStart,
        warrantyEnd: m.warrantyEnd,
        warrantyStatus: m.warrantyStatus,
        invoiceContractNo: m.invoiceContractNo,
        organization: customer.organization,
        remark: m.machine?.remarks || null,
      }))
    );

    res.status(200).json({ success: true, data: machines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
