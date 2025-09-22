// cron/ticketStatusUpdater.js
const cron = require("node-cron");
const Ticket = require("../models/ticket.model");

cron.schedule("* * * * *", async () => {
  console.log("Cron job running: Checking tickets to update status");

  try {
    const now = new Date();

    // only change status if reschedule_time < now - 1 minute
    const threshold = new Date(now.getTime() - 60 * 1000); // 1 min after

    const tickets = await Ticket.find({
      status: "On Hold",
      reschedule_time: { $lte: threshold } // reschedule_time at least 1 min behind
    });

    for (const t of tickets) {
      t.status = "In Progress";
      await t.save();
      console.log(`Ticket ${t._id} moved to In Progress`);
    }
  } catch (err) {
    console.error("Cron error:", err);
  }
});

