// cron/ticketStatusUpdater.js
const cron = require("node-cron");
const Ticket = require("../models/ticket.model");

cron.schedule("* * * * *", async () => {
  console.log("Cron job running: Checking tickets to update status");

  try {
    const now = new Date();

    const startOfMinute = new Date(now);
    startOfMinute.setSeconds(0, 0);

    const endOfMinute = new Date(now);
    endOfMinute.setSeconds(59, 999);

    // ✅ Get the earliest ticket matching this minute
    const ticket = await Ticket.findOne({
      status: "On Hold",
      reschedule_update_time: { $gte: startOfMinute, $lte: endOfMinute }
    }).sort({ reschedule_update_time: 1 }); // pick earliest

    if (ticket) {
      ticket.status = "In Progress";
      ticket.IsShowChatOption = true;
      await ticket.save();
      console.log(`✅ Ticket ${ticket._id} moved to In Progress`);
    }
  } catch (err) {
    console.error("Cron error:", err);
  }
});
