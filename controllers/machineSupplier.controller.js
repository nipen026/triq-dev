const Customer = require("../models/customer.model");
const Machine = require("../models/machine.model");
const User = require("../models/user.model");

exports.getMachineSupplierList = async (req, res) => {
  try {
    const userId = req.user.id; // user id from token middleware
    const user = await User.findById(userId).populate("roles");
    console.log(user);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check role
    const roleNames = user.roles.map(r => r.name); // assuming Role model has `name`

    let result = {};

    if (roleNames.includes("processor")) {
      // Fetch this customer's machines
      const customer = await Customer.findOne({ users: userId, isActive: true })
        .populate("machines.machine");

      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      result = {
        machines: customer.machines.map(m => m.machine),
      };
    } 
    
    else if (roleNames.includes("organization")) {
      // Fetch all customers under this organization
      const customers = await Customer.find({ organization: userId, isActive: true })
        .populate("machines.machine");

      result = customers
    } 
    
    else {
      return res.status(403).json({ message: "Role not allowed" });
    }

    res.json({ data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
