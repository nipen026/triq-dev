// models/contactChatRoom.model.js
const mongoose = require("mongoose");

const ContactChatRoomSchema = new mongoose.Schema(
  {
    employee_sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    employee_receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    lastMessageBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactChatRoom", ContactChatRoomSchema);
