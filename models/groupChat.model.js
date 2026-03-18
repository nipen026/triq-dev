const mongoose = require("mongoose");

const GroupChatSchema = new mongoose.Schema({
  ticket: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Ticket"
  },

  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  groupName: {
    type: String,
    required: true
  },
  organisation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }

}, { timestamps: true });

module.exports = mongoose.model("GroupChat", GroupChatSchema);