const Notification = require("../models/notification.model");
const Profile = require("../models/profile.model");
const User = require("../models/user.model");
const Ticket = require("../models/ticket.model");
const Sound = require('../models/sound.model');
const admin = require("firebase-admin"); // optional (for FCM push)

exports.sendOrganizationRequest = async (req, res) => {
  try {
    const { organizationId } = req.body; // scanned user's ID
    const processorId = req.user.id; // from token

    // 1️⃣ Check if organization user exists
    const organization = await User.findById(organizationId).populate("roles");
    const processorData = await User.findById(processorId).populate("roles");
    const ProfileProcessorData = await Profile.findOne({ user: processorId })
    if (!organization) {
      return res.status(404).json({ msg: "Organization not found" });
    }

    // 2️⃣ Check if the user has the "organization" role
    const hasOrgRole = organization.roles.some((r) => r.name === "organization");
    if (!hasOrgRole) {
      return res.status(400).json({ msg: "Scanned user is not an organization" });
    }

    // 3️⃣ Prevent duplicate notification (optional)
    const existing = await Notification.findOne({
      sender: processorId,
      receiver: organizationId,
      type: "organizationRequest",
      isActive: true,
    });
    if (existing) {
      return res.status(400).json({ msg: "Request already sent" });
    }

    // 4️⃣ Create new notification
    const notification = await Notification.create({
      title: "New Organization Request",
      body: `${processorData.fullName} has requested to join your organization.`,
      sender: processorId,
      receiver: organizationId,
      userImage: ProfileProcessorData?.profileImage ?? "",
      type: "organizationRequest",
      data: {
        action: "organization_request",
        processorId,
      },
    });

    // 5️⃣ Optional: send FCM notification if the organization has a token
    if (organization.fcmToken) {
      try {
        const soundData = await Sound.findOne({ type: "chat", user: organization._id });
        const dynamicSoundName = soundData.soundName;

        // Step B: Android ke notification options taiyaar karein
        const androidNotification = {
          channelId: "triq_custom_sound_channel",
          sound: dynamicSoundName,
        };
        await admin.messaging().send({
          token: organization.fcmToken,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: {
            type: "organizationRequest",
            senderId: String(processorId),
          },
          android: {
            priority: "high", // Priority ko yahan rakhein
            notification: androidNotification,
          },

          // 4. iOS ke liye options
          apns: {
            headers: { "apns-priority": "10" },
            payload: {
              aps: {
                // Sound file ka naam string me aur .aiff extension ke saath
                sound: ` ${dynamicSoundName}.aiff`,
                "mutable-content": 1,
              },
            },
          }
        });
      } catch (err) {
        console.error("FCM error:", err.message);
      }
    }

    res.status(200).json({
      success: true,
      msg: "Organization request sent successfully",
      notification,
    });
  } catch (error) {
    console.error("Error sending org request:", error);
    res.status(500).json({ msg: "Internal Server Error" });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const user = req.user;

    const notifs = await Notification.find({ receiver: user.id, isActive: true })
      .sort({ createdAt: -1 });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, receiver: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ msg: "Notification not found" });

    res.status(200).json({ success: true, msg: "Notification marked as read", notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ========== DELETE NOTIFICATION ==========
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, receiver: req.user.id, isActive: true },
      { isActive: false },
      { new: true }
    );

    if (!notif)
      return res.status(404).json({ msg: "Notification not found or already deleted" });

    res.status(200).json({ success: true, msg: "Notification deleted (soft delete)" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateNotificationTicket = async (req, res) => {
  console.log(req.body, "body in updateNotificationTicket");

  try {
    const { ticketId, type, notificationId } = req.body;

    // ✅ Validate input
    if (!ticketId || !type) {
      return res.status(400).json({ success: false, msg: "ticketId and type are required" });
    }

    const ticketData = await Ticket.findById(ticketId);
    if (!ticketData) {
      return res.status(404).json({ success: false, msg: "Ticket not found" });
    }

    console.log("Ticket:", ticketData._id, "Type:", type);

    // ✅ Update status based on type
    if (type === "accept") {
      ticketData.status = "In Progress";
    } else if (type === "reject") {
      ticketData.status = "Rejected";
    } else {
      return res.status(400).json({ success: false, msg: "Invalid type value" });
    }

    // ✅ Save changes
    await ticketData.save();
    if (notificationId) {
      const notif = await Notification.findOneAndUpdate(
        { _id: notificationId, receiver: req.user.id, isActive: true },
        { isActive: false },
        { new: true }
      );

      if (notif) {
        console.log(`🔕 Notification ${notificationId} marked inactive`);
      }
    } else {
      // fallback if notificationId not passed
      await Notification.updateMany(
        {
          receiver: req.user.id,
          "data.ticketId": ticketId,
          isActive: true,
        },
        { isActive: false }
      );
    }
    return res.status(200).json({
      success: true,
      msg: `Ticket status updated successfully`,
      data: ticketData,
    });

  } catch (err) {
    console.error("Error updating ticket:", err);
    return res.status(500).json({ success: false, msg: err.message });
  }
};
