const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: String, // text/emoji
  attachments: [
    {
      url: String,
      type: { type: String } // 'image' | 'video' | 'document'
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
