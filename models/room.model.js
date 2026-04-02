const mongoose = require("mongoose");

const RoomSchema = new mongoose.Schema(
  {
    roomName: { type: String, required: true },
    createdBy: { type: String },
    users: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
    token:{type:String,required:true},
    eventType:{type:String,required:true},
      isGroupCall:{type:Boolean,default:false}
  },
  { timestamps: true }
);

module.exports = mongoose.model("Room", RoomSchema);
