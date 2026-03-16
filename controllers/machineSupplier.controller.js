const Customer = require("../models/customer.model");
const Machine = require("../models/machine.model");
const User = require("../models/user.model");
const Employee = require("../models/employee.model");
const { getFlag, getFlagWithCountryCode } = require("../utils/flagHelper");
async function isProcessor(userId) {

  const user = await User.findById(userId).populate("roles");

  const roleNames = user?.roles?.map(r => r.name) || [];

  if (roleNames.includes("processor")) {
    return true;
  }

  // Check employee designation
  const employee = await Employee.findOne({ linkedUser: userId })
    .populate("designation", "name");
  console.log(employee,"employee ===>");
  
  if (
    employee
  ) {
    return true;
  }

  return false;
}

exports.getMachineSupplierList = async (req, res) => {
  try {

    const userId = req.user.id;

    const hasAccess = await isProcessor(userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Only processor role can access this"
      });
    }

    const customers = await Customer.find({
      users: userId,
      isActive: true,
    })
      .populate({
        path: "organization",
        select: "fullName email phone countryCode",
      })
      .populate("machines.machine");

    const result = customers
      .map(cust => {
        const customerObj = cust.toObject();

        customerObj.machines = (customerObj.machines || []).filter(
          m => m.machine !== null && m.machine !== undefined
        );

        if (customerObj.machines.length === 0) return null;

        customerObj.flag = getFlagWithCountryCode(
          customerObj?.organization?.countryCode || "+91"
        );

        return { customer: customerObj };
      })
      .filter(Boolean);

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (err) {
    console.error("Error in getMachineSupplierList:", err);
    return res.status(500).json({ error: err.message });
  }
};



exports.getMachineOverview = async (req, res) => {
  try {

    const userId = req.user.id;

    const hasAccess = await isProcessor(userId);

    if (!hasAccess) {
      return res.status(403).json({
        message: "Only processor role can access machine overview"
      });
    }

    const customers = await Customer.find({
      users: userId,
      isActive: true
    }).populate({
      path: "machines.machine",
      select: "machineName modelNumber machine_type status isActive remarks",
    });

    if (!customers || customers.length === 0) {
      return res.status(200).json({
        message: "Customer not found for this processor"
      });
    }

    const machines = customers.flatMap(customer =>
      customer.machines.map(m => ({
        machineId: m.machine?._id,
        machineName: m.machine?.machineName,
        modelNumber: m.machine?.modelNumber,
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

    res.status(200).json({
      success: true,
      data: machines
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
exports.getUserMachines = async (req, res) => {
  try {

    const userId = req.user.id;

    const user = await User.findById(userId).populate("roles");
    const roleNames = user?.roles?.map(r => r.name) || [];

    const result = [];

    //////////////////////////////////////////////////////
    // PROCESSOR MACHINES
    //////////////////////////////////////////////////////

    if (roleNames.includes("processor")) {

      const customers = await Customer.find({
        users: userId,
        isActive: true,
      })
        .populate({
          path: "organization",
          select: "_id fullName email phone countryCode",
        })
        .populate("machines.machine");

      const processorMachines = customers
        .map(cust => {

          const customerObj = cust.toObject();

          customerObj.machines = (customerObj.machines || []).filter(
            m => m.machine !== null && m.machine !== undefined
          );

          if (customerObj.machines.length === 0) return null;

          customerObj.flag = getFlagWithCountryCode(
            customerObj?.organization?.countryCode || "+91"
          );

          return { customer: customerObj };

        })
        .filter(Boolean);

      result.push(...processorMachines);
    }

    //////////////////////////////////////////////////////
    // EMPLOYEE MACHINES
    //////////////////////////////////////////////////////

    const employee = await Employee.findOne({ linkedUser: userId })
      .populate({
        path: "machine",
        select: "machineName modelNumber machine_type status isActive remarks"
      });

    if (employee && employee.machine) {

      const machines = Array.isArray(employee.machine)
        ? employee.machine
        : [employee.machine];

      const employeeMachines = machines.map(machine => ({
        machine,
        purchaseDate: null,
        installationDate: null,
        warrantyStart: null,
        warrantyEnd: null,
        warrantyStatus: null,
        invoiceContractNo: null
      }));

      result.push({
        customer: {
          _id: employee._id,
          organization: {
            _id: employee._id,   // ✅ added org id
            fullName: employee.name,
            email: employee.email,
            phone: employee.phone,
            countryCode: "+91"
          },
          machines: employeeMachines,
          flag: getFlagWithCountryCode("+91")
        }
      });

    }

    //////////////////////////////////////////////////////
    // RESPONSE
    //////////////////////////////////////////////////////

    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (err) {

    console.error("Error in getUserMachines:", err);

    return res.status(500).json({
      error: err.message
    });

  }
};