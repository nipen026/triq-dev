const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    title: String,
    body: String,
    type: { type: String, default: "request" },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    isRead: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    data: Object,
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
