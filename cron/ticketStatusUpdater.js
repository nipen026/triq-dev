// cron/ticketStatusUpdater.js
const cron = require("node-cron");
const Ticket = require("../models/ticket.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const admin = require("firebase-admin");

cron.schedule("* * * * *", async () => {
  console.log("Cron job running: Checking tickets to update status");

  try {

    const now = new Date();

    const startOfMinute = new Date(now);
    startOfMinute.setSeconds(0, 0);

    const endOfMinute = new Date(now);
    endOfMinute.setSeconds(59, 999);

    const ticket = await Ticket.findOne({
      status: "On Hold",
      reschedule_update_time: { $gte: startOfMinute, $lte: endOfMinute }
    });

    if (!ticket) return;

    // ✅ Update status
    ticket.status = "In Progress";
    ticket.IsShowChatOption = true;
    await ticket.save();

    console.log(`✅ Ticket ${ticket._id} moved to In Progress`);

    // ✅ Find processor user
    const processorUser = await User.findById(ticket.processor);

    if (!processorUser) return;

    const message = `Your ticket #${ticket.ticketNumber} is now In Progress`;

    // ✅ Save notification
    const notification = await Notification.create({
      title: "Ticket Status Updated",
      body: message,
      receiver: processorUser._id,
      sender: null,
      type: "ticket_status_update",
      read: false,
      data: {
        ticketId: String(ticket._id),
        ticketNumber: ticket.ticketNumber,
        screenName: "TicketDetailsView"
      }
    });

    // ✅ Send FCM
    if (processorUser.fcmToken) {

      await admin.messaging().send({
        token: processorUser.fcmToken,
        data: {
          title: "Ticket Status Updated",
          body: message,
          type: "ticket_status_update",
          ticketId: String(ticket._id),
          notificationId: String(notification._id)
        }
      });

      console.log("📩 Notification sent");
    }

  } catch (err) {
    console.error("Cron error:", err);
  }
});