const Ticket = require("../models/ticket.model");
const Machine = require("../models/machine.model");
const Customer = require("../models/customer.model");
const Role = require("../models/role.model");

// ======================== CREATE TICKET ========================
exports.createTicket = async (req, res) => {
  try {
    const user = req.user;
    
    const { problem, errorCode, notes, ticketType, machineId, organisationId,type } = req.body;

    // Validate Processor Role
    const processorRole = await Role.findOne({ name: "processor" });
    console.log(user.roles.includes(processorRole.name),"processorRole");
    
    if (!user.roles.includes(processorRole.name)) {
      return res.status(403).json({ message: "Only Processor (customer company) can create tickets" });
    }

    // Validate Machine
    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    // Check customer-machine link
    const customer = await Customer.findOne({ organisation: user._id, "machines.machine": machineId });
    if (!customer) return res.status(400).json({ message: "Machine not linked to this processor/customer" });

    const machineDetails = customer.machines.find(m => m.machine.toString() === machineId);
    if (machineDetails.warrantyStatus === "Out Of Warranty" && ticketType !== "Full Machine Service") {
      return res.status(400).json({ message: "Only Full Machine Service allowed for out-of-warranty machines" });
    }

    // Handle media uploads (max 5 images)
    let media = [];
    if (req.files && req.files.length > 0) {
      const imageCount = req.files.filter(f => f.mimetype.startsWith("image/")).length;
      if (imageCount > 5) return res.status(400).json({ message: "Maximum 5 images allowed" });

      media = req.files.map(file => ({
        url: `/uploads/tickets/${file.filename}`,
        type: file.mimetype.startsWith("image/") ? "image" : "video"
      }));
    }

    // Create Ticket
    const ticket = new Ticket({
      problem,
      errorCode,
      notes,
      ticketType,
      media,
      machine: machineId,
      processor: user.id,
      type,
      organisation: organisationId
    });

    await ticket.save();
    res.status(201).json({ message: "Ticket created successfully", ticket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ======================== GET ALL TICKETS ========================
exports.getTickets = async (req, res) => {
  try {
    const user = req.user;
    let tickets = [];
    const processorRole = await Role.findOne({ name: "processor" });
    const organisationRole = await Role.findOne({ name: "organisation" });
    
    if (processorRole && user.roles.includes(processorRole.name)) {
      tickets = await Ticket.find({ processor: user.id, isActive: true })
        .populate("machine processor organisation");
      
    } else if (organisationRole && user.roles.includes(organisationRole.name)) {
       tickets = await Ticket.find({ organisation: user.id, isActive: true })
        .populate("machine processor organisation");        
    }
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ======================== GET TICKET BY ID ========================
exports.getTicketById = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
   
    
    const ticket = await Ticket.findOne({ _id: id, isActive: true })
      .populate("machine processor organisation");
    
    
    if (!ticket) return res.status(404).json({ message: "Active ticket not found" });

    if (
      ticket.processor.id.toString() === user.id.toString() ||
      ticket.organisation.id.toString() === user.id.toString()
    ) {
      return res.json(ticket);
    }

    return res.status(403).json({ message: "Not authorized to view this ticket" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ======================== UPDATE TICKET ========================
exports.updateTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, isActive, notes } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Update status only by organisation
    if (status) {
      if (ticket.organisation.toString() !== user._id.toString()) {
        return res.status(403).json({ message: "Only organisation can update ticket status" });
      }
      ticket.status = status;
    }

    // Update isActive by processor or organisation
    if (typeof isActive === "boolean") {
      if (
        ticket.processor.toString() !== user._id.toString() &&
        ticket.organisation.toString() !== user._id.toString()
      ) {
        return res.status(403).json({ message: "Not allowed to update active status" });
      }
      ticket.isActive = isActive;
    }

    // Update notes by organisation
    if (notes && ticket.organisation.toString() === user._id.toString()) {
      ticket.notes = notes;
    }

    await ticket.save();
    res.json({ message: "Ticket updated successfully", ticket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ======================== DUMMY DATA FOR CREATE TICKET ========================
/*
Example request body for POST /tickets:

{
  "problem": "Machine overheating frequently",
  "errorCode": "E-101",
  "notes": "Check cooling system",
  "ticketType": "General Check Up",
  "machineId": "64f7a2f7b8c9a2b3c1d4e567",
  "organisationId": "64f7a2f7b8c9a2b3c1d4e890"
}
*/


exports.DeleteTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Only creator (Processor) or assigned Organisation can soft delete
    if (
      ticket.processor.toString() !== user._id.toString() &&
      ticket.organisation.toString() !== user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized to delete this ticket" });
    }

    ticket.isActive = false;
    await ticket.save();

    res.json({ message: "Ticket soft deleted successfully", ticket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
