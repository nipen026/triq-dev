const Notification = require("../models/notification.model");
const Profile = require("../models/profile.model");
const User = require("../models/user.model");
const Ticket = require("../models/ticket.model");
const Sound = require('../models/sound.model');
const admin = require("firebase-admin"); // optional (for FCM push)
const { default: mongoose } = require("mongoose");

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
        await admin.messaging().sendEachForMulticast({
          tokens: [organization.fcmToken],

          data: {
            title: notification.title,
            body: notification.body,
            type: "organizationRequest",
            senderId: String(processorId),
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
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // ✅ AUTO RESET unread count
    await Notification.updateMany(
      {
        receiver: userId,
        isActive: true,
        isRead: false,
      },
      { $set: { isRead: true } }
    );

    const result = await Notification.aggregate([
      {
        $match: {
          receiver: userId,
          isActive: true,
        },
      },
      {
        $facet: {
          notifications: [
            { $sort: { createdAt: -1 } },
            { $limit: 50 }
          ],
          totalCount: [
            { $count: "count" },
          ],
          unreadCount: [
            { $match: { isRead: false } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const data = result[0] || {
      notifications: [],
      totalCount: [],
      unreadCount: []
    };

    res.status(200).json({
      success: true,
      notifications: data.notifications,
      totalCount: data.totalCount[0]?.count || 0,
      unreadCount: data.unreadCount[0]?.count || 0, // will now be 0
    });

  } catch (err) {
    console.error("Notification Error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};




exports.markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notif = await Notification.findOneAndUpdate(
      { _id: id, receiver: req.user.id },
      { isRead: true },
      { isActive: false },
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
    const otherUser = await User.findById(ticketData.processor).select("fullName fcmToken");
    console.log(otherUser,ticketData.processor, "otherUser");

    if (otherUser?.fcmToken) {
      const soundData = await Sound.findOne({ type: "ticket_notification", user: otherUser._id });
      console.log(soundData, "soundData");

      const dynamicSoundName = soundData?.soundName ?? 'bell';
      console.log(dynamicSoundName, "dynamicSoundName");

      await admin.messaging().sendEachForMulticast({
        tokens: [otherUser.fcmToken],
        data: {
          title: `Ticket #${ticketData.ticketNumber} has been updated.`,
          body: `The ticket #${ticketData.ticketNumber} status is now "${ticketData.status}".`,
          type: "ticket_updated",
          ticketNumber: ticketData.ticketNumber,
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
