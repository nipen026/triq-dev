const ServicePricing = require("../models/servicePricing.model");

// ✅ Bulk Create or Update Pricing
exports.setPricing = async (req, res) => {
  try {
    const user = req.user;
    if (!user.roles.includes("organisation") && !user.roles.includes("organization")) {
  return res
    .status(403)
    .json({ message: "Only organisation can manage pricing" });
}

    const { supportPricing } = req.body;
    if (!Array.isArray(supportPricing) || supportPricing.length === 0) {
      return res
        .status(400)
        .json({ message: "supportPricing array is required" });
    }

    // ✅ either create or update one doc per organisation
    const updated = await ServicePricing.findOneAndUpdate(
      { organisation: user.id },
      {
        organisation: user.id,
        pricing: supportPricing // overwrite full array
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ message: "Pricing set successfully", data: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ✅ Get all pricing for logged in organisation
exports.getAllPricing = async (req, res) => {
  try {
    const user = req.user;
    const pricingDoc = await ServicePricing.findOne({ organisation: user.id });
    if (!pricingDoc) {
      return res.json({ msg: true, data: [] });
    }
    res.json({ msg: true, data: pricingDoc.pricing });
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
    const user = req.user;
    const { index, update } = req.body; // index of array + update data

    const pricingDoc = await ServicePricing.findOne({ organisation: user.id });
    if (!pricingDoc) return res.status(404).json({ message: "Pricing not found" });

    if (index < 0 || index >= pricingDoc.pricing.length) {
      return res.status(400).json({ message: "Invalid pricing index" });
    }

    pricingDoc.pricing[index] = { ...pricingDoc.pricing[index]._doc, ...update };
    await pricingDoc.save();

    res.json({ message: "Pricing updated successfully", data: pricingDoc });
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
