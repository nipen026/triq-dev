const mongoose = require("mongoose");

const soundSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        soundName: String,
        type: {type :String, enum: ["chat","voice_call","video_call","ticket_notification","alert"],},
        channelId:String,
    },
    { timestamps: true }
);

module.exports = mongoose.model("Sound", soundSchema);
