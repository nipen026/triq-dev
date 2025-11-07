const mongoose = require("mongoose");

const soundSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        soundName: {
            type: String,
            required: true,
            unique: true,
        },
        androidSound: {
            type: String,
            required: true, // e.g. chat_sound.mp3
        },
        iosSound: {
            type: String,
            required: true, // e.g. chat_sound.aiff
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("Sound", soundSchema);
