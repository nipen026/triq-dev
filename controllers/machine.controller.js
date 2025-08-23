const Machine = require("../models/machine.model");

// Helper: pick only allowed fields from body
const pickMachineFields = (body) => {
  return {
    machineName: body.machineName,
    modelNumber: body.modelNumber,
    serialNumber: body.serialNumber,
    functionality: body.functionality,
    processingDimensions: body.processingDimensions,
    totalPower: body.totalPower,
    manualsLink: body.manualsLink,
    notes: body.notes,
    status: body.status
  };
};

// ✅ Create Machine (only organization role)
exports.createMachine = async (req, res) => {
  try {
    if (!req.user.roles.includes("organization")) {
      return res.status(403).json({ message: "Only organization role can create a machine" });
    }

    const machineData = pickMachineFields(req.body);
    const machine = new Machine(machineData);
    await machine.save();

    res.status(201).json({ message: "Machine created successfully", data: machine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get All Active Machines
exports.getMachines = async (req, res) => {
  try {
    const machines = await Machine.find({ isActive: true });
    res.json({ count: machines.length, data: machines });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get Single Machine by ID (only if active)
exports.getMachineById = async (req, res) => {
  try {
    const machine = await Machine.findOne({ _id: req.params.id, isActive: true });
    if (!machine) return res.status(404).json({ message: "Machine not found or inactive" });

    res.json(machine);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update Machine (only organization role)
exports.updateMachine = async (req, res) => {
  try {
    if (!req.user.roles.includes("organization")) {
      return res.status(403).json({ message: "Only organization role can update a machine" });
    }

    const machineData = pickMachineFields(req.body);
    const machine = await Machine.findOneAndUpdate(
      { _id: req.params.id, isActive: true },
      machineData,
      { new: true }
    );

    if (!machine) return res.status(404).json({ message: "Machine not found or inactive" });

    res.json({ message: "Machine updated successfully", data: machine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Soft Delete Machine (set isActive:false)
exports.deleteMachine = async (req, res) => {
  try {
    if (!req.user.roles.includes("organization")) {
      return res.status(403).json({ message: "Only organization role can delete a machine" });
    }

    const machine = await Machine.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!machine) return res.status(404).json({ message: "Machine not found" });

    res.json({ message: "Machine deactivated (soft deleted)", data: machine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
