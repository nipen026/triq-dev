const mongoose = require("mongoose");

const DesignationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: String,
});

module.exports = mongoose.model("Designation", DesignationSchema);
