const mongoose = require("mongoose");

const DesignationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    level: { type: Number, required: true }, // e.g., Director=1, CEO=2, etc.
    name: String,
});

module.exports = mongoose.model("Designation", DesignationSchema);
