const mongoose = require("mongoose");

const DepartmentSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: String,
    icon: String,
});

module.exports = mongoose.model("Department", DepartmentSchema);
