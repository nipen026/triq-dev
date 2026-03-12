const GroupChat = require("../models/groupChat.model");
const mongoose = require("mongoose");
const Message = require("../models/message.model");

exports.createGroupChat = async (req, res) => {
  try {

    const user = req.user; // logged user
    const { members, ticket, organisation } = req.body;

    if (!members || members.length === 0) {
      return res.status(400).json({
        message: "Members are required"
      });
    }

    // ensure valid ObjectIds
    const validMembers = members.filter(id =>
      mongoose.Types.ObjectId.isValid(id)
    );

    const allMembers = [...new Set([...validMembers, user.id])];

    const chatRoom = await GroupChat.create({
      ticket: ticket || null,
      members: allMembers,
      createdBy: user.id,
      organisation: organisation || null
    });

    res.status(201).json({
      message: "Group chat created successfully",
      chatRoom
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUserChatRooms = async (req, res) => {

  try {

    const userId = req.user.id;

    const rooms = await GroupChat.find({
      members: userId
    })
      .populate("members", "fullName email")
      .populate("createdBy", "fullName")
      .populate("ticket", "ticketNumber status")
      .sort({ updatedAt: -1 });

    const chatList = [];

    for (const room of rooms) {

      const lastMessage = await Message.findOne({ room: room._id })
        .sort({ createdAt: -1 });

      const unreadCount = await Message.countDocuments({
        room: room._id,
        sender: { $ne: userId },
        readBy: { $ne: userId }
      });

      chatList.push({
        room,
        lastMessage,
        unreadCount
      });

    }

    res.json({
      message: "Chat rooms fetched",
      chats: chatList
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }

};