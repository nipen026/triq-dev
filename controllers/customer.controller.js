const Customer = require("../models/customer.model");
const Machine = require("../models/machine.model");
const Role = require("../models/role.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const Sound = require("../models/sound.model")
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { getFlag, getFlagWithCountryCode } = require("../utils/flagHelper");
const sendMail = require("../utils/mailer");
const { getCountryFromPhone } = require("../utils/phoneHelper");
const QRCode = require("qrcode");
const admin = require('firebase-admin');
const Profile = require("../models/profile.model");
// Helper: pick only allowed fields
const pickCustomerFields = (body) => {
  return {
    organization: body.organization,  // organization ID
    phoneNumber: body.phoneNumber,
    email: body.email,
    contactPerson: body.contactPerson,
    designation: body.designation,
    customerName: body.customerName,
    machines: body.machines,
    countryOrigin: body.countryOrigin
  };
};
const hasOrganizationRole = async (userId) => {
  const user = await User.findById(userId).populate("roles", "name");
  if (!user) return false;
  return user.roles.some(r => r.name === "organization");
};
exports.createCustomer = async (req, res) => {
  const session = await Customer.startSession();
  session.startTransaction();

  try {
    const customerData = pickCustomerFields(req.body);
    customerData.organization = req.user.id; // from token
    const validUser = await User.findById(req.user.id, "fullName email");
    // Attach organization from token user (if present)
    if (req.user && req.user.id) {
      if (validUser) {
        customerData.organization = validUser._id;
      }
    }

    // ✅ Detect country automatically from phone
    if (!customerData.countryOrigin && customerData.phoneNumber) {
      const detectedCountry = getCountryFromPhone(customerData.phoneNumber);
      if (detectedCountry) {
        customerData.countryOrigin = detectedCountry; // e.g. "IN", "US"
      }
    }

    // ✅ Check if a customer with this email already exists in same organization
    const existingCustomer = await Customer.findOne({
      email: customerData.email,
      organization: customerData.organization,
      isActive: true,
      assignmentStatus: { $ne: "Rejected" }
    });


    if (existingCustomer) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Customer with this email already exists" });
    }

    // ✅ Check if user exists by email/phone
    let existingUser = await User.findOne({
      $or: [
        { email: customerData.email },
        { phone: customerData.phoneNumber }
      ]
    });

    // ✅ Create Customer
    const customer = new Customer(customerData);

    // If machines assigned, update their status
    if (customerData.machines && customerData.machines.length > 0) {
      for (let m of customerData.machines) {
        await Machine.findByIdAndUpdate(m.machine, {
          status: "PendingAcceptance"
        });

      }
    }

    customer.assignmentStatus = "Pending";
    await customer.save();

    let user;
    if (existingUser) {
      // ✅ Skip creating user, just link
      user = existingUser;
    } else {
      // ✅ Find or create processor role
      let processorRole = await Role.findOne({ name: "processor" });
      if (!processorRole) {
        processorRole = new Role({ name: "processor" });
        await processorRole.save({ session });
      }

      // ✅ Generate random password
      const plainPassword = crypto.randomBytes(6).toString("hex");
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // ✅ Create linked user
      user = new User({
        fullName: customer.contactPerson || customer.customerName,
        email: customer.email,
        password: hashedPassword,
        phone: customer.phoneNumber,
        isEmailVerified: true,
        isPhoneVerified: false,
        emailOTP: "123456",
        countryCode: "+91",
        roles: [processorRole._id],
      });
      await Profile.create({
        user: user._id,
        email: user.email,
        phone: user.phone,
        profileImage: "",
        chatLanguage: "en",
        corporateAddress: {},
        factoryAddress: {},
        designation: "",
        unitName: "",
      });
      await user.save({ session });

      // ✅ Send email only when new user created
      // await sendMail({
      //   to: customer.email,
      //   subject: "Welcome! Your Processor Account is Ready",
      //   html: `
      //     <p>Hello ${customer.contactPerson || customer.customerName},</p>
      //     <p>Your processor account has been created.</p>
      //     <p><strong>Email:</strong> ${customer.email}</p>
      //     <p><strong>Password:</strong> ${plainPassword}</p>
      //     <p>Please log in and change your password immediately.</p>
      //   `,
      // });
    }

    // ✅ Link user to customer
    customer.users = user._id;
    await customer.save({ session });
    // 🔔 Notify processor for machine assignment
    const notificationMessage =
      `${validUser.fullName} sent you a request.`;


    // 🔔 FCM
    const isOrgUser = await hasOrganizationRole(user._id);

    if (!isOrgUser) {
      const notificationMessage = `${validUser.fullName} sent you a request.`;

      const notification = await Notification.create({
        title: "Customer Request",
        body: notificationMessage,
        receiver: user._id,
        sender: req.user.id,
        type: "customer_request",
        read: false,
        isActive: true,
        data: {
          customerId: String(customer._id),
          actionRequired: true,
          screenName: "CustomerRequest"
        }
      });

      // 🔔 FCM
      if (user.fcmToken) {
        await admin.messaging().send({
          token: user.fcmToken,
          data: {
            title: "Customer Assignment Request",
            body: notificationMessage,
            type: "customer_request",
            customerId: String(customer._id),
            notificationId: String(notification._id)
          }
        });
      }
    } else {
      const notification = new Notification({
        title: "New Customer assigned",
        body: notificationMessage,
        type: 'message',
        receiver: customer.id, // who triggered the notification
        sender: req.user.id,
        read: false,
        createdAt: new Date(),
        data: {
          // manufacture_name: ValidUser.fullName || '',
          type: "customer_assigned",
          processorId: String(customer._id),
          screenName: "CustomerEditDetailsView",
          route: '/customerEditDetailsView'
        }
      });
      await notification.save();
      if (user.fcmToken) {
        await admin.messaging().send({
          token: user.fcmToken,
          data: {
            title: "Customer Assigned",
            body: notificationMessage,
            type: "customer_assigned",
            customerId: String(customer._id),
            notificationId: String(notification._id)
          }
        });
      }
    }

    // const notificationMessage = `New customer "${customer.customerName}" has been created.`;

    // If you have a Notification model
    // console.log(customer, "customerData create time");
    // const validUser = await User.findById(req.user.id, "fullName email");
    // const notification = new Notification({
    //   title: "New Customer Created",
    //   body: notificationMessage,
    //   type: 'message',
    //   receiver: customer.id, // who triggered the notification
    //   sender: req.user.id,
    //   read: false,
    //   createdAt: new Date(),
    //   data: {
    //     // manufacture_name: ValidUser.fullName || '',
    //     type: "customer_assigned",
    //     processorId: String(customer._id),
    //     screenName: "CustomerEditDetailsView",
    //     route: '/customerEditDetailsView'
    //   }
    // });
    // await notification.save();

    // Optional: Push via FCM / WebSocket if needed
    // if (user.fcmToken) {
    //   sendPushNotification(user.fcmToken, {
    //     title: "New Customer Created",
    //     body: notificationMessage,
    //     data: { customerId: customer._id.toString() }
    //   });
    // }

    // ✅ Commit transaction
    await session.commitTransaction();
    session.endSession();

    // ✅ Populate response
    const populatedCustomer = await Customer.findById(customer._id)
      .populate("machines.machine")
      .populate("users", "fullName email roles");

    res.status(201).json({
      message: existingUser
        ? "Customer created and linked to existing user"
        : "Customer & new user created successfully",
      data: populatedCustomer,
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: err.message });
  }
};



exports.getCustomers = async (req, res) => {
  try {
    const userId = req.user.id; // ✅ from token (organization role user)

    // Find only customers linked to this organization user
    let customers = await Customer.find({
      isActive: true,
      organization: userId   // ✅ filter by org user
    })
      .populate("machines.machine")
      .populate("users", "fullName email")
      .populate("organization", "fullName email phone countryCode")
      .sort({ createdAt: -1 });

    // Add flag for each customer
    customers = customers.map(c => {
      const obj = c.toObject();
      obj.flag = getFlagWithCountryCode(c.organization.countryCode);
      obj.userImage = 'https://images.unsplash.com/vector-1741673838666-b92722040f4f?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
      // const qrPayload = JSON.stringify(c);
      // obj.qrCode = QRCode.toDataURL(qrPayload);
      return obj;
    });

    res.json({ count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ✅ Get Single Customer by ID
exports.getCustomerById = async (req, res) => {
  try {
    const id = req.params.id;

    // Try finding by customerId first
    let customer = await Customer.findOne({ _id: id, isActive: true })
      .populate("machines.machine")
      .populate("users", "fullName email")
      .populate("organization", "fullName email phone");


    // If not found, maybe it's a userId (processor)
    if (!customer) {
      customer = await Customer.findOne({ users: id, isActive: true })
        .populate("machines.machine")
        .populate("users", "fullName email")
        .populate("organization", "fullName email phone");

    }

    if (!customer) {
      return res.status(404).json({ message: "Customer not found or inactive" });
    }
    // 2️⃣ Fetch Profile for linked user
    let profile = null;
    if (customer.users?._id) {
      profile = await Profile.findOne({ user: customer.users._id })
        .select("designation organizationName unitName profileImage");
    }
    // let qrCodeCustomer = await Customer.findOne({ id: id, isActive: true }).populate("users", "fullName email");
    // if (!qrCodeCustomer) {
    //   qrCodeCustomer = await Customer.findOne({ users: id, isActive: true })
    //     .populate("users", "fullName email");
    // }
    const obj = customer.toObject();
    obj.flag = getFlag(customer.countryOrigin);
    obj.userImage = 'https://images.unsplash.com/vector-1741673838666-b92722040f4f?q=80&w=1480&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' // attach flag svg
    obj.qrCode = await QRCode.toDataURL(id);
    obj.userProfile = {
      designation: profile?.designation || "",
      yourName: profile?.organizationName || "",
      unitName: profile?.unitName || ""
    };

    res.json(obj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// const getNewMachines = (oldMachines = [], newMachines = []) => {
//   const oldIds = oldMachines.map(m => m.machine.toString());
//   return newMachines.filter(m => !oldIds.includes(m.machine));
// };


// exports.updateCustomer = async (req, res) => {
//   try {
//     const customerData = pickCustomerFields(req.body);
//     const newOrgId = req.user.id; // from token

//     const existingCustomer = await Customer.findOne({
//       _id: req.params.id,
//       isActive: true
//     });

//     if (!existingCustomer) {
//       return res.status(404).json({ message: "Customer not found or inactive" });
//     }

//     // 🧠 Case: Organization changed
//     if (String(existingCustomer.organization) !== String(newOrgId)) {
//       const userIdToUse = existingCustomer.users || customerData.users;

//       const newCustomer = new Customer({
//         ...customerData,
//         organization: newOrgId,
//         users: userIdToUse
//       });

//       // ✅ Fetch user properly
//       const UserData = await User.findById(userIdToUse);
//       const orgData = await User.findById(newOrgId);
//       const notificationMessage = `New Organization "${orgData.fullName}" has been assigned.`;
//       const ValidUser = await User.findById(req.user.id, "fullName email");
//       // ✅ Create notification in DB
//       const notification = new Notification({
//         title: "New Customer Created in update time",
//         body: notificationMessage,
//         type: "message",
//         receiver: UserData?._id || null,
//         sender: req.user ? req.user.id : null,
//         read: false,
//         createdAt: new Date(),
//         data: {
//           manufacture_name: ValidUser.fullName || '',
//           type: "customer_assigned",
//           processorId: String(UserData._id),
//           screenName: "CustomerEditDetailsView",
//           route: '/customerEditDetailsView'
//         }
//       });
//       console.log(notification, "notification");

//       await notification.save();

//       // ✅ Save the new customer
//       await newCustomer.save();
//       console.log(UserData, "UserData");

//       // ✅ Send FCM notification if token available
//       if (UserData?.fcmToken) {
//         try {
//           const soundData = await Sound.findOne({ type: "alert", user: UserData._id });
//           const dynamicSoundName = soundData.soundName;
//           const androidNotification = {
//             channelId: "triq_custom_sound_channel",
//             sound: dynamicSoundName,
//           };

//           const response = await admin.messaging().sendEachForMulticast({
//             tokens: [UserData.fcmToken],
//             data: {
//               title: "Customer Assigned",
//               body: notificationMessage,
//               type: "customer_assigned",
//               processorId: String(UserData._id),
//               screenName: "CustomerEditDetailsView",
//               route: '/customerEditDetailsView',
//               soundName: dynamicSoundName
//             },
//             android: {
//               priority: "high",
//             },

//             // 4. iOS options
//             apns: {
//               headers: { "apns-priority": "10" },
//               payload: {
//                 aps: {
//                   // ❌ ERROR FIX: Aapke code me space tha ` ${...}`. Maine space hata diya.
//                   sound: `${dynamicSoundName}.aiff`,

//                   // ✅ IMPORTANT: Ye line zaroori hai taaki background me Flutter code chale
//                   "content-available": 1,
//                   "mutable-content": 1,
//                 },
//               },
//             }
//           });

//           console.log("FCM sent:", response.successCount, "success,", response.failureCount, "failures");
//         } catch (fcmErr) {
//           console.error("FCM send error:", fcmErr);
//         }
//       }

//       return res.json({
//         message: "Organization changed, new customer created under new organization",
//         data: newCustomer
//       });
//     }

//     // 🧩 Otherwise normal update
//     const updatedCustomer = await Customer.findOneAndUpdate(
//       { _id: req.params.id, isActive: true },
//       customerData,
//       { new: true }
//     ).populate("machines.machine");

//     res.json({ message: "Customer updated successfully", data: updatedCustomer });
//   } catch (err) {
//     console.error("updateCustomer error:", err);
//     res.status(500).json({ error: err.message });
//   }
// };


exports.updateCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customerData = pickCustomerFields(req.body);
    customerData.organization = req.user.id; // from token

    const existingCustomer = await Customer.findOne({
      _id: customerId,
      isActive: true
    }).populate("users");
    const userData = await User.findById(req.user.id);
    if (!existingCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Update machines directly (NO approval flow)
    if (customerData.machines?.length > 0) {
      for (let m of customerData.machines) {
        await Machine.findByIdAndUpdate(m.machine, {
          status: "Assigned"
        });
      }
    }

    const updatedCustomer = await Customer.findOneAndUpdate(
      { _id: customerId, isActive: true },
      customerData,
      { new: true }
    )
      .populate("machines.machine")
      .populate("users");

    // 🔔 Notify processor ONLY if customer newly assigned
    const processorUser = updatedCustomer.users;
    console.log(updatedCustomer, "updatedCustomer");
    if (processorUser) {
      const isOrgUser = await hasOrganizationRole(req.user.id);

      if (!isOrgUser) {
        const notificationMessage = `${userData.fullName} sent you a request.`;

        const notification = await Notification.create({
          title: "Customer Request",
          body: notificationMessage,
          receiver: processorUser._id,
          sender: req.user.id,
          type: "customer_request",
          read: false,
          isActive: true,
          data: {
            customerId: String(updatedCustomer._id),
            route: "/customer-details"
          }
        });

        if (processorUser.fcmToken) {
          await admin.messaging().send({
            token: processorUser.fcmToken,
            data: {
              title: "Customer Request",
              body: notificationMessage,
              type: "customer_request",
              customerId: String(updatedCustomer._id),
              notificationId: String(notification._id)
            }
          });
        }
      } else {
        const notificationMessage = `Customer "${updatedCustomer.customerName}" has been updated.`;
        const notification = new Notification({
          title: "Customer Updated",
          body: notificationMessage,
          type: "message",
          receiver: updatedCustomer.id, // who triggered the notification
          sender: req.user.id,
          read: false,
          createdAt: new Date(),
          data: {
            type: "customer_assigned",
            processorId: String(updatedCustomer._id),
            screenName: "CustomerEditDetailsView",
            route: '/customerEditDetailsView'
          }
        });
        await notification.save();
        if (processorUser.fcmToken) {
          await admin.messaging().send({
            token: processorUser.fcmToken,
            data: {
              title: "Customer Updated",
              body: notificationMessage,
              type: "customer_updated",
              customerId: String(updatedCustomer._id),
              notificationId: String(notification._id)
            }
          });

        }
      }
    }
    res.json({
      success: true,
      message: "Customer updated successfully",
      data: updatedCustomer
    });

  } catch (err) {
    console.error("updateCustomer error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ✅ Soft Delete Customer
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { organization: undefined },
      { new: true }
    );

    if (!customer) return res.status(404).json({ message: "Customer not found" });

    res.json({ message: "Customer deactivated (soft deleted)", data: customer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// ✅ Search Customers by email or phone (only within the logged-in user's organization)
// exports.searchCustomers = async (req, res) => {
//   try {
//     const { search } = req.query; // one query param
//     const loggedInUserId = req.user?.id;

//     // ✅ Get logged-in user's organization
//     const user = await User.findById(loggedInUserId).populate("roles", "name");

//     if (!user || !user.roles.map(r => r.name).includes("organization")) {
//       return res.status(403).json({ message: "User does not belong to an organization" });
//     }

//     // Build query
//     const query = {
//       // organization: user.organization,  // only same org
//       isActive: true,
//     };

//     if (search) {
//       query.$or = [
//         { email: { $regex: search, $options: "i" } },
//         { phoneNumber: { $regex: search, $options: "i" } },
//       ];
//     }

//     let customers = await Customer.find(query)
//       .populate("machines.machine")
//       .populate("users", "fullName email");

//     // Add flags
//     customers = customers.map(c => {
//       const obj = c.toObject();
//       obj.flag = getFlag(c.countryOrigin);
//       return obj;
//     });

//     res.json({ count: customers.length, data: customers });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
exports.searchCustomers = async (req, res) => {
  try {
    const { search } = req.query;
    const loggedInUserId = req.user?.id;

    // ✅ Check org role
    const user = await User.findById(loggedInUserId).populate("roles", "name");
    if (!user || !user.roles.map(r => r.name).includes("organization")) {
      return res.status(403).json({ message: "User does not belong to an organization" });
    }

    // Build match query
    const match = { isActive: true };
    if (search) {
      match.$or = [
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await Customer.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$email",               // group by email
          doc: { $first: "$$ROOT" },   // take the first document
        },
      },
      { $replaceRoot: { newRoot: "$doc" } }, // flatten back
    ]);

    res.json({ count: customers.length, data: customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ✅ Remove a machine from customer
exports.removeMachineFromCustomer = async (req, res) => {
  try {
    const { customerId, machineId } = req.params;

    // ✅ Find customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // ✅ Check if machine is assigned to this customer
    const machineIndex = customer.machines.findIndex(
      (m) => m.machine.toString() === machineId
    );
    if (machineIndex === -1) {
      return res.status(400).json({ message: "Machine not assigned to this customer" });
    }

    // ✅ Remove machine from customer
    customer.machines.splice(machineIndex, 1);
    await customer.save();

    // ✅ Update machine status back to "Available"
    await Machine.findByIdAndUpdate(machineId, { status: "Available" });

    // ✅ Populate response
    const updatedCustomer = await Customer.findById(customerId)
      .populate("machines.machine")
      .populate("users", "fullName email");

    res.json({ message: "Machine removed from customer", data: updatedCustomer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// exports.getMyMachines = async (req, res) => {
//   try {
//     const userId = req.user.id; // from token

//     // 1️⃣ Find customer linked with this user
//     const user = await User.findById(userId).populate("roles");
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     const roleNames = user.roles.map(r => r.name);
//     if (!roleNames.includes("processor")) {
//       return res.status(403).json({ message: "Only processor role can access machine overview" });
//     }

//     // ✅ Use find to get all customers linked to this user
//     const customers = await Customer.find({ users: userId, isActive: true })
//       .populate({
//         path: "machines.machine",
//         select: "machineName modelNumber machine_type status isActive remarks",
//       });

//     return res.json({
//       count: customers.length,
//       message: "Machines assigned to logged-in customer",
//       data: customers
//     });

//   } catch (err) {
//     console.error("getMyMachines Error:", err);
//     res.status(500).json({ error: err.message });
//   }
// };

exports.getMyMachines = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find user
    const user = await User.findById(userId).populate("roles");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const roleNames = user.roles.map((r) => r.name);
    if (!roleNames.includes("processor")) {
      return res.status(403).json({ message: "Only processor role can access machine overview" });
    }

    // Find all customers linked to this user
    const customers = await Customer.find({ users: userId, isActive: true })
      .populate({
        path: "machines.machine",
        select: "machineName modelNumber machine_type status isActive remarks serialNumber operatingHours",
      });

    // 🔥 Flatten machine list to match Flutter model
    const finalMachineList = [];

    customers.forEach((customer) => {
      customer.machines.forEach((m) => {
        if (m.machine) {
          finalMachineList.push({
            _id: m.machine._id,
            machineName: m.machine.machineName,
            modelNumber: m.machine.modelNumber,
            serialNumber: m.machine.serialNumber,
            operatingHours: m.machine.operatingHours,
            machine_type: m.machine.machine_type,
            status: m.machine.status,
            remarks: m.machine.remarks,

            // Warranty fields mapped into Flutter's Warranty model
            warranty: {
              purchaseDate: m.purchaseDate,
              installationDate: m.installationDate,
              startDate: m.warrantyStart,
              expirationDate: m.warrantyEnd,
              status: m.warrantyStatus,
              invoiceNo: m.invoiceContractNo,
            },
          });
        }
      });
    });

    return res.json({
      count: finalMachineList.length,
      message: "Machines assigned to logged-in customer",
      data: finalMachineList,
    });

  } catch (err) {
    console.error("getMyMachines Error:", err);
    res.status(500).json({ error: err.message });
  }
};
exports.respondCustomerAssignment = async (req, res) => {
  try {
    const { customerId, action, notificationId } = req.body;
    const orgId = req.user.id;
    console.log(req.body, "req.body in respondCustomerAssignment");

    const customer = await Customer.findById(customerId)
      .populate("machines.machine");

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }


    if (
      customer.assignmentStatus === "Assigned" &&
      String(customer.users) === req.user.id
    ) {
      return res.status(400).json({ message: "Customer already accepted by you" });
    }

    const orgUser = await User.findById(customer.organization);

    if (action === "accept") {
      // ✅ ASSIGN CUSTOMER
      customer.assignmentStatus = "Assigned";
      // customer.organization = orgId; // confirm organization
      await customer.save();

      // ✅ ASSIGN ALL MACHINES
      for (const m of customer.machines) {
        await Machine.findByIdAndUpdate(m.machine._id, {
          status: "Assigned"
        });
      }

      // 🔔 Notify organization
      const msg = `Customer "${orgUser.fullName}" accepted by processor`;

      if (orgUser?.fcmToken) {
        await admin.messaging().send({
          token: orgUser.fcmToken,
          data: {
            title: "Customer Accepted",
            body: msg,
            type: "customer_accepted",
            customerId: String(customer._id)
          }
        });
      }

    } else if (action === "reject") {

      // ❌ Reject assignment
      customer.assignmentStatus = "Rejected";
      customer.organization = undefined; // ✅ allowed
      // keep organization as-is

      // ✅ Reset machines back to Available
      for (const m of customer.machines) {
        await Machine.findByIdAndUpdate(m.machine._id || m.machine, {
          status: "Available"
        });
      }

      await customer.save().then(() => { console.log("customer rejected and saved"); }).catch(err => console.error("Error saving rejected customer:", err));

      const msg = `Customer "${customer.customerName}" rejected by processor`;

      if (orgUser?.fcmToken) {
        await admin.messaging().send({
          token: orgUser.fcmToken,
          data: {
            title: "Customer Rejected",
            body: msg,
            type: "customer_rejected",
            customerId: String(customer._id)
          }
        });
      }
    } else {
      return res.status(400).json({ message: "Invalid action" });
    }

    // 🔕 deactivate request notification
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, {
        isActive: false
      });
    }

    res.status(200).json({ success: true, message: `Customer ${action}ed successfully` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};

