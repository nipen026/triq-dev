const mongoose = require("mongoose");

const chatRoomSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket",
    required: true
  },
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true // organisation user
  },
  processor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true // processor user
  }
}, { timestamps: true });

module.exports = mongoose.model("ChatRoom", chatRoomSchema);
