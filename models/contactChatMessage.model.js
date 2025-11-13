// // models/contactChatMessage.model.js
// const mongoose = require("mongoose");

// const ContactChatMessageSchema = new mongoose.Schema(
//   {
//     chatRoom: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "ContactChatRoom",
//       required: true,
//     },
//     sender: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     receiver: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     message: { type: String, required: true },
//     attachments: [
//       {
//         url: String,
//         type: { type: String } // 'image' | 'video' | 'document'
//       }
//     ],
//     readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]

//   },

//   { timestamps: true }
// );

// module.exports = mongoose.model("ContactChatMessage", ContactChatMessageSchema);
const mongoose = require("mongoose");

const ContactChatMessageSchema = new mongoose.Schema({
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: "ContactChatRoom", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: String, // text/emoji
  translatedContent: String, // text/emoji
  attachments: [
    {
      url: String,
      type: { type: String } // 'image' | 'video' | 'document'
    }
  ],
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]

}, { timestamps: true });

module.exports = mongoose.model("ContactChatMessage", ContactChatMessageSchema);
