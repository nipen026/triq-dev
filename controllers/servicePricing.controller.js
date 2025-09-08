const ServicePricing = require("../models/servicePricing.model");

// ✅ Bulk Create or Update Pricing
exports.setPricing = async (req, res) => {
  try {
    const user = req.user;
    if (!user.roles.includes("organisation")) {
      return res.status(403).json({ message: "Only organisation can manage pricing" });
    }

    const { supportPricing } = req.body;

    if (!Array.isArray(supportPricing) || supportPricing.length === 0) {
      return res.status(400).json({ message: "supportPricing array is required" });
    }

    const results = [];

    for (const item of supportPricing) {
      const { supportMode, warrantyStatus, ticketType, cost, currency } = item;

      const updated = await ServicePricing.findOneAndUpdate(
        {
          organisation: user.id,
          supportMode,
          warrantyStatus,
          ticketType
        },
        {
          organisation: user.id,
          supportMode,
          warrantyStatus,
          ticketType,
          cost,
          currency
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      results.push(updated);
    }

    res.json({ message: "Pricing set successfully", data: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all pricing for logged in organisation
exports.getAllPricing = async (req, res) => {
  try {
    const user = req.user;
    const pricing = await ServicePricing.find({ organisation: user.id });
    res.json({msg:true,data:pricing});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get single pricing by ID
exports.getPricingById = async (req, res) => {
  try {
    const pricing = await ServicePricing.findById(req.params.id);
    if (!pricing) return res.status(404).json({ message: "Pricing not found" });
    res.json(pricing);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update pricing by ID
exports.updatePricing = async (req, res) => {
  try {
    const pricing = await ServicePricing.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!pricing) return res.status(404).json({ message: "Pricing not found" });
    res.json({ message: "Pricing updated successfully", data: pricing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete pricing by ID
exports.deletePricing = async (req, res) => {
  try {
    const pricing = await ServicePricing.findByIdAndDelete(req.params.id);
    if (!pricing) return res.status(404).json({ message: "Pricing not found" });
    res.json({ message: "Pricing deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
