const { default: mongoose } = require("mongoose");

const groupChatMessageSchema = new mongoose.Schema({

   room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroupChat"
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  content: String,

  translatedContent: String,

  attachments: [{
    url: String,
    type: String
  }],

  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GroupChatMessage"
  },

  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    emoji: String
  }],

  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  }],

  seenBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    time: Date
  }]

}, { timestamps: true });

module.exports = mongoose.model("GroupChatMessage", groupChatMessageSchema);