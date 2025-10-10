const Notification = require("../models/notification.model");
const Profile = require("../models/profile.model");
const User = require("../models/user.model");
const admin = require("firebase-admin"); // optional (for FCM push)

exports.sendOrganizationRequest = async (req, res) => {
    try {
        const { organizationId } = req.body; // scanned user's ID
        const processorId = req.user.id; // from token

        // 1️⃣ Check if organization user exists
        const organization = await User.findById(organizationId).populate("roles");
        const processorData = await User.findById(processorId).populate("roles");
        const ProfileProcessorData = await Profile.findOne({user:processorId})
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
            userImage:ProfileProcessorData.profileImage,
            type: "organizationRequest",
            data: {
                action: "organization_request",
                processorId,
            },
        });

        // 5️⃣ Optional: send FCM notification if the organization has a token
        if (organization.fcmToken) {
            try {
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
    
    const notifs = await Notification.find({ receiver: user.id,isActive:true })
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