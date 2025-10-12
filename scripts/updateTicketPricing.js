const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Ticket = require("../models/ticket.model");
const Customer = require("../models/customer.model");
const ServicePricing = require("../models/servicePricing.model");

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // Fetch all tickets with organisation
    const tickets = await Ticket.find({ organisation: { $ne: null }, isActive: true });

    let updatedCount = 0;

    for (const ticket of tickets) {
      const { organisation, processor, machine, ticketType, type } = ticket;

      // 🧩 find customer to get warrantyStatus
      const customer = await Customer.findOne({
        users: processor,
        "machines.machine": machine,
      });

      if (!customer) {
        console.log(`⚠️ No customer found for ticket ${ticket._id}`);
        continue;
      }

      const machineDetails = customer.machines.find(
        (m) => m.machine.toString() === machine.toString()
      );
      if (!machineDetails) {
        console.log(`⚠️ No machine details found for ticket ${ticket._id}`);
        continue;
      }

      const warrantyStatus = machineDetails.warrantyStatus;

      // 🧾 find matching pricing for this organisation
      const servicePricing = await ServicePricing.findOne(
        {
          organisation,
          pricing: {
            $elemMatch: {
              ticketType,
              supportMode: type,
              warrantyStatus,
            },
          },
        },
        { "pricing.$": 1 }
      );

      let pricingData;
      if (!servicePricing || !servicePricing.pricing?.length) {
        // default pricing if not found
        pricingData = {
          _id: new mongoose.Types.ObjectId(),
          ticketType,
          supportMode: type,
          warrantyStatus,
          cost: 0,
          currency: "USD",
        };
      } else {
        pricingData = servicePricing.pricing[0];
      }

      // 💾 update ticket pricing field
      ticket.pricing = pricingData._id;
      await ticket.save();
      updatedCount++;

      console.log(`✅ Ticket ${ticket._id} updated with pricing ID ${pricingData._id}`);
    }

    console.log(`🎯 Updated ${updatedCount} tickets successfully`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
})();
