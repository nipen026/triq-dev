const mongoose = require("mongoose");
const reactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  emoji: String
}, { _id: false });
const messageSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: String, // text/emoji
  translatedContent: String, // text/emoji
  attachments: [
    {
      url: String,
      type: { type: String } // 'image' | 'video' | 'document'
    }
  ],
  reactions: [reactionSchema],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Message",
    default: null
  },
  edited: { type: Boolean, default: false },   // ⭐
  isDeleted: { type: Boolean, default: false }, // ⭐
  deletedAt: Date,
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]

}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);


