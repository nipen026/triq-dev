const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
    type: { type: String, enum: ["audio", "video", "image"], required: true },
    url: { type: String, required: true }
});

const fieldworkSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: String,
    time: String,
    day: String,
    location: String,
    notes: String,
    ccMembers: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Employee"
        }
    ],

    attachments: [attachmentSchema],

}, { timestamps: true });

module.exports = mongoose.model("Fieldwork", fieldworkSchema);
