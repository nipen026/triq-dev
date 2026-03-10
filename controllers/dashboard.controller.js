const Ticket = require("../models/Ticket");
const Task = require("../models/Task");
const Customer = require("../models/Customer");

exports.getLatestRecordIndicator = async (req, res) => {
  try {

    const userId = req.user.id;

    // Check if any ticket exists for this user
    const latestTicket = await Ticket.findOne({ organisation: userId })
      .sort({ createdAt: -1 })
      .select("createdAt");

    const latestTask = await Task.findOne({ assignedTo: userId })
      .sort({ createdAt: -1 })
      .select("createdAt");

    const latestCustomer = await Customer.findOne({ organization: userId })
      .sort({ createdAt: -1 })
      .select("createdAt");

    res.json({
      ticket: {
        isNewLatestRecord: !!latestTicket
      },
      task: {
        isNewLatestRecord: !!latestTask
      },
      customer: {
        isNewLatestRecord: !!latestCustomer
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};