const Ticket = require("../models/ticket.model");
const Machine = require("../models/machine.model");
const Customer = require("../models/customer.model");
const Role = require("../models/role.model");
const ServicePricing = require("../models/servicePricing.model")
const { getFlag } = require("../utils/flagHelper");
const ChatRoom = require("../models/chatRoom.model");
const admin = require("../config/firebase");
const User = require("../models/user.model");
const mongoose = require("mongoose");

function generateTicketNumber() {
  return Math.floor(100000000000 + Math.random() * 900000000000).toString();
}
// ======================== GET ALL TICKETS ========================

exports.createTicket = async (req, res) => {
  try {
    const user = req.user;
    const {
      problem, errorCode, notes, ticketType, machineId, organisationId,
      type, engineerRemark, paymentStatus
    } = req.body;

    // ✅ ensure processor role
    const processorRole = await Role.findOne({ name: "processor" });
    if (!user.roles.includes(processorRole.name)) {
      return res.status(403).json({ message: "Only processor can create tickets" });
    }

    // ✅ validate machine link
    const machine = await Machine.findById(machineId);
    if (!machine) return res.status(404).json({ message: "Machine not found" });

    const customer = await Customer.findOne({
      users: user.id,
      "machines.machine": machineId
    });
    if (!customer) {
      return res.status(400).json({ message: "Machine not linked to this processor/customer" });
    }

    // ✅ get machine warranty details
    const machineDetails = customer.machines.find(
      m => m.machine.toString() === machineId
    );

    // ✅ enforce warranty restriction
    if (
      machineDetails.warrantyStatus === "Out Of Warranty" &&
      ticketType !== "Full Machine Service"
    ) {
      return res.status(400).json({
        message: "Only Full Machine Service allowed for out-of-warranty machines"
      });
    }

    // ✅ fetch matching pricing by ticketType + type + warranty
    const servicePricing = await ServicePricing.findOne(
      {
        organisation: organisationId,
        pricing: {
          $elemMatch: {
            ticketType: ticketType,
            supportMode: type,
            warrantyStatus: machineDetails.warrantyStatus
          }
        }
      },
      { "pricing.$": 1 }
    );

    let pricingData;

    if (
      !servicePricing ||
      !servicePricing.pricing ||
      servicePricing.pricing.length === 0
    ) {
      // ✅ Use default pricing if none found
      pricingData = {
        supportMode: type,
        warrantyStatus: machineDetails.warrantyStatus,
        ticketType: ticketType,
        cost: 0,
        currency: "USD",
        _id: new mongoose.Types.ObjectId()  // create fake ObjectId for reference
      };
    } else {
      pricingData = servicePricing.pricing[0];
    }

    // ✅ handle media uploads
    let media = [];
    if (req.files && req.files.length > 0) {
      const imageCount = req.files.filter(f => f.mimetype.startsWith("image/")).length;
      if (imageCount > 5) {
        return res.status(400).json({ message: "Maximum 5 images allowed" });
      }

      media = req.files.map(file => ({
        url: `/uploads/tickets/${file.filename}`,
        type: file.mimetype.startsWith("image/") ? "image" : "video"
      }));
    }

    // ✅ create ticket
    const ticket = new Ticket({
      ticketNumber: generateTicketNumber(),
      problem,
      errorCode,
      notes,
      ticketType,
      media,
      machine: machineId,
      processor: user.id,
      type,
      organisation: organisationId,
      engineerRemark,
      pricing: pricingData._id, // save pricing item id
      paymentStatus: paymentStatus || "unpaid"
    });

    await ticket.save();
    let chatRoom = await ChatRoom.findOne({ ticket: ticket.id });
    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        ticket: ticket._id,
        organisation: organisationId,
        processor: user.id, // processor creating the ticket
      });
    }
    // const otherUser = await User.findById(organisationId).select('fullName fcmToken');

    // if (otherUser?.fcmToken) {
    //   const notifPayload = {
    //     notification: {
    //       title: `New Ticket #${ticket.ticketNumber}`,
    //       body: `Problem: ${ticket.problem}`
    //     },
    //     data: {
    //       type: 'ticket_created',
    //       ticketNumber: ticket.ticketNumber,
    //       screenName: 'ticket'
    //     }
    //   };

    //   await admin.messaging().sendToDevice(otherUser.fcmToken, notifPayload);
    // }
    res.status(201).json({
      message: "Ticket created successfully",
      ticket,
      pricing: pricingData,
      chatRoom
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getTickets = async (req, res) => {
  try {
    const user = req.user;
    console.log(user);

    let tickets = [];
    const processorRole = await Role.findOne({ name: "processor" });
    const organisationRole = await Role.findOne({ name: 'organization' });
    console.log(organisationRole, "organisationRole");

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

    const ticket = await Ticket.findById(id)
      .populate("machine")
      .populate("processor", "fullName email phone countryCode")
      .populate("organisation", "fullName email phone countryCode");

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

// controllers/ticket.controller.js
exports.updateTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, notes, paymentStatus, reschedule_time, isActive } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // ✅ only organisation can update ticket
    if (ticket.organisation.toString() !== user.id.toString()) {
      return res.status(403).json({ message: "Only organization can update this ticket" });
    }

    // ✅ update allowed fields
    if (status) ticket.status = status;
    if (typeof isActive === "boolean") ticket.isActive = isActive;
    if (notes) ticket.notes = notes;
    if (paymentStatus) ticket.paymentStatus = paymentStatus;

    if (reschedule_time) {
      ticket.reschedule_time = reschedule_time; // e.g. "30" (minutes)

      // calculate reschedule_update_time = now + reschedule_time
      const now = new Date();
      const rescheduleUpdate = new Date(now.getTime() + reschedule_time * 60 * 1000);
      ticket.reschedule_update_time = rescheduleUpdate;
      ticket.IsShowChatOption = false; // hide chat when rescheduled
      ticket.status = "On Hold";
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

// ======================== GET TICKETS BY STATUS (with Pagination) ========================
// exports.getTicketsByStatus = async (req, res) => {
//   try {
//     const user = req.user;
//     let { status } = req.params; // status from URL param
//     let { page = 1, limit = 10 } = req.query;
//     page = parseInt(page);
//     limit = parseInt(limit);

//     const processorRole = await Role.findOne({ name: "processor" });
//     const organisationRole = await Role.findOne({ name: "organization" });

//     // ✅ base query
//     let query = { isActive: true };

//     if (!status || status === "all") {
//       // no filter – show all statuses
//     } else if (status === "active" || status === "Active") {
//       // active tab → everything except resolved
//       query.status = { $ne: "resolved" };
//     } else {
//       // specific status
//       query.status = status;
//     }

//     // ✅ restrict by user role
//     if (processorRole && user.roles.includes(processorRole.name)) {
//       query.processor = user.id;
//     } else if (organisationRole && user.roles.includes(organisationRole.name)) {
//       query.organisation = user.id;
//     } else {
//       return res.status(403).json({ message: "Not authorized" });
//     }

//     const total = await Ticket.countDocuments(query);

//     const tickets = await Ticket.find(query)
//       .populate("machine processor organisation")
//       .skip((page - 1) * limit)
//       .limit(limit)
//       .sort({ createdAt: -1 });
    
//     const data = await Promise.all(
//       tickets.map(async (t) => {
//         const chatRoom = await ChatRoom.findOne({ ticket: t._id })
//           .populate("organisation", "fullName email")
//           .populate("processor", "fullName email");
//         return {
//           ...t.toObject(),
//           chatRoom,
//         };
//       })
//     );

//     res.json({
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//       count: data.length,
//       data,
//     });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
exports.getTicketsByStatus = async (req, res) => {
  try {
    const user = req.user;
    let { status } = req.params; // status from URL param
    let { page = 1, limit = 10 } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);

    const processorRole = await Role.findOne({ name: "processor" });
    const organisationRole = await Role.findOne({ name: "organization" });

    // ✅ base query
    let query = { isActive: true };

    if (!status || status === "all") {
      // no filter – show all statuses
    } else if (status.toLowerCase() === "active") {
      query.status = { $ne: "resolved" };
    } else {
      query.status = status;
    }

    // ✅ restrict by user role
    if (processorRole && user.roles.includes(processorRole.name)) {
      query.processor = user.id;
    } else if (organisationRole && user.roles.includes(organisationRole.name)) {
      query.organisation = user.id;
    } else {
      return res.status(403).json({ message: "Not authorized" });
    }

    const total = await Ticket.countDocuments(query);

    const tickets = await Ticket.find(query)
      .populate("machine processor organisation")
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    const data = await Promise.all(
      tickets.map(async (t) => {
        // 🔍 find customerMachineDetails (to extract warrantyStatus)
        const customer = await Customer.findOne({
          users: t.processor._id,
          "machines.machine": t.machine._id,
        });

        let warrantyStatus = null;
        if (customer) {
          const machineDetails = customer.machines.find(
            (m) => m.machine.toString() === t.machine._id.toString()
          );
          if (machineDetails) {
            warrantyStatus = machineDetails.warrantyStatus;
          }
        }

        // 🔍 include chatRoom + warrantyStatus
        const chatRoom = await ChatRoom.findOne({ ticket: t._id })
          .populate("organisation", "fullName email")
          .populate("processor", "fullName email");

        return {
          ...t.toObject(),
          warrantyStatus, // ✅ added here
          chatRoom,
        };
      })
    );

    res.json({
      total,
      page,
      pages: Math.ceil(total / limit),
      count: data.length,
      data,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ======================== GET SUMMARY ========================


exports.getSummary = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id)
      .populate("machine")
      .populate("processor", "fullName email phone countryCode")
      .populate("organisation", "fullName email phone countryCode");

    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // 🔍 fetch pricing details manually from ServicePricing
    let pricingDetails = null;
    if (ticket.pricing) {
      const servicePricing = await ServicePricing.findOne(
        { "pricing._id": ticket.pricing },
        { "pricing.$": 1 }
      );
      if (servicePricing && servicePricing.pricing.length > 0) {
        pricingDetails = servicePricing.pricing[0];
      }
    }

    // 🔍 fetch customer machine details
    let customerMachineDetails = null;
    const customer = await Customer.findOne({
      users: ticket.processor._id,
      "machines.machine": ticket.machine._id
    });

    if (customer) {
      customerMachineDetails = customer.machines.find(
        m => m.machine.toString() === ticket.machine._id.toString()
      );
    }
    console.log(customer);

    // ✅ Add flag + userImage
    const processorDetails = ticket.processor
      ? {
        ...ticket.processor.toObject(),
        flag: getFlag(customer.countryOrigin),
        userImage:
          "https://images.unsplash.com/vector-1741673838666-b92722040f4f?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0"
      }
      : null;

    const organisationDetails = ticket.organisation
      ? {
        ...ticket.organisation.toObject(),
        flag: getFlag(customer.countryOrigin),
        userImage:
          "https://images.unsplash.com/vector-1741673838666-b92722040f4f?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0"
      }
      : null;
    const chatRoom = await ChatRoom.findOne({ ticket: ticket._id })
      .populate("organisation", "fullName email")
      .populate("processor", "fullName email");
    res.json({
      ticketDetails: {
        id: ticket._id,
        ticketNumber: ticket.ticketNumber,
        problem: ticket.problem,
        errorCode: ticket.errorCode,
        status: ticket.status,
        type: ticket.type,
        ticketType: ticket.ticketType,
        notes: ticket.notes,
        engineerRemark: ticket.engineerRemark,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        paymentStatus: ticket.paymentStatus,
        media: ticket.media,
        IsShowChatOption: ticket.IsShowChatOption
      },
      machineDetails: ticket.machine,
      customerMachineDetails,
      processorDetails, // ✅ includes flag + image
      organisationDetails, // ✅ includes flag + image
      pricingDetails,
      chatRoom
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



