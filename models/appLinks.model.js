const mongoose = require("mongoose");

const appLinksSchema = new mongoose.Schema(
  {
    manufacturerUrl: {
      type: String,
      trim: true
    },
    processorUrl: {
      type: String,
      trim: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppLinks", appLinksSchema);