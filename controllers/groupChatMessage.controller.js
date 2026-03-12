const GroupChat = require("../models/groupChat.model");
const GroupChatMessage = require("../models/groupChatMessage.model");

exports.sendMessage = async (req, res) => {
  try {

    const userId = req.user.id;
    const { roomId, content, attachments, replyTo } = req.body;

    const room = await GroupChat.findById(roomId);

    if (!room) {
      return res.status(404).json({ message: "Chat room not found" });
    }

    // check membership
    if (!room.members.includes(userId)) {
      return res.status(403).json({ message: "Not a member of this chat" });
    }

    const message = await GroupChatMessage.create({
      room: roomId,
      sender: userId,
      content,
      attachments,
      replyTo: replyTo || null,
      readBy: [userId]
    });

    res.status(201).json({
      message: "Message sent",
      data: message
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.getMessages = async (req, res) => {

  try {

    const { roomId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const messages = await GroupChatMessage.find({ room: roomId })
      .populate("sender", "fullName")
      .populate("replyTo")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      page,
      messages: messages.reverse()
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};

exports.markAsRead = async (req, res) => {

  try {

    const userId = req.user.id;
    const { roomId } = req.body;

    await GroupChatMessage.updateMany(
      {
        room: roomId,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      },
      {
        $push: { readBy: userId }
      }
    );

    res.json({ message: "Messages marked as read" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};

exports.reactMessage = async (req, res) => {

  try {

    const userId = req.user.id;
    const { messageId, emoji } = req.body;

    const message = await GroupChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // remove existing reaction
    message.reactions = message.reactions.filter(
      r => r.user.toString() !== userId
    );

    message.reactions.push({
      user: userId,
      emoji
    });

    await message.save();

    res.json({
      message: "Reaction updated",
      reactions: message.reactions
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};

exports.deleteMessage = async (req, res) => {

  try {

    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await GroupChatMessage.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender.toString() !== userId) {
      return res.status(403).json({ message: "You can delete only your messages" });
    }

    await message.deleteOne();

    res.json({ message: "Message deleted" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};

exports.markSeen = async (req, res) => {

  try {

    const userId = req.user.id;
    const { messageId } = req.body;

    await GroupChatMessage.updateOne(
      { _id: messageId },
      {
        $push: {
          seenBy: {
            user: userId,
            time: new Date()
          }
        }
      }
    );

    res.json({ message: "Message seen updated" });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};