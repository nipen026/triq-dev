const Employee = require("../models/employee.model");
const User = require('../models/user.model');
const Department = require("../models/department.model");
const Designation = require("../models/designation.model");
const ExternalContact = require("../models/externalContact.model"); // we'll define this below
const Profile = require("../models/profile.model");
const admin = require("firebase-admin");
const Sound = require("../models/sound.model");
const Notification = require("../models/notification.model");
const ContactChatRoom = require("../models/contactChatRoom.model");
const ContactChatMessage = require("../models/contactChatMessage.model");
const { getFlag } = require("../utils/flagHelper");

exports.addExternalContact = async (req, res) => {
  try {
    const user = req.user;
    const { name, email, phone } = req.body;

    // ✅ Step 1: Check if the person already exists as an Employee
    const existingEmployee = await Employee.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone: phone },
      ],
    })
      .populate("designation", "name")
      .populate("department", "name")
      .lean();

    if (existingEmployee) {
      // ✅ Step 2: Create external contact linked to existing employee details
      const newContact = await ExternalContact.create({
        name: existingEmployee.name || name,
        email: existingEmployee.email || email,
        phone: existingEmployee.phone || phone,
        addedBy: user.id,
        linkedEmployee: existingEmployee._id, // 🔹 Optional: Add field to link them
      });

      return res.status(200).json({
        status: 1,
        message: "External contact added successfully (existing employee linked)",
        data: newContact,
      });
    }

    // ✅ Step 3: Otherwise, create as a normal new external contact
    const newContact = await ExternalContact.create({
      name,
      email,
      phone,
      addedBy: user.id,
    });

    return res.status(200).json({
      status: 1,
      message: "External contact added successfully",
      data: newContact,
    });
  } catch (error) {
    console.error("❌ Error adding external contact:", error);
    return res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};




exports.getDepartmentalContacts = async (req, res) => {
  try {
    const user = req.user;

    const employees = await Employee.find({ user: user.id })
      .populate("department", "name")
      .populate("designation", "name")
      .sort({ name: 1 })
      .lean();

    if (!employees.length) {
      return res.status(200).json({
        status: 1,
        message: "No employees found",
        data: [],
      });
    }

    const data = employees.map(emp => ({
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation?.name || "—",
      department: emp.department?.name || "—",
      profilePhoto: emp.profilePhoto || null,
      status: emp.isActive ? "Active" : "Inactive",
    }));

    res.status(200).json({
      status: 1,
      message: "Departmental contacts fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Error fetching departmental contacts:", error);
    res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};


exports.getExternalContacts = async (req, res) => {
  try {
    const user = req.user;

    const contacts = await ExternalContact.find({ addedBy: user.id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      status: 1,
      message: "External contacts fetched successfully",
      data: contacts.map(c => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        organizationName: c.organizationName,
        profilePhoto: c.profilePhoto || null,
      })),
    });
  } catch (error) {
    console.error("Error fetching external contacts:", error);
    res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.searchContacts = async (req, res) => {
  try {
    const { q } = req.query; // type can be "organization" or "processor"
    const regex = new RegExp(q, "i");

    // search employees by name/email/phone
    const employeeFilter = {
      $or: [
        { name: regex },
        { email: regex },
        { phone: regex },
      ],
    };

    const employees = await Employee.find(employeeFilter)
      .populate("designation", "name")
      .populate("department", "name")
      .lean();

    // search external contacts too
    const externals = await ExternalContact.find({
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    }).lean();

    res.status(200).json({
      status: 1,
      message: "Search results fetched",
      data: {
        employees: employees.map(e => ({
          _id: e._id,
          name: e.name,
          designation: e.designation?.name,
          department: e.department?.name,
          profilePhoto: e.profilePhoto,
          type: "employee",
        })),
        externals: employees.map(e => ({
          _id: e._id,
          name: e.name,
          organizationName: e.organizationName,
          profilePhoto: e.profilePhoto,
          type: "external",
        })),
      },
    });
  } catch (error) {
    console.error("Error in contact search:", error);
    res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};

// exports.getAllContacts = async (req, res) => {
//   try {
//     const user = req.user;
//     const { type } = req.params;

//     // 🔹 1. Always fetch both (then we filter below)
//    const employees = await Employee.find({ user: user.id })
//       .populate("department", "name")
//       .populate("designation", "name")
//       .sort({ name: 1 })
//       .lean();

//      const contacts = await ExternalContact.find({ addedBy: user.id })
//       .sort({ createdAt: -1 })
//       .lean();

//     // 🔹 2. Format employee data
//     const employeeData = employees.map(emp => ({
//       _id: emp._id,
//       name: emp.name,
//       email: emp.email,
//       phone: emp.phone,
//       designation: emp.designation?.name || "—",
//       department: emp.department?.name || "—",
//       profilePhoto: emp.profilePhoto || null,
//       status: emp.isActive ? "Active" : "Inactive",
//       type: "employee", // flag
//       flag:getFlag(emp.country),
//     }));
//     // 🔹 3. Format external data
//     const externalData = contacts.map(c => ({
//       _id: c._id,
//       name: c.name,
//       email: c.email,
//       phone: c.phone,
//       designation: null,
//       department: null,
//       profilePhoto: c.profilePhoto || null,
//       status: null,
//       type: "external", // flag
//       flag:getFlag(c.country),
//     }));
//     // 🔹 4. Decide what to return based on type param
//     let data = [];

//     if (type === "department") {
//       data = employeeData;
//     } else if (type === "external") {
//       data = externalData;
//     } else {
//       data = [...employeeData, ...externalData];
//     }

//     // 🔹 5. Sort alphabetically
//     data.sort((a, b) => a.name.localeCompare(b.name));

//     return res.status(200).json({
//       status: 1,
//       message:
//         type === "department"
//           ? "Departmental contacts fetched successfully"
//           : type === "external"
//           ? "External contacts fetched successfully"
//           : "All contacts fetched successfully",
//       data,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching contacts:", error);
//     res.status(500).json({
//       status: 0,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };
// exports.getAllContacts = async (req, res) => {
//   try {
//     const user = req.user;
//     const { type } = req.params;

//     // ✅ 1️⃣ Get current user's employee info (to match chat room sender)
//     const currentEmployee = await Employee.findOne({ user: user.id });
//     if (!currentEmployee) {
//       return res.status(404).json({
//         status: 0,
//         message: "Employee record not found for current user",
//       });
//     }

//     // ✅ 2️⃣ Fetch employees under current user
//     const employees = await Employee.find({ user: user.id })
//       .populate("department", "name")
//       .populate("designation", "name")
//       .sort({ name: 1 })
//       .lean();

//     // ✅ 3️⃣ Fetch external contacts
//     const contacts = await ExternalContact.find({ addedBy: user.id })
//       .sort({ createdAt: -1 })
//       .lean();

//     // ✅ 4️⃣ Preload chat rooms for efficiency
//     const userRooms = await ContactChatRoom.find({
//       $or: [
//         { employee_sender: user.id },
//         { employee_receiver: user.id },
//       ],
//     }).lean();

//     // Helper function to get chat room (if exists)
//     const findChatRoom = (receiverUserId) => {
//       return userRooms.find(
//         (room) =>
//           (room.employee_sender.toString() === user.id.toString() &&
//             room.employee_receiver.toString() === receiverUserId.toString()) ||
//           (room.employee_sender.toString() === receiverUserId.toString() &&
//             room.employee_receiver.toString() === user.id.toString())
//       );
//     };

//     // ✅ 5️⃣ Format employee data
//     const employeeData = await Promise.all(
//       employees.map(async (emp) => {
//         // Find linked user for this employee (needed to match chat)
//         const linkedUser = await User.findOne({
//           email: emp.email,
//           fullName: emp.name,
//         }).lean();

//         const room = linkedUser ? findChatRoom(linkedUser._id) : null;

//         return {
//           _id: emp._id,
//           name: emp.name,
//           email: emp.email,
//           phone: emp.phone,
//           designation: emp.designation?.name || "—",
//           department: emp.department?.name || "—",
//           profilePhoto: emp.profilePhoto || null,
//           status: emp.isActive ? "Active" : "Inactive",
//           type: "employee",
//           flag: getFlag(emp.country),
//           chatRoom: room
//             ? { exists: true, roomId: room._id }
//             : { exists: false },
//         };
//       })
//     );

//     // ✅ 6️⃣ Format external contact data
//     const externalData = contacts.map((c) => ({
//       _id: c._id,
//       name: c.name,
//       email: c.email,
//       phone: c.phone,
//       designation: null,
//       department: null,
//       profilePhoto: c.profilePhoto || null,
//       status: null,
//       type: "external",
//       flag: getFlag(c.country),
//       chatRoom: { exists: false }, // external contacts don’t have chat yet
//     }));

//     // ✅ 7️⃣ Combine based on `type`
//     let data = [];
//     if (type === "department") {
//       data = employeeData;
//     } else if (type === "external") {
//       data = externalData;
//     } else {
//       data = [...employeeData, ...externalData];
//     }

//     // ✅ 8️⃣ Sort alphabetically
//     data.sort((a, b) => a.name.localeCompare(b.name));

//     res.status(200).json({
//       status: 1,
//       message:
//         type === "department"
//           ? "Departmental contacts fetched successfully"
//           : type === "external"
//           ? "External contacts fetched successfully"
//           : "All contacts fetched successfully",
//       data,
//     });
//   } catch (error) {
//     console.error("❌ Error fetching contacts with chat room:", error);
//     res.status(500).json({
//       status: 0,
//       message: "Server error",
//       error: error.message,
//     });
//   }
// };
exports.getAllContacts = async (req, res) => {
  try {
    const user = req.user;
    const { type } = req.params;
    const { screenType } = req.query; // 🔥 NEW

    // 1️⃣ Get current user's employee info
    const currentEmployee = await Employee.findOne({ user: user.id });
    if (!currentEmployee) {
      return res.status(404).json({
        status: 0,
        message: "Employee record not found for current user",
      });
    }

    // 2️⃣ Fetch employees
    const employees = await Employee.find({ user: user.id })
      .populate("department", "name")
      .populate("designation", "name")
      .sort({ name: 1 })
      .lean();

    // 3️⃣ Fetch external contacts
    const contacts = await ExternalContact.find({ addedBy: user.id })
      .sort({ createdAt: -1 })
      .lean();

    // 4️⃣ Fetch chat rooms (for current user)
    const userRooms = await ContactChatRoom.find({
      $or: [
        { employee_sender: user.id },
        { employee_receiver: user.id },
      ],
    }).lean();

    // helper to match chat room
    const findChatRoom = (receiverUserId) => {
      return userRooms.find(
        (room) =>
          (room.employee_sender.toString() === user.id.toString() &&
            room.employee_receiver.toString() === receiverUserId.toString()) ||
          (room.employee_sender.toString() === receiverUserId.toString() &&
            room.employee_receiver.toString() === user.id.toString())
      );
    };
    // 5️⃣ Employee list
    const employeeData = await Promise.all(
      employees.map(async (emp) => {
        const linkedUser = await User.findOne({
          email: emp.email,
          fullName: emp.name,
        }).lean();

        const room = linkedUser ? findChatRoom(linkedUser._id) : null;

        let unreadCount = 0;
        let lastMessage = null;
        let hasMessages = false;

        if (room) {
          // 🔥 Get unread count
          const msgCount = await ContactChatMessage.countDocuments({ chatRoom: room._id });
          hasMessages = msgCount > 0;

          unreadCount = await ContactChatMessage.countDocuments({
            chatRoom: room._id,
            sender: { $ne: user.id },
            readBy: { $ne: user.id },
          });

          lastMessage = await ContactChatMessage.findOne({ chatRoom: room._id })
            .sort({ createdAt: -1 })
            .lean();
        }

        return {
          _id: emp._id,
          name: emp.name,
          email: emp.email,
          phone: emp.phone,
          designation: emp.designation?.name || "—",
          department: emp.department?.name || "—",
          profilePhoto: emp.profilePhoto || null,
          status: emp.isActive ? "Active" : "Inactive",
          type: "employee",
          flag: getFlag(emp.country),
          chatRoom: room
            ? {
              exists: true,
              roomId: room._id,
              hasMessages: hasMessages,
              lastMessage: lastMessage?.content ? lastMessage?.content : "",
              lastMessageTime: lastMessage?.createdAt || null,   // ⭐ ADD THIS
              unreadCount: unreadCount ? unreadCount : 0,
            }
            : { exists: false, hasMessages: false, lastMessageTime: null, lastMessage: '', roomId: '', unreadCount: 0 },
        };
      })
    );

    // 6️⃣ External list
    const externalData = contacts.map((c) => ({
      _id: c._id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      designation: null,
      department: null,
      profilePhoto: c.profilePhoto || null,
      status: null,
      type: "external",
      flag: getFlag(c.country),
      chatRoom: { exists: false },
    }));

    // 7️⃣ Merge based on type
    let data = [];
    if (type === "department") data = employeeData;
    else if (type === "external") data = externalData;
    else data = [...employeeData, ...externalData];

    // ⭐ 8️⃣ FILTER based on screenType=chat
    if (screenType === "chat") {
      data = data.filter((c) => c.chatRoom.exists === true && c.chatRoom.hasMessages === true);
    }


    // 9️⃣ Sort
    data.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      status: 1,
      message: "Contacts fetched successfully",
      data,
    });
  } catch (error) {
    console.error("❌ Error fetching contacts:", error);
    res.status(500).json({
      status: 0,
      message: "Server error",
      error: error.message,
    });
  }
};

exports.sendExternalEmployeeRequest = async (req, res) => {
  try {
    const senderUserId = req.user.id; // token user (User table ID)
    const { receiverId } = req.body; // this is Employee table _id

    // 1️⃣ Get sender employee info using senderUserId
    const senderEmployee = await Employee.findOne({ user: senderUserId })
      .populate("department designation");

    if (!senderEmployee) {
      return res.status(404).json({ msg: "Sender employee not found" });
    }

    // 2️⃣ Get receiver employee info using employee _id
    const receiverEmployee = await Employee.findById(receiverId)
      .populate("department designation");

    if (!receiverEmployee) {
      return res.status(404).json({ msg: "Receiver employee not found" });
    }

    // 3️⃣ Find receiver's linked User using name + email
    const userData = await User.findOne({
      fullName: receiverEmployee.name,
      email: receiverEmployee.email,
    });

    if (!userData) {
      return res.status(400).json({ msg: "Receiver employee's user account not found" });
    }

    const receiverUserId = userData._id;

    // 4️⃣ Prevent duplicate requests
    const existing = await Notification.findOne({
      sender: senderUserId,
      receiver: receiverUserId,
      type: "external_employee_request",
      isActive: true,
    });

    if (existing) {
      return res.status(400).json({ msg: "Request already sent to this employee" });
    }

    // 5️⃣ Fetch sender profile image
    const senderProfile = await Profile.findOne({ user: senderUserId });

    // 6️⃣ Create notification (use user IDs for sender/receiver)
    const notification = await Notification.create({
      title: "New Employee Request",
      body: `${senderEmployee.name} has sent you an external employee request.`,
      sender: senderUserId, // user id of sender
      receiver: receiverUserId, // user id of receiver
      userImage: senderProfile?.profileImage ?? "",
      type: "external_employee_request",
      data: {
        action: "external_employee_request",
        senderEmployeeId: senderEmployee._id,
        receiverEmployeeId: receiverEmployee._id,
      },
    });

    // 7️⃣ Send FCM notification if receiver has token
    const receiverUser = await User.findById(receiverUserId);
    if (receiverUser?.fcmToken) {
      try {
        const soundData = await Sound.findOne({ type: "alert", user: receiverUserId });
        const dynamicSoundName = soundData?.soundName || "default";

        await admin.messaging().send({
          token: receiverUser.fcmToken,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: {
            type: "externalEmployeeRequest",
            senderId: String(senderUserId),
          },
          android: {
            priority: "high",
            notification: {
              channelId: "triq_custom_sound_channel",
              sound: dynamicSoundName,
            },
          },
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                sound: `${dynamicSoundName}.aiff`,
                "mutable-content": 1,
              },
            },
          },
        });
      } catch (err) {
        console.error("FCM error:", err.message);
      }
    }

    // ✅ Done
    res.status(200).json({
      success: true,
      msg: "External employee request sent successfully",
      notification,
    });

  } catch (error) {
    console.error("Error creating external employee request:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};
