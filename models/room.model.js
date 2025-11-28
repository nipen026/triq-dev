const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
  {
    roomName: { type: String, required: true },
    createdBy: { type: String },
    isActive: { type: Boolean, default: true },
    token:{type:String,required:true}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", RoomSchema);
