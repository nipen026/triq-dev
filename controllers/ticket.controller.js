const Ticket = require("../models/ticket.model");
const Machine = require("../models/machine.model");
const Customer = require("../models/customer.model");
const Role = require("../models/role.model");
const ServicePricing = require("../models/servicePricing.model")
const { getFlag, getFlagWithCountryCode } = require("../utils/flagHelper");
const ChatRoom = require("../models/chatRoom.model");
const admin = require("../config/firebase");
const User = require("../models/user.model");
const Sound = require('../models/sound.model');
const Notification = require('../models/notification.model')
const mongoose = require("mongoose");
const socket = require("../socket/socketInstance"); // import socket utility
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
    console.log(organisationId, "organisationId");

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
      // paymentStatus: paymentStatus || "paid"
      paymentStatus: "paid"
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
    const otherUser = await User.findById(organisationId).select('fullName fcmToken');

    console.log(otherUser, "otherUser?.fcmToken");

    if (otherUser?.fcmToken) {
      // const notifPayload = {
      //   notification: {
      //     title: `New Ticket #${ticket.ticketNumber}`,
      //     body: `Problem: ${ticket.problem}`
      //   },
      //   data: {
      //     type: 'ticket_created',
      //     ticketNumber: ticket.ticketNumber,
      //     ticketId: ticket._id.toString(),
      //     screenName: 'ticket'
      //   }
      // };
      const notificationMessage = `New Ticket "${ticket.ticketNumber}" has been assigned.`;
      const notification = new Notification({
        title: "Ticket Created Successfully",
        body: notificationMessage,
        type: 'ticketRequest',
        receiver: organisationId, // who triggered the notification
        sender: user.id,
        read: false,
        data: {
          type: 'ticket_created',
          ticketNumber: ticket.ticketNumber,
          screenName: 'TicketDetailsView',
          ticketId: ticket._id.toString(),
          Route: '/ticketDetails'
        },
        createdAt: new Date()
      });
      await notification.save();

      // await admin.messaging().sendEachForMulticast({
      //   tokens: [otherUser.fcmToken],
      //   notification: notifPayload.notification,
      //   data: notifPayload.data,
      // });
      // await admin.messaging().sendEachForMulticast({
      //   tokens: [otherUser.fcmToken],
      //   notification: {
      //     title: `New Ticket #${ticket.ticketNumber}`,
      //     body: `Problem: ${ticket.problem}`,
      //   },
      //   data: {
      //     type: 'ticket_created',
      //     ticketNumber: String(ticket.ticketNumber),
      //     ticketId: String(ticket._id),
      //     screenName: 'ticket',
      //   },
      // }).then((response) =>
      //   console.log("📨 Notification sent:", response.successCount, "success")
      // );
      const soundData = await Sound.findOne({ type: "ticket_notification", user: otherUser._id });
      const dynamicSoundName = soundData.soundName;
      const androidNotification = {
        channelId: "triq_custom_sound_channel",
        sound: dynamicSoundName,
      };
      const response = await admin.messaging().sendEachForMulticast({
        tokens: [otherUser.fcmToken],

        data: {
          title: `New Ticket #${ticket.ticketNumber}`,
          body: `Problem: ${ticket.problem}`,
          type: 'ticket_created',
          ticketNumber: String(ticket.ticketNumber),
          ticketId: String(ticket._id),
          Route: '/ticketDetails',
          screenName: 'TicketDetailsView',
          soundName: dynamicSoundName,

        },
        android: {
          priority: "high",
        },

        // 4. iOS options
        apns: {
          headers: { "apns-priority": "10" },
          payload: {
            aps: {
              // ❌ ERROR FIX: Aapke code me space tha ` ${...}`. Maine space hata diya.
              sound: `${dynamicSoundName}.aiff`,

              // ✅ IMPORTANT: Ye line zaroori hai taaki background me Flutter code chale
              "content-available": 1,
              "mutable-content": 1,
            },
          },
        }
      });

      response.responses.forEach((r, i) => {
        if (!r.success) console.log("❌ FCM Error:", r.error?.message);
      });

    }
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

exports.updateTicket = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { status, notes, paymentStatus, reschedule_time, isActive, engineerRemark } = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // ✅ only organisation can update ticket
    if (ticket.organisation.toString() !== user.id.toString()) {
      return res.status(403).json({ message: "Only organization can update this ticket" });
    }

    // 🔍 Track field updates
    const updatedFields = [];

    if (status && ticket.status !== status) {
      updatedFields.push(`Status changed to "${status}"`);
      ticket.status = status;
      if (status === "Resolved") {
        ticket.isFirstTimeServiceDone = true;
      }
    }
    if (typeof isActive === "boolean" && ticket.isActive !== isActive) {
      updatedFields.push(`Active status changed to "${isActive}"`);
      ticket.isActive = isActive;
    }
    if (notes && ticket.notes !== notes) {
      updatedFields.push(`Notes updated`);
      ticket.notes = notes;
    }
    if (paymentStatus && ticket.paymentStatus !== paymentStatus) {
      updatedFields.push(`Payment status updated to "${paymentStatus}"`);
      ticket.paymentStatus = paymentStatus;
    }
    if (engineerRemark && ticket.engineerRemark !== engineerRemark) {
      updatedFields.push(`Engineer remark updated`);
      ticket.engineerRemark = engineerRemark;
    }

    if (reschedule_time) {
      updatedFields.push(`Ticket rescheduled by ${reschedule_time} minutes`);
      ticket.reschedule_time = reschedule_time;

      const now = new Date();
      const rescheduleUpdate = new Date(now.getTime() + reschedule_time * 60 * 1000);
      ticket.reschedule_update_time = rescheduleUpdate;
      ticket.IsShowChatOption = true;
      ticket.status = "On Hold";
    }

    // 🧠 If no field actually updated
    if (updatedFields.length === 0) {
      return res.status(400).json({ message: "No changes detected in the ticket" });
    }

    // 📨 Prepare dynamic notification message
    const changes = updatedFields.join(", ");
    const notificationMessage = `Ticket #${ticket.ticketNumber} has been updated: ${changes}.`;

    // 🛎️ Save notification in DB
    const notification = new Notification({
      title: "Ticket Updated",
      body: notificationMessage,
      type: "message",
      receiver: ticket.processor,
      sender: ticket.organisation,
      read: false,
      createdAt: new Date(),
    });
    await notification.save();

    // 📲 Send FCM notification
    const otherUser = await User.findById(ticket.processor).select("fullName fcmToken");
    if (otherUser?.fcmToken) {
      const soundData = await Sound.findOne({ type: "ticket_notification", user: ticket.processor });
      const dynamicSoundName = soundData.soundName;
      const androidNotification = {
        channelId: "triq_custom_sound_channel",
        sound: dynamicSoundName,
      };



      await admin.messaging().sendEachForMulticast({
        tokens: [otherUser.fcmToken],
        data: {
          title: `Ticket #${ticket.ticketNumber} has been updated: ${changes}.`,
          body: changes,
          type: "ticket_updated",
          ticketNumber: ticket.ticketNumber,
          screenName: "ticket",
          soundName: dynamicSoundName
        },
        android: {
          priority: "high",
        },

        // 4. iOS options
        apns: {
          headers: { "apns-priority": "10" },
          payload: {
            aps: {
              // ❌ ERROR FIX: Aapke code me space tha ` ${...}`. Maine space hata diya.
              sound: `${dynamicSoundName}.aiff`,

              // ✅ IMPORTANT: Ye line zaroori hai taaki background me Flutter code chale
              "content-available": 1,
              "mutable-content": 1,
            },
          },
        }
      });
    }
    await ticket.save();
    const receiverId =
      user.id === String(ticket.organisation)
        ? String(ticket.processor)
        : String(ticket.organisation);
    const io = socket.getIO();
    io.to(receiverId).emit("ticketStatusUpdated", ticket);
    res.json({ message: "Ticket updated successfully", updatedFields, ticket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ======================== DUMMY DATA FOR CREATE TICKET ========================



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
      query.status = { $ne: "Resolved" };
      query.status = { $ne: "Rejected" };

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
          .populate("organisation", "fullName email ")
          .populate("processor", "fullName email");
        let flag = null;
        if (t.organisation?.countryCode || t.processor?.countryCode) {
          const phone =
            t.organisation?.countryCode || t.processor?.countryCode; // pick whichever available
          flag = getFlagWithCountryCode(phone); // e.g. +91 → "in"
        }
        return {
          ...t.toObject(),
          warrantyStatus, // ✅ added here
          chatRoom,
          flag
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
    const user = req.user;
    console.log(user.roles[0], "user");

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
        flag: getFlagWithCountryCode(ticket.processor.countryCode),
        userImage:
          "https://images.unsplash.com/vector-1741673838666-b92722040f4f?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0"
      }
      : null;

    const organisationDetails = ticket.organisation
      ? {
        ...ticket.organisation.toObject(),
        flag: getFlagWithCountryCode(ticket.organisation.countryCode),
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
        IsShowChatOption: ticket.IsShowChatOption,
        isFirstTimeServiceDone: ticket.isFirstTimeServiceDone
      },
      machineDetails: ticket.machine,
      customerMachineDetails,
      processorDetails, // ✅ includes flag + image
      organisationDetails, // ✅ includes flag + image
      pricingDetails,
      chatRoom,
      role: user.roles[0]
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.reportTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { reportTitle, reportDescription } = req.body;

    // Validate input
    if (!reportTitle || !reportDescription) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    // Find the ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // Update the ticket with report details
    ticket.reportTitle = reportTitle;
    ticket.reportDescription = reportDescription;
    await ticket.save();

    res.json({ message: "Ticket reported successfully", ticket });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// exports.getResolvedTickets = async (req, res) => {
//   try {
//     const user = req.user;
//     const tickets = await Ticket.find({
//       organisation: user.id,
//       status: "Resolved",
//       isActive: true
//     }).populate("machine processor organisation");

//     res.json(tickets);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };
exports.getResolvedTickets = async (req, res) => {
  try {
    const user = req.user;
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const skip = (page - 1) * limit;

    // ✅ Only resolved + active + has rating & feedback
    const tickets = await Ticket.find({
      organisation: user.id,
      status: "Resolved",
      isActive: true,
      rating: { $exists: true, $ne: "" },
      feedback: { $exists: true, $ne: "" }
    })
      .populate("machine processor organisation")
      .skip(skip)
      .limit(limit)
      .sort({ updatedAt: -1 }); // newest first

    res.json(tickets);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// exports.updateTicketRating = async (req, res) => {
//   try {
//     const user = req.user;
//     const { id } = req.params;
//     const { rating, feedback } = req.body;

//     // Validate input
//     if (!rating) {
//       return res.status(400).json({ message: "Rating is required" });
//     }

//     // Find the ticket
//     const ticket = await Ticket.findById(id);
//     ticket.isFirstTimeServiceDone = false;
//     //Proccessor can rate only organisation tickets

//     const processorRole = await Role.findOne({ name: "processor" });
//     if (!user.roles.includes(processorRole.name)) {
//       return res.status(403).json({ message: "Only processor can add rating" });
//     }


//     if (!ticket) {
//       return res.status(404).json({ message: "Ticket not found" });
//     }

//     // Update the ticket with rating and feedback
//     ticket.rating = rating;
//     ticket.feedback = feedback;
//     await ticket.save();
//     const receiverId =
//       user.id === String(ticket.organisation)
//         ? String(ticket.processor)
//         : String(ticket.organisation);
//     const userData = await User.findById({ receiverId }).select('fcmToken');
//     const soundData = await Sound.findOne({ type: "ticket_notification", user: receiverId });
//     const dynamicSoundName = soundData.soundName;
//     await admin.messaging().sendEachForMulticast({
//       tokens: [userData.fcmToken],
//       data: {
//         title: `Ticket #${ticket.ticketNumber} has been added feedback.`,
//         body: changes,
//         type: "ticket_feedback",
//         ticketNumber: ticket.ticketNumber,
//         screenName: "ticket",
//         soundName: dynamicSoundName
//       },
//       android: {
//         priority: "high",
//       },
//       // 4. iOS options
//       apns: {
//         headers: { "apns-priority": "10" },
//         payload: {
//           aps: {
//             // ❌ ERROR FIX: Aapke code me space tha ` ${...}`. Maine space hata diya.
//             sound: `${dynamicSoundName}.aiff`,

//             // ✅ IMPORTANT: Ye line zaroori hai taaki background me Flutter code chale
//             "content-available": 1,
//             "mutable-content": 1,
//           },
//         },
//       }
//     });
//     res.json({ message: "Ticket rating updated successfully", ticket });
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// }

exports.updateTicketRating = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { rating, feedback } = req.body;

    if (!rating) {
      return res.status(400).json({ message: "Rating is required" });
    }

    // 1️⃣ Find ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    // 2️⃣ Role validation (processor only)
    const processorRole = await Role.findOne({ name: "processor" });
    const hasProcessorRole = user.roles.some(
      r => r.toString() === processorRole._id.toString()
    );

    if (!hasProcessorRole) {
      return res.status(403).json({ message: "Only processor can add rating" });
    }

    // 3️⃣ Update ticket
    ticket.rating = rating;
    ticket.feedback = feedback || "";
    ticket.isFirstTimeServiceDone = false;
    await ticket.save();

    // 4️⃣ Identify receiver
    const receiverId =
      user.id === String(ticket.organisation)
        ? String(ticket.processor)
        : String(ticket.organisation);

    const receiver = await User.findById(receiverId).select("fcmToken");
    if (!receiver?.fcmToken) {
      return res.json({
        message: "Rating updated (receiver has no FCM token)",
        ticket
      });
    }

    // 5️⃣ Sound
    const soundData = await Sound.findOne({
      user: receiverId,
      type: "ticket_notification"
    });

    const soundName = soundData?.soundName || "default";

    // 6️⃣ Send notification
    await admin.messaging().send({
      token: receiver.fcmToken,
      notification: {
        title: `Ticket #${ticket.ticketNumber} rated`,
        body: feedback || "New feedback added"
      },
      data: {
        type: "ticket_feedback",
        ticketId: ticket._id.toString(),
        ticketNumber: ticket.ticketNumber.toString(),
        screenName: "ticket",
        soundName
      },
      android: {
        priority: "high",
        notification: {
          sound: soundName
        }
      },
      apns: {
        headers: {
          "apns-priority": "10"
        },
        payload: {
          aps: {
            sound: `${soundName}.aiff`,
            "content-available": 1,
            "mutable-content": 1
          }
        }
      }
    });

    res.json({ message: "Ticket rating updated successfully", ticket });

  } catch (err) {
    console.error("updateTicketRating error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
